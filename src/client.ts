import SocketIOClient from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import debugModule from 'debug';
import {
  ActionalResponse,
  ResponseCode,
  ActionalResponseError,
  Callback,
  Conditions,
  FindClientsResponse,
  LooseConditions,
  SendToClientResponse
} from './constants';
import { sendAndRecieve } from './utils';
import { ActionalError, ResponseError } from './errors';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allSettled = require('promise.allsettled');
const debug = debugModule('actional:client');

export interface ActionalClientOptions {
  password?: string;
  priority?: number;
  name?: string;
  rooms?: string[] | string;
  conditionals?: Record<string, ConditionalValue>;
}

// eslint-disable-next-line no-unused-vars
type ConditionalValue = boolean | (<T extends unknown[]>(...args: T) => boolean | Promise<boolean>);

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

class ActionalClient extends EventEmitter {
  public readonly socket: SocketIOClient.Socket;
  public readonly manager: SocketIOClient.Manager;
  public conditionals: Record<string, ConditionalValue>;

  constructor(url: string, actionalOptions: ActionalClientOptions = {}, options?: SocketIOClient.ManagerOptions) {
    super();
    // Move conditionals
    const conditionals = actionalOptions.conditionals;
    delete actionalOptions.conditionals;

    // Format rooms properly
    if (Array.isArray(actionalOptions.rooms)) actionalOptions.rooms.join();

    // Default query
    // @ts-ignore
    if (!options) options = {};
    if (options.query) Object.assign(options.query, actionalOptions);
    else options.query = actionalOptions;

    // Prioritize websockets
    Object.assign(options, { transports: ['websocket', 'polling'] });
    this.socket = SocketIOClient.io(url, options);
    this.manager = this.socket.io;
    this.conditionals = conditionals || {};
    this._hookEvents();
  }

  private _hookEvents(): void {
    this.socket.on('actional_condition', async (conditions: Conditions, callback: Callback) => {
      debug(
        'sending conditions',
        conditions.map((c) => c[0])
      );
      const results = {};

      await allSettled(
        conditions.map(async ([condition, ...args]) => {
          const conditional = this.conditionals[condition];
          // Static conditions & undefined conditions
          if (!conditional) return (results[condition] = false);
          else if (typeof conditional === 'function') {
            // Handle functions and promises
            let result = conditional(...args);
            if (result instanceof Promise) result = await result;
            results[condition] = !!result;
          } else results[condition] = !!conditional;
        })
      );

      // Assume any failed promises or unhandled conditionals are false
      conditions.map(([condition]) => {
        if (results[condition] === undefined) results[condition] = false;
      });

      callback({
        ok: true,
        conditions: results
      });
    });
  }

  private async _sendAndRecieve(eventName: string, ...args: unknown[]): Promise<ActionalResponse> {
    const response = (await sendAndRecieve({ socket: this.socket }, eventName, ...args)) as [ActionalResponse];
    const result = response[0];
    if (result.ok) return result;
    else throw new ResponseError(result as ActionalResponseError);
  }

  async findClients(
    { namespace = '/', rooms = [] }: { namespace: string; rooms?: string[] },
    conditions?: LooseConditions
  ): Promise<FindClientsResponse> {
    return this._sendAndRecieve('actional_findClients', {
      namespace,
      rooms,
      conditions
    }) as Promise<FindClientsResponse>;
  }

  async sendToClient<T>(clientId: string, eventName: string, ...args: unknown[]): Promise<SendToClientResponse<T>> {
    return this._sendAndRecieve('actional_sendToClient', clientId, eventName, args) as Promise<SendToClientResponse<T>>;
  }

  defineEvent(
    eventName: string,
    // eslint-disable-next-line no-unused-vars
    func: <T extends unknown[], R = unknown>(...args: T) => R | Promise<R>
  ): ActionalClient {
    if (BuiltInClientEvents.includes(eventName))
      throw new ActionalError("You can't define a built-in event!", 'defineEvent');
    else if (eventName.startsWith('actional_'))
      throw new ActionalError("You can't define an actional event!", 'defineEvent');

    debug('defining event "%s"', eventName);

    this.socket.on(eventName, async (...args: (unknown | Callback)[]) => {
      const callback = args.pop() as Callback;
      try {
        let result = func(...args);
        if (result instanceof Promise) result = await result;

        let callbackData = {
          ok: true,
          result
        };
        if (typeof result === 'object') callbackData = { ...result, ...callbackData };
        else callbackData.result = result;
        callback(callbackData);
      } catch (err) {
        callback({
          ok: false,
          code: ResponseCode.ClientError,
          error: err.toString()
        });
      }
    });

    return this;
  }
}

export default ActionalClient;
