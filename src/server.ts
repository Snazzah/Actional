import SocketIO, { Namespace } from 'socket.io';
import Collection from '@discordjs/collection';
import { definePromise, PromiseDefinition, sendAndRecieve } from './utils';
import { ActionalResponseError, ClientEventResponse, ConditionsResponse, FindSocketsPayload, ResponseCode } from './constants';
import EventEmitter from 'eventemitter3';
import debugModule from 'debug';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allSettled = require('promise.allsettled');
const debug = debugModule('actional:server');

export interface ActionalServerOptions {
  password?: string
  ackTimeout?: number
}

interface ClientInfo {
  socket: SocketIO.Socket
  priority: number
  name: string
  rooms: string[]
}

interface SocketDefinition {
  id: string
  priority: number
  name: string
}

class ActionalServer extends EventEmitter {
  public readonly server: SocketIO.Server;
  public readonly config: ActionalServerOptions;
  public clients: Collection<string, ClientInfo>;

  constructor(actionalOptions: ActionalServerOptions = {}, options: SocketIO.ServerOptions = {}) {
    Object.assign(actionalOptions, { ackTimeout: 5000 });
    super();
    this.server = new SocketIO(options);
    this.config = actionalOptions;
    this.clients = new Collection();
    this._hookParentNamespaceEvents();
  }

  private _hookParentNamespaceEvents(): void {
    this.server.on('connect', async (socket: SocketIO.Socket) => {
      const query = socket.handshake.query;

      // Auth
      if (this.config.password && query.password !== this.config.password) {
        debug('socket %s failed auth', socket.id);
        return socket.disconnect();
      }

      if (query.rooms)
        socket.join(query.rooms.split(','));

      const priority = query.priority ? parseInt(query.priority) : 0;
      const clientInfo: ClientInfo = {
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

  private _hookNamespaceEvents(namespace: Namespace): void {
    namespace.on('connect', async (socket: SocketIO.Socket) => {
      debug('hooking namespace socket %s', socket.id);
      this._hookSocketEvents(socket);
    });
  }

  private _hookSocketEvents(socket: SocketIO.Socket): void {
    const thisClientId = socket.client.id;

    socket.once('disconnect', () => {
      this.emit('disconnected', socket.id, this.clients.get(thisClientId));
      this.clients.delete(socket.id);
      debug('socket disconnected %s', socket.id);
    });

    socket.on('actional_findClients', async (payload: FindSocketsPayload, callback: (data: unknown) => void) => {
      debug('%s requesting socket information', socket.id, payload);

      if (!this.server.nsps[payload.namespace || '/'])
        return callback({
          ok: false,
          code: ResponseCode.NotFound,
          error: 'Namespace does not exist'
        });

      const namespace = this.server.of(payload.namespace || '/');

      let clients = Object.keys(namespace.sockets)
        .map(sId => this.clients.get(sId.split('#').reverse()[0]))
        .sort((a, b) => a.priority - b.priority);

      if (payload.rooms && payload.rooms.length)
        payload.rooms.map(room => {
          const roomObj = namespace.adapter.rooms[room];
          if (!roomObj) return clients = [];
          clients = clients.filter(client => !!roomObj.sockets[client.socket.id]);
        });

      if (payload.conditions && payload.conditions.length) {
        // Ensure array
        payload.conditions = payload.conditions.map(condition => {
          if (typeof condition === 'string')
            condition = [condition];
          return condition;
        });

        const conditionResults = await this.emitToClients(clients, 'actional_condition', payload.conditions);

        clients = clients.filter(client => {
          const socketConditions: PromiseDefinition<ConditionsResponse[], SocketDefinition> = conditionResults
            .find(result => result.info.id === client.socket.id);
          if (!socketConditions || socketConditions.status === 'rejected')
            return false;
          return !Object.values(socketConditions.result[0].conditions).includes(false);
        });
      }

      callback({
        ok: true,
        clients: clients.map(s => ({
          id: s.socket.id,
          name: s.name,
          priority: s.priority,
          rooms: s.rooms
        }))
      });
    });

    socket.on('actional_sendToClient', async (clientId: string, eventName: string, args: unknown[] = [], callback: (data: unknown) => void) => {
      if (typeof clientId !== 'string' || typeof eventName !== 'string')
        return callback({
          ok: false,
          code: ResponseCode.InvalidArguments,
          error: 'Invalid arguments'
        });
      else if (!Array.isArray(args))
        return callback({
          ok: false,
          code: ResponseCode.InvalidArguments,
          error: 'Target arguments must be an array'
        });
      else if (eventName.startsWith('actional_'))
        return callback({
          ok: false,
          code: ResponseCode.Forbidden,
          error: 'You cannot emit server-only events'
        });
      
      const targetClient = this.clients.get(clientId);

      if (!targetClient)
        return callback({
          ok: false,
          code: ResponseCode.NotFound,
          error: 'Client not found'
        });

      debug('%s requesting to send data to client %s', socket.id, targetClient.socket.id, eventName, args);
      
      try {
        const result = (await sendAndRecieve({
          socket: targetClient.socket, timeout: this.config.ackTimeout }, eventName, ...args))[0] as ClientEventResponse<unknown>;

        if (!result.ok) callback({
          ok: true,
          status: 'rejected',
          reason: result.error as ActionalResponseError
        }); else callback({
          ok: true,
          status: 'fufilled',
          result: result.result
        });
      } catch (err) {
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
  async emitToClients(sockets: ClientInfo[], eventName: string, ...data: any[]): Promise<PromiseDefinition<any[], SocketDefinition>[]> {
    const results = await allSettled(sockets.map(socket =>
      definePromise(
        sendAndRecieve({ socket: socket.socket, timeout: this.config.ackTimeout }, eventName, ...data),
        { id: socket.socket.id, name: socket.name, priority: socket.priority })
    ));

    return results.map(res => res.value);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  of(nsp: string | Function | RegExp): Namespace {
    const newNamespace = typeof nsp === 'string' && !this.server.nsps[nsp];
    const namespace = this.server.of(nsp);
    if (newNamespace) {
      debug('hooking new namespace %s', namespace.name);
      this._hookNamespaceEvents(namespace);
    }
    return namespace;
  }

  listen(port: number): ActionalServer {
    this.server.attach(port);
    return this;
  }
}

export default ActionalServer;