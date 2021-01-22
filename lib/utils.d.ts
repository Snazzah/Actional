import * as SocketIO from 'socket.io';
import * as SocketIOClient from 'socket.io-client';
interface SAROptions {
    socket: SocketIO.Socket | SocketIOClient.Socket;
    timeout?: number;
}
export declare function sendAndRecieve({ socket, timeout }: SAROptions, eventName: string, ...args: unknown[]): Promise<unknown[]>;
export interface PromiseDefinition<T, I> {
    status: 'fufilled' | 'rejected';
    info: I;
    result?: T;
    error?: unknown;
}
export declare function definePromise<T, I>(promise: Promise<T>, info: I): Promise<PromiseDefinition<T, I>>;
export {};
