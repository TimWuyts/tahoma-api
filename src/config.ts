import path from 'path';
import { readFileSync } from 'fs';

import { log } from './app';
import { TahomaAccount } from './interfaces/tahoma';

export class Config {
    private commandArguments: any;
    private fileConfig: any;

    public tahoma: TahomaAccount;
    public server: any;
    public mqtt: any;

    constructor(args: any) {
        // get command-line configuration
        this.commandArguments = args;
        
        // get file-based configuration
        this.fileConfig = JSON.parse(readFileSync(path.resolve(__dirname, this.commandArguments.config), 'utf-8'));
        
        // set configuration values
        this.server = this.fileConfig.server;
        this.tahoma = this.fileConfig.tahoma;
        this.mqtt = this.fileConfig.mqtt;

        // override server port number when defined as command-line argument
        if (this.commandArguments.port) {
            this.server.port = this.commandArguments.port;
        }

        // define logger verbosity level based upon command-line argument/file config
        log.setSettings({
            minLevel: (this.commandArguments.verbose || this.fileConfig.log || 'info')
        });
    }
}

