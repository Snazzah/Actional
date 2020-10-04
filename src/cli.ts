#!/usr/bin/env node
import yargs = require('yargs');
import fs from 'fs';
import findUp from 'find-up';
import { ActionalServerOptions } from './server';
import debugModule from 'debug';
const debug = debugModule('actional:cli');

const configPath = findUp.sync('.actional.json');
const config = configPath ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

if (config.config !== undefined || config.c !== undefined)
  throw new Error('You can\'t define a config in a config!');

const argv = yargs
  .scriptName('actional-server')
  .config(config).config()
  .options({
    config: {
      describe: 'the JSON file that fills in CLI arguments for you (defaults to ".actional.json" if found)',
      alias: 'c',
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
    },
  }).command('$0', 'Runs an actional server.')
  .argv;

debugModule.enable(argv.debug ? '*' : 'actional:*');

// This is defined afterwards to debug picks up the variable
import Server from './server';

const actionalConfig: ActionalServerOptions = argv;

const socketIoConfig: SocketIO.ServerOptions = ((argv) => {
  const newArgv = Object.assign({}, argv);
  delete newArgv.ackTimeout;
  newArgv.transports = argv.transport == 'both' ? ['websocket', 'polling'] : argv.transport;
  return newArgv;
})(argv);

const server = new Server(actionalConfig, socketIoConfig);

if (argv.namespaces && argv.namespaces.length)
  argv.namespaces.map(nsp => server.of(nsp.toString()));

server.listen(argv.port);
debug('Started listening on port', argv.port, ...[
  argv.password ? 'with password' : 0,
  argv.debug ? 'in debug' : 0
].filter(v => v !== 0));