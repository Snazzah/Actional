import { ActionalResponseError, ResponseCode } from './constants';
export declare class ActionalError extends Error {
    readonly type: string;
    constructor(message: string, type: string);
    get name(): string;
    get [Symbol.toStringTag](): string;
}
export declare class AbortError extends ActionalError {
    constructor(message: string, type?: string);
}
export declare class ResponseError extends ActionalError {
    readonly code: ResponseCode;
    readonly response: ActionalResponseError;
    constructor(response: ActionalResponseError);
}
