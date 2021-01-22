import SocketIOClient from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import { FindClientsResponse, LooseConditions, SendToClientResponse } from './constants';
export interface ActionalClientOptions {
    password?: string;
    priority?: number;
    name?: string;
    rooms?: string[] | string;
    conditionals?: Record<string, ConditionalValue>;
}
declare type ConditionalValue = boolean | (<T extends unknown[]>(...args: T) => boolean | Promise<boolean>);
declare class ActionalClient extends EventEmitter {
    readonly socket: SocketIOClient.Socket;
    readonly manager: SocketIOClient.Manager;
    conditionals: Record<string, ConditionalValue>;
    constructor(url: string, actionalOptions?: ActionalClientOptions, options?: SocketIOClient.ManagerOptions);
    private _hookEvents;
    private _sendAndRecieve;
    findClients({ namespace, rooms }: {
        namespace: string;
        rooms?: string[];
    }, conditions?: LooseConditions): Promise<FindClientsResponse>;
    sendToClient<T>(clientId: string, eventName: string, ...args: unknown[]): Promise<SendToClientResponse<T>>;
    defineEvent(eventName: string, func: <T extends unknown[], R = unknown>(...args: T) => R | Promise<R>): ActionalClient;
}
export default ActionalClient;
