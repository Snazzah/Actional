import { ActionalResponseError, ResponseCode } from './constants';

export class ActionalError extends Error {
  public readonly type: string;

  constructor(message: string, type: string) {
    super(message);
    // Hide custom error implementation details from end-users
    Error.captureStackTrace(this, this.constructor);

    this.type = type;
  }

  get name(): string {
    return this.constructor.name;
  }

  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }
}

export class AbortError extends ActionalError {
  constructor(message: string, type = 'aborted') {
    super(message, type);
  }
}

export class ResponseError extends ActionalError {
  public readonly code: ResponseCode;
  public readonly response: ActionalResponseError;

  constructor(response: ActionalResponseError) {
    super(response.error, 'response');
    this.code = response.code;
    this.response = response;
  }
}