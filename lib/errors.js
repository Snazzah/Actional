"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseError = exports.AbortError = exports.ActionalError = void 0;
class ActionalError extends Error {
    constructor(message, type) {
        super(message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Vycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGFBQWMsU0FBUSxLQUFLO0lBR3RDLFlBQVksT0FBZSxFQUFFLElBQVk7UUFDdkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztDQUNGO0FBbEJELHNDQWtCQztBQUVELE1BQWEsVUFBVyxTQUFRLGFBQWE7SUFDM0MsWUFBWSxPQUFlLEVBQUUsSUFBSSxHQUFHLFNBQVM7UUFDM0MsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN2QixDQUFDO0NBQ0Y7QUFKRCxnQ0FJQztBQUVELE1BQWEsYUFBYyxTQUFRLGFBQWE7SUFJOUMsWUFBWSxRQUErQjtRQUN6QyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztDQUNGO0FBVEQsc0NBU0MifQ==