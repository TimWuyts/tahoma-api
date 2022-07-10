import * as bodyParser from 'body-parser';
import * as http from 'http';
import path from 'path';
import express, { Express } from 'express';
import { Request, Response } from 'express-serve-static-core';

import { Config } from './config';
import { Tahoma } from './tahoma';
import { TahomaAction, TahomaActionGroup, TahomaDevice, TahomaGateway } from './interfaces/tahoma';
import { AxiosResponse } from 'axios';

export class Server {
    public app: Express;
    public server: http.Server;

    public tahoma: Tahoma;
    public tahomaGateway: TahomaGateway|null = null;
    public tahomaDevices: Array<TahomaDevice> = [];
    public tahomaActionGroups: Array<TahomaActionGroup> = [];

    private readonly config: Config;

    constructor(config: Config, callback?: () => any) {
        this.config = config;

        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.routes();

        this.server = this.app.listen(this.config.serverPort, () => {
            if (this.config.log) console.log(`Tahoma API listening on port ${this.config.serverPort}`);
        });

        this.tahoma = new Tahoma(this.config.tahoma.username, this.config.tahoma.password, this.config.log);
        
        this.tahoma.getSetup()
            .then((response: AxiosResponse) => {
                this.tahomaGateway = response.data.gateway;
                this.tahomaDevices = response.data.devices;
                console.log(this.tahomaDevices);
            })
            .catch(error => {
                console.log(error.message, error.stack);
            });

        this.tahoma.getActionGroups()
            .then((response: AxiosResponse) => {
                this.tahomaActionGroups = response.data;
                console.log(this.tahomaActionGroups);
            })
            .catch(error => {
                console.log(error.message, error.stack);
            });
    }

    routes() {
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
}