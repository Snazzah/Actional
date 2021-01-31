"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCode = void 0;
/* eslint-disable no-unused-vars */
// Responses
var ResponseCode;
(function (ResponseCode) {
    ResponseCode[ResponseCode["ServerError"] = -1] = "ServerError";
    ResponseCode[ResponseCode["InvalidArguments"] = 1] = "InvalidArguments";
    ResponseCode[ResponseCode["NotFound"] = 2] = "NotFound";
    ResponseCode[ResponseCode["Forbidden"] = 3] = "Forbidden";
    ResponseCode[ResponseCode["ClientError"] = 3] = "ClientError";
})(ResponseCode = exports.ResponseCode || (exports.ResponseCode = {}));
