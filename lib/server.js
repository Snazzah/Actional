"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = __importDefault(require("socket.io"));
const collection_1 = __importDefault(require("@discordjs/collection"));
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const debug_1 = __importDefault(require("debug"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allSettled = require('promise.allsettled');
const debug = debug_1.default('actional:server');
class ActionalServer extends eventemitter3_1.default {
    constructor(actionalOptions = {}, options) {
        Object.assign(actionalOptions, { ackTimeout: 5000 });
        super();
        this.server = new socket_io_1.default.Server(options);
        this.config = actionalOptions;
        this.clients = new collection_1.default();
        this._hookParentNamespaceEvents();
    }
    _hookParentNamespaceEvents() {
        this.server.on('connect', async (socket) => {
            debug('hooking parent namespace socket %s', socket.id);
            const query = socket.handshake.query;
            // Auth
            if (this.config.password && query.password !== this.config.password) {
                debug('socket %s failed auth', socket.id);
                return socket.disconnect();
            }
            if (query.rooms)
                await socket.join(query.rooms.split(','));
            const priority = query.priority ? parseInt(query.priority) : 0;
            const clientInfo = {
                socket,
                name: query.name || '<unknown>',
                priority: Number.isFinite(priority) ? priority : 0,
                rooms: query.rooms ? query.rooms.split(',') : []
            };
            this.clients.set(socket.id, clientInfo);
            this.emit('connected', socket.id, clientInfo);
            debug('socket connected %s (name=%s priority=%d rooms=%s)', socket.id, clientInfo.name, clientInfo.priority, query.rooms);
            this._hookSocketEvents(socket);
        });
    }
    _hookNamespaceEvents(namespace) {
        namespace.on('connect', async (socket) => {
            debug('hooking namespace socket %s', socket.id);
            const query = socket.handshake.query;
            // Auth
            if (this.config.password && query.password !== this.config.password) {
                debug('socket %s failed auth', socket.id);
                return socket.disconnect();
            }
            if (query.rooms)
                await socket.join(query.rooms.split(','));
            const priority = query.priority ? parseInt(query.priority) : 0;
            const clientInfo = {
                socket,
                name: query.name || '<unknown>',
                priority: Number.isFinite(priority) ? priority : 0,
                rooms: query.rooms ? query.rooms.split(',') : []
            };
            this.clients.set(socket.id, clientInfo);
            this.emit('connected', socket.id, clientInfo);
            this._hookSocketEvents(socket);
        });
    }
    _hookSocketEvents(socket) {
        // @ts-ignore
        const thisClientId = socket.client.id;
        socket.once('disconnect', () => {
            this.emit('disconnected', socket.id, this.clients.get(thisClientId));
            this.clients.delete(socket.id);
            debug('socket disconnected %s', socket.id);
        });
        // eslint-disable-next-line no-unused-vars
        socket.on('actional_findClients', async (payload, callback) => {
            debug('%s requesting socket information', socket.id, payload);
            if (!this.server._nsps.has(payload.namespace || '/'))
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.NotFound,
                    error: 'Namespace does not exist'
                });
            const namespace = this.server.of(payload.namespace || '/');
            let clients = Array.from(namespace.sockets.keys())
                .map((sId) => this.clients.get(sId.split('#').reverse()[0]))
                .sort((a, b) => a.priority - b.priority);
            if (payload.rooms && payload.rooms.length)
                payload.rooms.map((room) => {
                    const roomObj = namespace.adapter.rooms.get(room);
                    if (!roomObj)
                        return (clients = []);
                    clients = clients.filter((client) => roomObj.has(client.socket.id));
                });
            if (payload.conditions && payload.conditions.length) {
                // Ensure array
                payload.conditions = payload.conditions.map((condition) => {
                    if (typeof condition === 'string')
                        condition = [condition];
                    return condition;
                });
                const conditionResults = await this.emitToClients(clients, 'actional_condition', payload.conditions);
                clients = clients.filter((client) => {
                    const socketConditions = conditionResults.find((result) => result.info.id === client.socket.id);
                    if (!socketConditions || socketConditions.status === 'rejected')
                        return false;
                    return !Object.values(socketConditions.result[0].conditions).includes(false);
                });
            }
            callback({
                ok: true,
                clients: clients.map((s) => ({
                    id: s.socket.id,
                    name: s.name,
                    priority: s.priority,
                    rooms: s.rooms
                }))
            });
        });
        socket.on('actional_sendToClient', 
        // eslint-disable-next-line no-unused-vars
        async (clientId, eventName, args = [], callback) => {
            if (typeof clientId !== 'string' || typeof eventName !== 'string')
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.InvalidArguments,
                    error: 'Invalid arguments'
                });
            else if (!Array.isArray(args))
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.InvalidArguments,
                    error: 'Target arguments must be an array'
                });
            else if (eventName.startsWith('actional_'))
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.Forbidden,
                    error: 'You cannot emit server-only events'
                });
            const targetClient = this.clients.get(clientId);
            if (!targetClient)
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.NotFound,
                    error: 'Client not found'
                });
            debug('%s requesting to send data to client %s', socket.id, targetClient.socket.id, eventName, args);
            try {
                const result = (await utils_1.sendAndRecieve({
                    socket: targetClient.socket,
                    timeout: this.config.ackTimeout
                }, eventName, ...args))[0];
                if (!result.ok)
                    callback({
                        ok: true,
                        status: 'rejected',
                        reason: result.error
                    });
                else
                    callback({
                        ok: true,
                        status: 'fufilled',
                        result: result.result
                    });
            }
            catch (err) {
                callback({
                    ok: true,
                    status: 'rejected',
                    reason: err.toString()
                });
            }
        });
        // @TODO send to multiple sockets
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async emitToClients(sockets, eventName, ...data) {
        const results = await allSettled(sockets.map((socket) => utils_1.definePromise(utils_1.sendAndRecieve({ socket: socket.socket, timeout: this.config.ackTimeout }, eventName, ...data), {
            id: socket.socket.id,
            name: socket.name,
            priority: socket.priority
        })));
        return results.map((res) => res.value);
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    of(nsp) {
        const newNamespace = typeof nsp === 'string' && !this.server._nsps.has(nsp);
        const namespace = this.server.of(nsp);
        if (newNamespace) {
            debug('hooking new namespace %s', namespace.name);
            this._hookNamespaceEvents(namespace);
        }
        return namespace;
    }
    listen(port) {
        this.server.attach(port);
        return this;
    }
}
exports.default = ActionalServer;
