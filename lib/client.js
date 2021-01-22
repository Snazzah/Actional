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
        const conditionals = actionalOptions.conditionals;
        delete actionalOptions.conditionals;
        if (Array.isArray(actionalOptions.rooms))
            actionalOptions.rooms.join();
        if (!options)
            options = {};
        if (options.query)
            Object.assign(options.query, actionalOptions);
        else
            options.query = actionalOptions;
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
                if (!conditional)
                    return (results[condition] = false);
                else if (typeof conditional === 'function') {
                    let result = conditional(...args);
                    if (result instanceof Promise)
                        result = await result;
                    results[condition] = !!result;
                }
                else
                    results[condition] = !!conditional;
            }));
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
    defineEvent(eventName, func) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHdFQUE4QztBQUM5QyxrRUFBeUM7QUFDekMsa0RBQWdDO0FBQ2hDLDJDQVNxQjtBQUNyQixtQ0FBeUM7QUFDekMscUNBQXdEO0FBRXhELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sS0FBSyxHQUFHLGVBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBYTdDLE1BQU0sbUJBQW1CLEdBQUc7SUFDMUIsU0FBUztJQUNULFlBQVk7SUFDWixPQUFPO0lBQ1AsaUJBQWlCO0lBQ2pCLFdBQVc7SUFDWCxtQkFBbUI7SUFDbkIsY0FBYztJQUNkLGlCQUFpQjtJQUNqQixrQkFBa0I7Q0FDbkIsQ0FBQztBQUVGLE1BQU0sY0FBZSxTQUFRLHVCQUFZO0lBS3ZDLFlBQVksR0FBVyxFQUFFLGtCQUF5QyxFQUFFLEVBQUUsT0FBdUM7UUFDM0csS0FBSyxFQUFFLENBQUM7UUFFUixNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsWUFBWSxDQUFDO1FBQ2xELE9BQU8sZUFBZSxDQUFDLFlBQVksQ0FBQztRQUdwQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztZQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFJdkUsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQzNCLElBQUksT0FBTyxDQUFDLEtBQUs7WUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7O1lBQzVELE9BQU8sQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDO1FBR3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsV0FBVyxF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