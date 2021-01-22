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
        const thisClientId = socket.client.id;
        socket.once('disconnect', () => {
            this.emit('disconnected', socket.id, this.clients.get(thisClientId));
            this.clients.delete(socket.id);
            debug('socket disconnected %s', socket.id);
        });
        socket.on('actional_findClients', async (payload, callback) => {
            debug('%s requesting socket information', socket.id, payload);
            if (!this.server._nsps.has(payload.namespace || '/'))
                return callback({
                    ok: false,
                    code: constants_1.ResponseCode.NotFound,
                    error: 'Namespace does not exist'
                });
            const namespace = this.server.of(payload.namespace || '/');
            let clients = Object.keys(namespace.sockets)
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
        socket.on('actional_sendToClient', async (clientId, eventName, args = [], callback) => {
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
    }
    async emitToClients(sockets, eventName, ...data) {
        const results = await allSettled(sockets.map((socket) => utils_1.definePromise(utils_1.sendAndRecieve({ socket: socket.socket, timeout: this.config.ackTimeout }, eventName, ...data), {
            id: socket.socket.id,
            name: socket.name,
            priority: socket.priority
        })));
        return results.map((res) => res.value);
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDBEQUFnRDtBQUNoRCx1RUFBK0M7QUFDL0MsbUNBQTJFO0FBQzNFLDJDQU1xQjtBQUNyQixrRUFBeUM7QUFDekMsa0RBQWdDO0FBRWhDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ2pELE1BQU0sS0FBSyxHQUFHLGVBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBdUI3QyxNQUFNLGNBQWUsU0FBUSx1QkFBWTtJQUt2QyxZQUFZLGtCQUF5QyxFQUFFLEVBQUUsT0FBZ0M7UUFDdkYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNyRCxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQztRQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksb0JBQVUsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFFTywwQkFBMEI7UUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUF1QixFQUFFLEVBQUU7WUFDMUQsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2RCxNQUFNLEtBQUssR0FBUSxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztZQUcxQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFR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