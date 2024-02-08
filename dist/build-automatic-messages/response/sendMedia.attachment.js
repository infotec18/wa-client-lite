"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const whatsapp_web_js_1 = require("whatsapp-web.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mime = __importStar(require("mime"));
const utils_1 = require("../../utils");
function sendMedia(message, filename, voice, document) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const searchFilePath = path_1.default.join(utils_1.filesPath, "/auto-files", filename);
            const mimeType = mime.getType(searchFilePath);
            const file = fs_1.default.readFileSync(searchFilePath);
            if (mimeType && file) {
                if (voice) {
                    const formatedFile = yield (0, utils_1.formatToOpusAudio)(file);
                    const messageMedia = new whatsapp_web_js_1.MessageMedia("audio/mp3", formatedFile.toString("base64"), filename);
                    yield message.reply(messageMedia, undefined, { sendAudioAsVoice: true });
                }
                else {
                    const messageMedia = new whatsapp_web_js_1.MessageMedia(mimeType, file.toString("base64"), filename);
                    yield message.reply(messageMedia, undefined, { sendMediaAsDocument: !!document });
                }
            }
        }
        catch (error) {
            console.error("Erro ao enviar media:", error);
        }
    });
}
exports.default = sendMedia;
//# sourceMappingURL=sendMedia.attachment.js.map