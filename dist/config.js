"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
class Config {
    constructor(args) {
        // get command-line configuration
        this.commandArguments = args;
        // get file-based configuration
        this.fileConfig = JSON.parse((0, fs_1.readFileSync)(path_1.default.resolve(__dirname, this.commandArguments.config), 'utf-8'));
        // set configuration values
        this.serverPort = this.commandArguments.port || this.fileConfig.serverPort || 3000;
        this.log = this.commandArguments.verbose || this.fileConfig.log || false;
    }
}
exports.Config = Config;
//# sourceMappingURL=config.js.map