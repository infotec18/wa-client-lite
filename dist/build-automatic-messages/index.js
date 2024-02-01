"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conditions_1 = __importDefault(require("./conditions"));
const response_1 = __importDefault(require("./response"));
function buildAutomaticMessage(instance, automaticMessage) {
    const execute = (message) => {
        console.log(message);
        const callback = (0, response_1.default)(automaticMessage, instance);
        const condition = (0, conditions_1.default)(automaticMessage.send_condition, message, callback);
        condition();
    };
    return execute;
}
exports.default = buildAutomaticMessage;
//# sourceMappingURL=index.js.map