"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sendContact_attachment_1 = __importDefault(require("./sendContact.attachment"));
const sendLocation_attachment_1 = __importDefault(require("./sendLocation.attachment"));
const sendMedia_attachment_1 = __importDefault(require("./sendMedia.attachment"));
function buildResponse(automaticMessage, instance) {
    var _a;
    const haveText = ((_a = automaticMessage.text) === null || _a === void 0 ? void 0 : _a.length) > 0;
    return (message) => __awaiter(this, void 0, void 0, function* () {
        try {
            haveText && (yield message.reply(automaticMessage.text));
            switch (automaticMessage.attachment_type) {
                case "contact":
                    (0, sendContact_attachment_1.default)(instance, message, automaticMessage.attachment);
                    break;
                case "voice":
                    (0, sendMedia_attachment_1.default)(message, automaticMessage.attachment);
                case "audio":
                    (0, sendMedia_attachment_1.default)(message, automaticMessage.attachment);
                    break;
                case "document":
                    (0, sendMedia_attachment_1.default)(message, automaticMessage.attachment, false, true);
                    break;
                case "image":
                    (0, sendMedia_attachment_1.default)(message, automaticMessage.attachment);
                    break;
                case "video":
                    (0, sendMedia_attachment_1.default)(message, automaticMessage.attachment);
                    break;
                case "location":
                    (0, sendLocation_attachment_1.default)(message, automaticMessage.attachment);
                    break;
            }
        }
        catch (err) {
            console.error("cb err", err);
        }
    });
}
exports.default = buildResponse;
//# sourceMappingURL=index.js.map