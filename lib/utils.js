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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0VBQStDO0FBQy9DLHFDQUFzQztBQVN0QyxTQUFnQixjQUFjLENBQzVCLEVBQUUsTUFBTSxFQUFFLE9BQU8sR0FBRyxJQUFJLEVBQWMsRUFDdEMsU0FBaUIsRUFDakIsR0FBRyxJQUFlO0lBRWxCLE1BQU0sVUFBVSxHQUFHLElBQUksMEJBQWUsRUFBRSxDQUFDO0lBQ3pDLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUV2RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLFVBQVUsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLG1CQUFVLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQWUsRUFBRSxFQUFFO1lBQ3JELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU87Z0JBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBZEQsd0NBY0M7QUFTTSxLQUFLLFVBQVUsYUFBYSxDQUFPLE9BQW1CLEVBQUUsSUFBTztJQUNwRSxJQUFJO1FBQ0YsTUFBTSxNQUFNLEdBQU0sTUFBTSxPQUFPLENBQUM7UUFDaEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO0tBQzdDO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDZCxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUM7S0FDNUM7QUFDSCxDQUFDO0FBUEQsc0NBT0MifQ==