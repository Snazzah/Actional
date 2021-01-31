"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseError = exports.AbortError = exports.ActionalError = void 0;
class ActionalError extends Error {
    constructor(message, type) {
        super(message);
        // Hide custom error implementation details from end-users
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
    }
    get name() {
        return this.constructor.name;
    }
    get [Symbol.toStringTag]() {
        return this.constructor.name;
    }
}
exports.ActionalError = ActionalError;
class AbortError extends ActionalError {
    constructor(message, type = 'aborted') {
        super(message, type);
    }
}
exports.AbortError = AbortError;
class ResponseError extends ActionalError {
    constructor(response) {
        super(response.error, 'response');
        this.code = response.code;
        this.response = response;
    }
}
exports.ResponseError = ResponseError;
