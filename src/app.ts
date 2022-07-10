import yargs from 'yargs';
import { Logger } from 'tslog';

import { Server } from './server';
import { Config } from './config';

export const log = new Logger({ name: 'console', overwriteConsole: true });
export const args = yargs.options({
    verbose: {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    },
    port: {
        alias: 'p',
        type: 'number',
        description: 'Server port number'
    },
    config: {
        alias: 'c',
        type: 'string',
        default: '../config.json',
        description: 'Path to config file'
    }
}).argv;

new Server(new Config(args));