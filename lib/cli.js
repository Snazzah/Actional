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
const server_1 = __importDefault(require("./server"));
const actionalConfig = argv;
const socketIoConfig = ((argv) => {
    const newArgv = Object.assign({}, argv);
    delete newArgv.ackTimeout;
    newArgv.transports = argv.transport == 'both' ? ['websocket', 'polling'] : argv.transport;
    return newArgv;
})(argv);
const server = new server_1.default(actionalConfig, socketIoConfig);
if (argv.namespaces && argv.namespaces.length)
    argv.namespaces.map((nsp) => server.of(nsp.toString()));
server.listen(argv.port);
debug('Started listening on port', argv.port, ...[argv.password ? 'with password' : 0, argv.debug ? 'in debug' : 0].filter((v) => v !== 0));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSwrQkFBZ0M7QUFDaEMsNENBQW9CO0FBQ3BCLHNEQUE2QjtBQUU3QixrREFBZ0M7QUFDaEMsd0RBQWdDO0FBRWhDLE1BQU0sS0FBSyxHQUFHLGVBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUUxQyxNQUFNLFVBQVUsR0FBRyxpQkFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFakYsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxLQUFLLFNBQVM7SUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFFckgsTUFBTSxJQUFJLEdBQUcsS0FBSztLQUNmLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztLQUM3QixNQUFNLENBQUMsTUFBTSxDQUFDO0tBQ2QsTUFBTSxFQUFFO0tBQ1IsT0FBTyxDQUFDO0lBQ1AsTUFBTSxFQUFFO1FBQ04sUUFBUSxFQUFFLDJGQUEyRjtRQUNyRyxLQUFLLEVBQUUsR0FBRztLQUNYO0lBQ0QsS0FBSyxFQUFFO1FBQ0wsSUFBSSxFQUFFLFNBQVM7UUFDZixRQUFRLEVBQUUsbUJBQW1CO1FBQzdCLEtBQUssRUFBRSxHQUFHO1FBQ1YsT0FBTyxFQUFFLEtBQUs7S0FDZjtJQUNELElBQUksRUFBRTtRQUNKLElBQUksRUFBRSxRQUFRO1FBQ2QsUUFBUSxFQUFFLCtCQUErQjtRQUN6QyxLQUFLLEVBQUUsR0FBRztRQUNWLE9BQU8sRUFBRSxJQUFJO0tBQ2Q7SUFDRCxRQUFRLEVB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