import * as bodyParser from 'body-parser';
import * as http from 'http';
import express, { Express } from 'express';
import { Request, Response } from 'express-serve-static-core';

import { Config } from './config';

export class Server {
    public app: Express;
    public server: http.Server;

    private readonly config: Config;

    constructor(config: Config, callback?: () => any) {
        this.config = config;

        this.app = express();
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.routes();
        
        this.server = this.app.listen(this.config.serverPort, () => {
            console.log(`Tahoma API listening on port ${this.config.serverPort}`);
        });
    }

    routes() {
        const router = express.Router();

        router.get('/', (req: Request, res: Response) => {
            res.send('Hello World!')
        })

        this.app.use(router);
    }
}