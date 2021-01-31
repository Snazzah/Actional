#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const fs_1 = __importDefault(require("fs"));
const find_up_1 = __importDefault(require("find-up"));
const debug_1 = __importDefault(require("debug"));
const version_1 = __importDefault(require("./version"));
const debug = debug_1.default('actional:cli');
const configPath = find_up_1.default.sync('.actional.json');
const config = configPath ? JSON.parse(fs_1.default.readFileSync(configPath, 'utf8')) : {};
if (config.config !== undefined || config.c !== undefined)
    throw new Error("You can't define a config in a config!");
const argv = yargs
    .scriptName('actional-server')
    .config(config)
    .config()
    .options({
    config: {
        describe: 'the JSON file that fills in CLI arguments for you (defaults to ".actional.json" if found)',
        alias: 'c'
    },
    debug: {
        type: 'boolean',
        describe: 'output debug logs',
        alias: 'd',
        default: false
    },
    port: {
        type: 'number',
        describe: 'the port to host socket.io on',
        alias: 'p',
        default: 3000
    },
    password: {
        type: 'string',
        describe: 'the password to set the server to',
        alias: 'P'
    },
    transport: {
        describe: 'the type of transport to use',
        choices: ['polling', 'websocket', 'both'],
        alias: 't',
        default: 'both'
    },
    ackTimeout: {
        describe: 'timeout for packet acks/responses (in ms)',
        type: 'number',
        alias: ['at', 'T'],
        default: 5000
    },
    serveClient: {
        type: 'boolean',
        describe: 'serve client files over server?',
        alias: 'C',
        default: true
    },
    origins: {
        type: 'string',
        describe: 'allowed origins',
        alias: 'o',
        default: '*:*'
    },
    namespaces: {
        type: 'array',
        describe: 'namespaces to create',
        alias: ['nsp', 'namespace', 'n']
    },
    pingTimeout: {
        type: 'number',
        describe: 'how many ms without a pong packet to consider the connection closed',
        alias: 'pt',
        default: 5000
    },
    pingInterval: {
        type: 'number',
        describe: 'how many ms before sending a new ping packet',
        alias: 'pi',
        default: 25000
    },
    upgradeTimeout: {
        type: 'number',
        describe: 'how many ms before an uncompleted transport upgrade is cancelled',
        alias: 'ut',
        default: 10000
    },
    path: {
        type: 'string',
        describe: 'name of the path to capture',
        default: '/socket.io'
    }
})
    .command('$0', 'Runs an actional server.').argv;
debug_1.default.enable(argv.debug ? '*' : 'actional:*');
console.log('Running actional v%s', version_1.default);
// This is defined afterwards to debug picks up the variable
const server_1 = __importDefault(require("./server"));
const actionalConfig = argv;
// @ts-ignore
const socketIoConfig = ((argv) => {
    const newArgv = Object.assign({}, argv);
    // @ts-ignore
    delete newArgv.ackTimeout;
    newArgv.transports = argv.transport == 'both' ? ['websocket', 'polling'] : argv.transport;
    return newArgv;
})(argv);
const server = new server_1.default(actionalConfig, socketIoConfig);
if (argv.namespaces && argv.namespaces.length)
    argv.namespaces.map((nsp) => server.of(nsp.toString()));
server.listen(argv.port);
debug('Started listening on port', argv.port, ...[argv.password ? 'with password' : 0, argv.debug ? 'in debug' : 0].filter((v) => v !== 0));
