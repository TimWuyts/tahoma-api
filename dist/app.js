"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const server_1 = require("./server");
const config_1 = require("./config");
const args = yargs_1.default.options({
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
new server_1.Server(new config_1.Config(args));
//# sourceMappingURL=app.js.map