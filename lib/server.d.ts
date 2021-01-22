import SocketIO, { Namespace } from 'socket.io';
import Collection from '@discordjs/collection';
import { PromiseDefinition } from './utils';
import EventEmitter from 'eventemitter3';
export interface ActionalServerOptions {
    password?: string;
    ackTimeout?: number;
}
interface ClientInfo {
    socket: SocketIO.Socket;
    priority: number;
    name: string;
    rooms: string[];
}
interface SocketDefinition {
    id: string;
    priority: number;
    name: string;
}
declare type ParentNspNameMatchFn = (name: string, query: object, fn: (err: Error | null, success: boolean) => void) => void;
declare class ActionalServer extends EventEmitter {
    readonly server: SocketIO.Server;
    readonly config: ActionalServerOptions;
    clients: Collection<string, ClientInfo>;
    constructor(actionalOptions?: ActionalServerOptions, options?: SocketIO.ServerOptions);
    private _hookParentNamespaceEvents;
    private _hookNamespaceEvents;
    private _hookSocketEvents;
    emitToClients(sockets: ClientInfo[], eventName: string, ...data: any[]): Promise<PromiseDefinition<any[], SocketDefinition>[]>;
    of(nsp: string | ParentNspNameMatchFn | RegExp): Namespace;
    listen(port: number): ActionalServer;
}
export default ActionalServer;
