import * as bodyParser from 'body-parser';
import * as http from 'http';
import path from 'path';
import express, { Express } from 'express';
import { Request, Response } from 'express-serve-static-core';

import { Config } from './config';
import { Tahoma } from './tahoma';
import { TahomaAction, TahomaActionGroup, TahomaDevice, TahomaGateway } from './interfaces/tahoma';
import { AxiosResponse } from 'axios';
import { connect, MqttClient, QoS } from 'mqtt';

export class Server {
    private readonly config: Config;

    public app: Express;
    public server: http.Server;
    public mqtt: MqttClient;

    public tahoma: Tahoma;
    public tahomaGateway: TahomaGateway|null = null;
    public tahomaDevices: Array<TahomaDevice> = [];
    public tahomaActionGroups: Array<TahomaActionGroup> = [];

    constructor(config: Config, callback?: () => any) {
        this.config = config;
        this.tahoma = new Tahoma(this.config.tahoma.username, this.config.tahoma.password);

        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.routes();

        this.server = this.app.listen(this.config.server.port, () => {
            console.info(`Tahoma API listening on port ${this.config.server.port}`);

            this.init();     
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

    private init() {
        this.tahoma.getSetup()
            .then((response: AxiosResponse) => {
                this.tahomaGateway = response.data.gateway;
                this.tahomaDevices = response.data.devices;
                console.log(this.tahomaDevices);
            })
            .catch(error => {
                console.error(error.message, error.stack);
            });

        this.tahoma.getActionGroups()
            .then((response: AxiosResponse) => {
                this.tahomaActionGroups = response.data;
                console.log(this.tahomaActionGroups);
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
            // TODO: get an overview of devices, scenario's, ...
            res.send('TODO: overview');
        });

        router.get('/execute/:name/:action?', (req: Request, res: Response) => {
            const name = req.params.name;
            
            if (req.params.action) {
                // execute device action
                const deviceUrl = 'TODO';
                const action: TahomaAction = {
                    name: req.params.action
                };

                res.json(this.tahoma.executeDeviceAction(name, deviceUrl, action));
            } else {
                // execute scenario
                const scenarioId = 'TODO';

                res.json(this.tahoma.executeScenario(scenarioId));
            }
        });

        this.app.use(router);
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

    public publish(subtopic: string, payload: any, retain: boolean = false, qos: QoS = 0) {
        const topic = `${ this.config.mqtt.topic }/${ subtopic }`;
        const options = {
            retain: retain,
            qos: qos
        };

        this.mqtt.publish(topic, payload, options);
    }
}