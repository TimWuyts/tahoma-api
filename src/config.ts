import path from 'path';
import { readFileSync } from 'fs';

import { log } from './app';
import { TahomaAccount } from './interfaces/tahoma';

export class Config {
    private commandArguments: any;
    private fileConfig: any;

    public serverPort: number;
    public tahoma: TahomaAccount;

    constructor(args: any) {
        // get command-line configuration
        this.commandArguments = args;
        
        // get file-based configuration
        this.fileConfig = JSON.parse(readFileSync(path.resolve(__dirname, this.commandArguments.config), 'utf-8'));
        
        // set configuration values
        this.serverPort = this.commandArguments.port || this.fileConfig.serverPort || 3000;
        this.tahoma = this.fileConfig.tahoma;

        // init logger
        log.setSettings({
            minLevel: (this.commandArguments.verbose || this.fileConfig.log || 'info')
        });
    }
}

