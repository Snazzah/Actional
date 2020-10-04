import AbortController from 'abort-controller';
import { AbortError } from './errors';

interface SAROptions {
  socket: SocketIO.Socket | SocketIOClient.Socket;
  timeout?: number;
}

export function sendAndRecieve({ socket, timeout = 5000 }: SAROptions, eventName: string, ...args: unknown[]): Promise<unknown[]> {
  const controller = new AbortController();
  setTimeout(controller.abort.bind(controller), timeout);
  
  return new Promise((resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(new AbortError('The operation was aborted.')));
    socket.emit(eventName, ...args, (...data: unknown[]) => {
      if (!controller.signal.aborted) resolve(data);
    });
  });
}

export interface PromiseDefinition<T, I> {
  status: 'fufilled' | 'rejected';
  info: I
  result?: T
  error?: unknown
}

export async function definePromise<T, I>(promise: Promise<T>, info: I): Promise<PromiseDefinition<T, I>> {
  try {
    const result: T = await promise;
    return { status: 'fufilled', info, result };
  } catch (error) {
    return { status: 'rejected', info, error };
  }
}