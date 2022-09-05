import * as bodyParser from 'body-parser';
import * as http from 'http';
import path from 'path';
import express, { Express, NextFunction } from 'express';
import { Request, Response } from 'express-serve-static-core';

import { Config } from './config';
import { Tahoma } from './tahoma';
import { TahomaAction, TahomaActionGroup, TahomaCommand, TahomaDevice, TahomaGateway } from './interfaces/tahoma';
import { AxiosResponse } from 'axios';
import { connect, MqttClient, QoS } from 'mqtt';

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
            res.status(500).send({ error: err });
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

        router.get('/execute/:identifier/:command?/:parameters?', (req: Request, res: Response, next: NextFunction) => {
            const identifier = req.params.identifier.toLowerCase();
            
            if (req.params.command) {
                // execute device action
                const device = this.tahomaDevices.find((device) => {
                    const id = device.oid?.toLowerCase();
                    const label = device.label.toLowerCase();

                    return (identifier === id || identifier === label);
                });

                if (!device?.deviceURL) {
                    throw new Error('Device not found');
                }

                if (!device?.available || !device?.enabled) {
                    throw new Error('Device currently not available or enabled');
                }

                const command: TahomaCommand = {
                    name: req.params.command,
                    parameters: req.params.parameters ? req.params.parameters.split(':') : []
                };

                res.json(this.tahoma.executeDeviceAction(device, command));
            } else {
                // execute scenario
                const group = this.tahomaActionGroups.find((group) => {
                    const id = group.oid?.toLowerCase();
                    const label = group.label.toLowerCase();
                    
                    return (identifier === id || identifier === label);
                });

                if (!group?.oid) {
                    throw new Error('Scenario not found');
                }

                res.json(this.tahoma.executeScenario(group.oid));
            }
        });

        return router;
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