"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const debug_1 = __importDefault(require("debug"));
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const errors_1 = require("./errors");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allSettled = require('promise.allsettled');
const debug = debug_1.default('actional:client');
const BuiltInClientEvents = [
    'connect',
    'disconnect',
    'error',
    'connect_timeout',
    'reconnect',
    'reconnect_attempt',
    'reconnecting',
    'reconnect_error',
    'reconnect_failed'
];
class ActionalClient extends eventemitter3_1.default {
    constructor(url, actionalOptions = {}, options) {
        super();
        // Move conditionals
        const conditionals = actionalOptions.conditionals;
        delete actionalOptions.conditionals;
        // Format rooms properly
        if (Array.isArray(actionalOptions.rooms))
            actionalOptions.rooms.join();
        // Default query
        // @ts-ignore
        if (!options)
            options = {};
        if (options.query)
            Object.assign(options.query, actionalOptions);
        else
            options.query = actionalOptions;
        // Prioritize websockets
        Object.assign(options, { transports: ['websocket', 'polling'] });
        this.socket = socket_io_client_1.default.io(url, options);
        this.manager = this.socket.io;
        this.conditionals = conditionals || {};
        this._hookEvents();
    }
    _hookEvents() {
        this.socket.on('actional_condition', async (conditions, callback) => {
            debug('sending conditions', conditions.map((c) => c[0]));
            const results = {};
            await allSettled(conditions.map(async ([condition, ...args]) => {
                const conditional = this.conditionals[condition];
                // Static conditions & undefined conditions
                if (!conditional)
                    return (results[condition] = false);
                else if (typeof conditional === 'function') {
                    // Handle functions and promises
                    let result = conditional(...args);
                    if (result instanceof Promise)
                        result = await result;
                    results[condition] = !!result;
                }
                else
                    results[condition] = !!conditional;
            }));
            // Assume any failed promises or unhandled conditionals are false
            conditions.map(([condition]) => {
                if (results[condition] === undefined)
                    results[condition] = false;
            });
            callback({
                ok: true,
                conditions: results
            });
        });
    }
    async _sendAndRecieve(eventName, ...args) {
        const response = (await utils_1.sendAndRecieve({ socket: this.socket }, eventName, ...args));
        const result = response[0];
        if (result.ok)
            return result;
        else
            throw new errors_1.ResponseError(result);
    }
    async findClients({ namespace = '/', rooms = [] }, conditions) {
        return this._sendAndRecieve('actional_findClients', {
            namespace,
            rooms,
            conditions
        });
    }
    async sendToClient(clientId, eventName, ...args) {
        return this._sendAndRecieve('actional_sendToClient', clientId, eventName, args);
    }
    defineEvent(eventName, 
    // eslint-disable-next-line no-unused-vars
    func) {
        if (BuiltInClientEvents.includes(eventName))
            throw new errors_1.ActionalError("You can't define a built-in event!", 'defineEvent');
        else if (eventName.startsWith('actional_'))
            throw new errors_1.ActionalError("You can't define an actional event!", 'defineEvent');
        debug('defining event "%s"', eventName);
        this.socket.on(eventName, async (...args) => {
            const callback = args.pop();
            try {
                let result = func(...args);
                if (result instanceof Promise)
                    result = await result;
                let callbackData = {
                    ok: true,
                    result
                };
                if (typeof result === 'object')
                    callbackData = { ...result, ...callbackData };
                else
                    callbackData.result = result;
                callback(callbackData);
            }
            catch (err) {
                callback({
                    ok: false,
                    code: constants_1.ResponseCode.ClientError,
                    error: err.toString()
                });
            }
        });
        return this;
    }
}
exports.default = ActionalClient;
