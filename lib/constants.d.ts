export declare enum ResponseCode {
    ServerError = -1,
    InvalidArguments = 1,
    NotFound = 2,
    Forbidden = 3,
    ClientError = 3
}
export declare type Callback = (data: unknown) => void;
interface ActionalResponseBase {
    [key: string]: any;
}
export interface ActionalResponse extends ActionalResponseBase {
    ok: boolean;
}
export interface ActionalResponseError extends ActionalResponseBase {
    ok: false;
    code: ResponseCode;
    error: string;
}
export interface FindClientsResponse extends ActionalResponse {
    clients: Array<{
        id: string;
        name: string;
        priority: number;
        rooms: string[];
    }>;
}
export interface ClientEventResponse<T> extends ActionalResponse {
    result: T;
}
export interface SendToClientResponse<T> extends ActionalResponse {
    status: 'fufilled' | 'rejected';
    reason?: string;
    result: T;
}
export interface ConditionsResponse extends ActionalResponse {
    conditions: {
        [key: string]: boolean;
    };
}
export declare type LooseConditions = Array<[string, ...unknown[]] | string>;
export declare type Conditions = Array<[string, ...unknown[]]>;
export interface FindSocketsPayload {
    namespace: string;
    rooms: string[];
    conditions?: LooseConditions;
}
export {};
