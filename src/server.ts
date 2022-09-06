import * as bodyParser from 'body-parser';
import * as http from 'http';
import path from 'path';
import express, { Express, NextFunction } from 'express';
import { camelCase } from 'lodash';
import { AxiosResponse } from 'axios';
import { connect, MqttClient, QoS } from 'mqtt';
import { Request, Response } from 'express-serve-static-core';

import { HttpResponse } from './enums/http-response';
import { Config } from './config';
import { Tahoma } from './tahoma';
import { TahomaActionGroup, TahomaCommand, TahomaDevice, TahomaGateway } from './interfaces/tahoma';

export class Server {
    private readonly config: Config;

    public app: Express;
    public server: http.Server;
    public mqtt: MqttClient;

    public tahoma: Tahoma;
    public tahomaGateways: Array<TahomaGateway> = [];
    public tahomaDevices: Array<TahomaDevice> = [];
    public tahomaActionGroups: Array<TahomaActionGroup> = [];

    constructor(config: Config, callback?: () => any) {
        this.config = config;
        this.tahoma = new Tahoma(this.config.tahoma.username, this.config.tahoma.password);

        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(this.routes());
        this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            res.status(HttpResponse.SERVER_ERROR).send({ error: err });
        });

        this.server = this.app.listen(this.config.server.port, () => {
            console.info(`Tahoma API listening on http://localhost:${this.config.server.port}`);

            this.initState();
            setInterval(() => this.refreshState(), this.config.server.refresh * 1000);
        });

        this.mqtt = connect(this.config.mqtt.url, {
            username: this.config.mqtt.username,
            password: this.config.mqtt.password,
            will: {
                topic: `${ this.config.mqtt.topic }/connected`,
                payload: '0',
                qos: 0,
                retain: true
            },
            rejectUnauthorized: this.config.mqtt.secure
        });

        this.listeners();
    }

    private initState() {
        this.getSetup();
        this.getGroups();
    }

    private refreshState() {
        console.info(`Refreshed state for gateway and devices`);
    
        this.getSetup();
    }

    private getSetup(): Promise<any> {
        return this.tahoma.getSetup()
            .then((response: AxiosResponse) => {
                this.tahomaGateways = response.data.gateways;
                this.publish('gateways', this.tahomaGateways, true);

                this.tahomaDevices = response.data.devices;
                this.publish('devices', this.tahomaDevices, false);
            })
            .catch(error => {
                console.error(error.message, error.stack);
            });
    }

    private getGroups(): Promise<any> {
        return this.tahoma.getActionGroups()
            .then((response: AxiosResponse) => {
                this.tahomaActionGroups = response.data;
                this.publish('actionGroups', this.tahomaActionGroups, true);
            })
            .catch(error => {
                console.error(error.message, error.stack);
            });
    }

    private routes() {
        const router = express.Router();

        router.get('/', (req: Request, res: Response) => {
            res.sendFile(path.join(__dirname, '../static/index.html'));
        });

        router.get('/overview', (req: Request, res: Response) => {
            this.getSetup().then(() => {
                const combined = {
                    gateways: this.tahomaGateways,
                    devices: this.tahomaDevices,
                    groups: this.tahomaActionGroups
                };
    
                res.json(combined);
            });
        });

        router.get('/device/:identifier', (req: Request, res: Response) => {
            const device = this.lookup(this.tahomaDevices, req.params.identifier);
        
            if (!device) {
                throw new Error('Device not found');
            }

            res.json(device);
        });

        router.get('/group/:identifier', (req: Request, res: Response) => {
            const group = this.lookup(this.tahomaActionGroups, req.params.identifier);

            if (!group) {
                throw new Error('Group not found');
            }

            res.json(group);
        });

        router.get('/execute/:identifier/:command?/:parameters?', (req: Request, res: Response) => {
            if (req.params.command) {
                // execute device action
                const device = this.lookup(this.tahomaDevices, req.params.identifier);

                if (!device?.deviceURL) {
                    throw new Error('Device not found');
                }

                if (!device?.available || !device?.enabled) {
                    throw new Error('Device currently not available or enabled');
                }

                let commandName = camelCase(req.params.command);
                let commandParams = (req.params.parameters ? req.params.parameters.split(':') : [])
                    .map((item) => {
                        const number = parseInt(item);
                        return (isNaN(number) ? item : number)
                    });

                const command: TahomaCommand = {
                    name: commandName,
                    parameters: commandParams
                };

                res.json(this.tahoma.executeDeviceAction(device, command));
            } else {
                // execute scenario
                const group = this.lookup(this.tahomaActionGroups, req.params.identifier);

                if (!group?.oid) {
                    throw new Error('Scenario not found');
                }

                res.json(this.tahoma.executeScenario(group.oid));
            }
        });

        return router;
    }

    private lookup(items: Array<any>, key: string): any {
        const identifier = key.replace(/ /g, '-').toLowerCase();
        
        return items.find((item) => {
            const id = item.oid?.toLowerCase();
            const label = item.label.replace(/ /g, '-').toLowerCase();
            
            return (identifier === id || identifier === label);
        });
    }

    private listeners() {
        this.mqtt.on('connect', () => {
            this.publish('connected', '2', true);

            console.info(`MQTT client connected to ${this.config.mqtt.url}`);
        });

        this.mqtt.on('close', () => {
            console.warn(`MQTT client disconnected`);
        });

        this.mqtt.on('error', (error) => {
            console.error(`MQTT error: ${error.message}`);
        });
    }

    public publish(subtopic: string, payload: any, retain: boolean = false, payloadKey: string = 'oid', qos: QoS = 0) {
        const topic = `${ this.config.mqtt.topic }/${ subtopic }`;
        const options = {
            retain: retain,
            qos: qos
        };

        if (Array.isArray(payload)) {
            payload.forEach((payloadItem, index) => {
                const payloadIdentifier = payloadItem[payloadKey] || index;
                this.mqtt.publish(`${topic}/${payloadIdentifier}`, JSON.stringify(payloadItem), options);
            });
        } else {
            this.mqtt.publish(topic, JSON.stringify(payload), options);
        }
    }
}