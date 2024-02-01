"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const outsideTimeInterval_condition_1 = __importDefault(require("./outsideTimeInterval.condition"));
function buildCondition(condition, message, cb) {
    if (condition === "anyMessage") {
        return () => cb(message);
    }
    else if (condition.includes("outsideTimeInterval")) {
        const values = condition.replace("outsideTimeInterval", "").replace("(", "").replace(")", "").replace(" ", "");
        const [initialTime, finalTime] = values.split(",");
        return () => (0, outsideTimeInterval_condition_1.default)(initialTime, finalTime, message, cb);
    }
    return () => null;
}
exports.default = buildCondition;
//# sourceMappingURL=index.js.map