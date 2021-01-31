"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.definePromise = exports.sendAndRecieve = void 0;
const abort_controller_1 = __importDefault(require("abort-controller"));
const errors_1 = require("./errors");
function sendAndRecieve({ socket, timeout = 5000 }, eventName, ...args) {
    const controller = new abort_controller_1.default();
    setTimeout(controller.abort.bind(controller), timeout);
    return new Promise((resolve, reject) => {
        controller.signal.addEventListener('abort', () => reject(new errors_1.AbortError('The operation was aborted.')));
        socket.emit(eventName, ...args, (...data) => {
            if (!controller.signal.aborted)
                resolve(data);
        });
    });
}
exports.sendAndRecieve = sendAndRecieve;
async function definePromise(promise, info) {
    try {
        const result = await promise;
        return { status: 'fufilled', info, result };
    }
    catch (error) {
        return { status: 'rejected', info, error };
    }
}
exports.definePromise = definePromise;
