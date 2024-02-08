"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const conditions_1 = __importDefault(require("./conditions"));
const response_1 = __importDefault(require("./response"));
function buildAutomaticMessage(instance, automaticMessage) {
    const execute = (message, contact) => {
        const callback = (0, response_1.default)(automaticMessage, instance);
        const condition = (0, conditions_1.default)(automaticMessage.send_condition, message, callback);
        if (!instance.autoMessageCounters.get(automaticMessage.id)) {
            instance.autoMessageCounters.set(automaticMessage.id, []);
        }
        const autoMessageCounts = instance.autoMessageCounters.get(automaticMessage.id);
        if (!(autoMessageCounts === null || autoMessageCounts === void 0 ? void 0 : autoMessageCounts.find(c => c.number === contact))) {
            autoMessageCounts === null || autoMessageCounts === void 0 ? void 0 : autoMessageCounts.push({ number: contact, count: 0 });
        }
        const contactCount = autoMessageCounts === null || autoMessageCounts === void 0 ? void 0 : autoMessageCounts.find(c => c.number === contact);
        if ((contactCount === null || contactCount === void 0 ? void 0 : contactCount.count) && automaticMessage.send_max_times > contactCount.count) {
            autoMessageCounts === null || autoMessageCounts === void 0 ? void 0 : autoMessageCounts.find(c => c.number === contact);
            condition();
        }
    };
    return execute;
}
exports.default = buildAutomaticMessage;
//# sourceMappingURL=index.js.map