import SocketIOClient from 'socket.io-client';
import urlParser from 'socket.io-client/lib/url';
import EventEmitter from 'eventemitter3';
import debugModule from 'debug';
import { ActionalResponse, ActionalResponseError, Conditions, FindClientsResponse, LooseConditions, SendToClientResponse } from './constants';
import { sendAndRecieve } from './utils';
import { ResponseError } from './errors';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allSettled = require('promise.allsettled');
const debug = debugModule('actional:client');

export interface ActionalClientOptions {
  password?: string
  priority?: number
  name?: string
  rooms?: string[] | string
  conditionals?: Record<string, ConditionalValue>
}

type ConditionalValue = boolean | (<T extends unknown[]>(...args: T) => (boolean | Promise<boolean>))

class ActionalClient extends EventEmitter {
  public readonly socket: SocketIOClient.Socket;
  public readonly manager: SocketIOClient.Manager;
  public conditionals: Record<string, ConditionalValue>;

  constructor(url: string, actionalOptions: ActionalClientOptions = {}, options: SocketIOClient.ConnectOpts = {}) {
    super();
    // Move conditionals
    const conditionals = actionalOptions.conditionals;
    delete actionalOptions.conditionals;

    // Format rooms properly
    if (Array.isArray(actionalOptions.rooms))
      actionalOptions.rooms.join();

    // Default query
    if (options.query)
      Object.assign(options.query, actionalOptions);
    else options.query = actionalOptions;

    // Prioritize websockets
    Object.assign(options, { transports: ['websocket', 'polling'] });
    this.manager = SocketIOClient.managers[urlParser(url).id];
    this.conditionals = conditionals || {};
    this._hookEvents();
  }

  private _hookEvents(): void {
    this.socket.on('actional_condition', async (conditions: Conditions, callback: (data: unknown) => void) => {
      debug('sending conditions', conditions.map(c => c[0]));
      const results = {};
    
      await allSettled(conditions.map(async ([condition, ...args]) => {
        const conditional = this.conditionals[condition];
        // Static conditions & undefined conditions
        if (!conditional)
          return results[condition] = false;
        else if (typeof conditional === 'function') {
          // Handle functions and promises
          let result = conditional(...args);
          if (result instanceof Promise)
            result = await result;
          results[condition] = !!result;
        } else results[condition] = !!conditional;
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

  private async _sendAndRecieve(eventName: string, ...args: unknown[]): Promise<ActionalResponse> {
    const response = await sendAndRecieve({ socket: this.socket }, eventName, ...args) as [ActionalResponse];
    const result = response[0];
    if (result.ok)
      return result;
    else throw new ResponseError(result as ActionalResponseError);
  }

  async findClients(
    { namespace = '/', rooms = [] }: { namespace: string, rooms?: string[] }, conditions?: LooseConditions
  ): Promise<FindClientsResponse> {
    return this._sendAndRecieve('actional_findClients', { namespace, rooms, conditions }) as Promise<FindClientsResponse>;
  }

  async sendToClient<T>(clientId: string, eventName: string, ...args: unknown[]): Promise<SendToClientResponse<T>> {
    return this._sendAndRecieve('actional_sendToSocket', clientId, eventName, args) as Promise<SendToClientResponse<T>>;
  }
}

export default ActionalClient;