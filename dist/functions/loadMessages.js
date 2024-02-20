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
            let successfulInserts = 0;
            let failedInserts = 0;
            let alreadyExists = 0;
            for (let i = 0; i < chats.length; i++) {
                const result = yield processChat(connection, instance, chats, i);
                if (result) {
                    successfulInserts += result.successfulInserts;
                    failedInserts += result.failedInserts;
                    alreadyExists += result.alreadyExists;
                }
            }
            console.log(`Success: ${successfulInserts} | Failed: ${failedInserts} | Already Exists: ${alreadyExists}`);
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
        if (contact) {
            return yield processContactMessages(connection, chat, contact);
        }
        return null;
    });
}
function processContactMessages(connection, chat, contact) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const CODIGO_NUMERO = yield (0, getNumberErpId_1.default)(connection, contact.id.user, contact.name);
            const blocked_types = ["e2e_notification", "notification_template", "call_log", "gp2"];
            const messages = (yield chat.fetchMessages({})).filter(m => !blocked_types.includes(m.type));
            (0, utils_1.logWithDate)(`Parsing ${messages.length} messages...`);
            return yield parseAndSaveMessages(connection, messages, CODIGO_NUMERO);
        }
        catch (err) {
            (0, utils_1.logWithDate)(`Failed to insert messages for ${contact.id.user} =>`, err);
            return null;
        }
    });
}
function parseAndSaveMessages(connection, messages, numberErpId) {
    return __awaiter(this, void 0, void 0, function* () {
        let successfulInserts = 0;
        let failedInserts = 0;
        let alreadyExists = 0;
        for (const message of messages) {
            try {
                const messageExist = yield verifyMessageExist(connection, message.id._serialized);
                if (messageExist) {
                    console.log(`Message already on database:`, message.id._serialized);
                    alreadyExists++;
                    continue;
                }
                console.log(`Parsing Message:`, message.type, message.id._serialized);
                const parsedMessage = yield (0, utils_1.messageParser)(message);
                if (!parsedMessage) {
                    failedInserts++;
                    continue;
                }
                const insertedMessage = yield saveMessage(connection, Object.assign(Object.assign({}, parsedMessage), { CODIGO_NUMERO: numberErpId }));
                if (insertedMessage) {
                    successfulInserts++;
                }
            }
            catch (err) {
                (0, utils_1.logWithDate)(`Failed to parse message ${message.id._serialized} =>`, err);
                failedInserts++;
            }
        }
        ;
        return { successfulInserts, failedInserts, alreadyExists };
    });
}
function verifyMessageExist(connection, messageID) {
    return __awaiter(this, void 0, void 0, function* () {
        const SELECT_MESSAGE_QUERY = "SELECT * FROM w_mensagens WHERE ID = ?";
        const [results] = yield connection.execute(SELECT_MESSAGE_QUERY, [messageID]);
        return results[0];
    });
}
function saveMessage(connection, message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (message) {
                const { CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS } = message;
                const INSERT_MESSAGE_QUERY = "INSERT INTO w_mensagens (CODIGO_OPERADOR, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                console.log(`Inserting Message:`, message.TIPO, message.ID);
                const [results] = yield connection.execute(INSERT_MESSAGE_QUERY, [0, CODIGO_NUMERO, TIPO, encodeURI(MENSAGEM), FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA || null, STATUS]);
                const insertId = results.insertId;
                if (insertId && message.ARQUIVO) {
                    console.log(`Inserting File:`, message.ARQUIVO.TIPO, message.ARQUIVO.NOME_ARQUIVO);
                    const { NOME_ARQUIVO, TIPO, NOME_ORIGINAL, ARMAZENAMENTO } = message.ARQUIVO;
                    const INSERT_FILE_QUERY = "INSERT INTO w_mensagens_arquivos (CODIGO_MENSAGEM, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO) VALUES (?, ?, ?, ?, ?)";
                    yield connection.execute(INSERT_FILE_QUERY, [insertId, TIPO, encodeURI(NOME_ARQUIVO), encodeURI(NOME_ORIGINAL), ARMAZENAMENTO]);
                }
                return true;
            }
        }
        catch (err) {
            (0, utils_1.logWithDate)(`Failed to save message id ${message === null || message === void 0 ? void 0 : message.ID} =>`, err);
            return false;
        }
    });
}
exports.default = loadMessages;
//# sourceMappingURL=loadMessages.js.map