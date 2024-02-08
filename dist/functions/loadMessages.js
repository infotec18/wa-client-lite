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
const promise_1 = require("mysql2/promise");
const utils_1 = require("../utils");
const getNumberErpId_1 = __importDefault(require("./getNumberErpId"));
function loadMessages(instance) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const connection = yield (0, promise_1.createConnection)(instance.connectionParams);
            const chats = (yield instance.client.getChats()).filter((c) => !c.isGroup);
            for (let i = 0; i < chats.length; i++) {
                try {
                    yield processChat(connection, instance, chats, i);
                }
                catch (err) {
                    (0, utils_1.logWithDate)(`Failed to load contact messages for ${chats[i].id.user} =>`, err);
                }
            }
        }
        catch (err) {
            (0, utils_1.logWithDate)("Load Messages Error =>", err);
        }
    });
}
function processChat(connection, instance, chats, index) {
    return __awaiter(this, void 0, void 0, function* () {
        const chat = chats[index];
        const contact = yield instance.client.getContactById(chat.id._serialized);
        (0, utils_1.logWithDate)(`[${index + 1}/${chats.length}] Loading Contact Messages: ${chat.id.user}...`);
        if (contact && connection) {
            yield processContactMessages(connection, chat, contact);
        }
    });
}
function processContactMessages(connection, chat, contact) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const CODIGO_NUMERO = yield (0, getNumberErpId_1.default)(connection, contact.id.user, contact.name);
            const blocked_types = ["e2e_notification", "notification_template", "call_log", "gp2"];
            const messages = (yield chat.fetchMessages({})).filter(m => !blocked_types.includes(m.type));
            (0, utils_1.logWithDate)(`Parsing ${messages.length} messages...`);
            const parsedMessages = yield parseMessages(messages, CODIGO_NUMERO);
            for (const message of parsedMessages.filter(m => !!m)) {
                if (message) {
                    yield saveMessage(connection, message);
                }
            }
        }
        catch (err) {
            (0, utils_1.logWithDate)(`Failed to insert messages for ${contact.id.user} =>`, err);
        }
    });
}
function parseMessages(messages, numberErpId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(messages.map((m) => __awaiter(this, void 0, void 0, function* () {
            try {
                const parsedMessage = yield (0, utils_1.messageParser)(m);
                return parsedMessage ? Object.assign(Object.assign({}, parsedMessage), { MENSAGEM: encodeURI(parsedMessage.MENSAGEM), CODIGO_NUMERO: numberErpId }) : undefined;
            }
            catch (err) {
                console.error(`Failed to parse message ${m.id._serialized} =>`, err);
                return undefined;
            }
        })));
    });
}
function saveMessage(connection, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (message) {
                const { CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS } = message;
                const INSERT_MESSAGE_QUERY = "INSERT INTO w_mensagens (CODIGO_OPERADOR, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                const [results] = yield connection.execute(INSERT_MESSAGE_QUERY, [0, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA || null, STATUS]);
                const insertId = results.insertId;
                if (insertId && message.ARQUIVO) {
                    const { NOME_ARQUIVO, TIPO, NOME_ORIGINAL, ARMAZENAMENTO } = message.ARQUIVO;
                    const INSERT_FILE_QUERY = "INSERT INTO w_mensagens_arquivos (CODIGO_MENSAGEM, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO) VALUES (?, ?, ?, ?, ?)";
                    yield connection.execute(INSERT_FILE_QUERY, [insertId, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO]);
                }
            }
        }
        catch (err) {
            (0, utils_1.logWithDate)(`Failed to save message id ${message === null || message === void 0 ? void 0 : message.ID} =>`, err);
        }
    });
}
exports.default = loadMessages;
//# sourceMappingURL=loadMessages.js.map