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
const axios_1 = __importDefault(require("axios"));
const promise_1 = require("mysql2/promise");
const whatsapp_web_js_1 = __importStar(require("whatsapp-web.js"));
const utils_1 = require("./utils");
const build_automatic_messages_1 = __importDefault(require("./build-automatic-messages"));
const connection_1 = __importDefault(require("./connection"));
class WhatsappInstance {
    constructor(clientName, whatsappNumber, requestURL, connection) {
        this.isAuthenticated = false;
        this.isReady = false;
        this.blockedNumbers = [];
        this.autoMessageCounter = new Map();
        this.autoMessageCallbacks = [];
        this.clientName = clientName;
        this.whatsappNumber = whatsappNumber;
        this.requestURL = requestURL;
        this.connectionParams = connection;
        this.client = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({ clientId: `${clientName}_${whatsappNumber}` }),
            puppeteer: {
                headless: true,
                executablePath: process.env.CHROME_BIN || undefined,
                browserWSEndpoint: process.env.CHROME_WS || undefined,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                ]
            }
        });
        this.buildBlockedNumbers();
        this.buildAutomaticMessages();
        this.buildClient();
        this.initialize();
    }
    buildClient() {
        this.client.on("qr", (qr) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.post(`${this.requestURL}/qr/${this.whatsappNumber}`, { qr });
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] QR success => ${qr.slice(0, 30)}...`);
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] QR failure =>`, (err === null || err === void 0 ? void 0 : err.response) ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        }));
        this.client.on("loading_screen", (percent, message) => {
            (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Loading => ${message} ${percent}%`);
        });
        this.client.on("change_state", (state) => {
            (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Chage state => ${state}`);
        });
        this.client.on("authenticated", () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.post(`${this.requestURL}/auth/${this.whatsappNumber}`, {});
                this.isAuthenticated = true;
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Auth success!`);
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Auth failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        }));
        this.client.on("ready", () => __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.put(`${this.requestURL}/ready/${this.whatsappNumber}`);
                this.isReady = true;
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Ready success!`);
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Ready failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        }));
        this.client.on("message", (message) => this.onReceiveMessage(message));
        this.client.on("message_ack", (status) => this.onReceiveMessageStatus(status));
    }
    buildBlockedNumbers() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield (0, connection_1.default)();
            const [rows] = yield connection.execute(`SELECT * FROM blocked_numbers WHERE instance_number = ?`, [this.whatsappNumber]);
            this.blockedNumbers = rows.map((r) => r.blocked_number);
            connection.end();
            connection.destroy();
        });
    }
    buildAutomaticMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield (0, connection_1.default)();
            const SELECT_BOTS_QUERY = "SELECT * FROM automatic_messages WHERE instance_number = ?";
            const [rows] = yield connection.execute(SELECT_BOTS_QUERY, [this.whatsappNumber]);
            const autoMessages = rows;
            autoMessages.forEach(am => {
                const callback = (0, build_automatic_messages_1.default)(this, am);
                this.autoMessageCallbacks.push(callback);
            });
            connection.end();
            connection.destroy();
        });
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield axios_1.default.put(`${this.requestURL}/init/${this.whatsappNumber}`);
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Init success!`);
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Init failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
            finally {
                yield this.client.initialize();
            }
        });
    }
    onReceiveMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const blockedTypes = ["e2e_notification", "notification_template", "call_log"];
                const fromNow = (0, utils_1.isMessageFromNow)(message);
                const chat = yield message.getChat();
                const contactNumber = chat.id.user;
                const isStatus = message.isStatus;
                const isBlackListedType = blockedTypes.includes(message.type);
                const isBlackListedContact = this.blockedNumbers.includes(contactNumber);
                const isBlackListed = isBlackListedType || isBlackListedContact;
                this.autoMessageCallbacks.forEach(cb => {
                    cb(message);
                });
                if (!chat.isGroup && fromNow && !message.isStatus && !isBlackListed && !isStatus) {
                    const parsedMessage = yield (0, utils_1.messageParser)(message);
                    yield axios_1.default.post(`${this.requestURL}/receive_message/${this.whatsappNumber}/${contactNumber}`, parsedMessage);
                    (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Message success => ${message.id._serialized}`);
                }
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Message failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });
    }
    onReceiveMessageStatus(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = ["PENDING", "SENT", "RECEIVED", "READ", "PLAYED"][message.ack] || "ERROR";
                yield axios_1.default.put(`${this.requestURL}/update_message/${message.id._serialized}`, { status });
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Status success => ${status} ${message.id._serialized}`);
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Status failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });
    }
    loadMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connection = yield (0, promise_1.createConnection)(this.connectionParams);
                const chats = (yield this.client.getChats()).filter((c) => !c.isGroup);
                for (const chat of chats) {
                    const contact = yield this.client.getContactById(chat.id._serialized);
                    if (contact && connection) {
                        const getCodigoNumero = (connection) => __awaiter(this, void 0, void 0, function* () {
                            var _a;
                            const SELECT_CONTACT_QUERY = `SELECT * FROM w_clientes_numeros WHERE NUMERO = ?`;
                            const [rows] = yield connection.execute(SELECT_CONTACT_QUERY, [chat.id.user]);
                            if (!rows[0]) {
                                const INSERT_CONTACT_QUERY = `INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)`;
                                const [result] = yield connection.execute(INSERT_CONTACT_QUERY, [-1, ((_a = contact.name) === null || _a === void 0 ? void 0 : _a.slice(0, 30)) || contact.number, contact.number]);
                                return result.insertId;
                            }
                            const CODIGO_NUMERO = rows[0].CODIGO;
                            return CODIGO_NUMERO;
                        });
                        const CODIGO_NUMERO = yield getCodigoNumero(connection);
                        const messages = yield chat.fetchMessages({});
                        const parsedMessases = yield Promise.all(messages.map((m) => __awaiter(this, void 0, void 0, function* () {
                            const parsedMessage = yield (0, utils_1.messageParser)(m);
                            if (parsedMessage) {
                                return Object.assign(Object.assign({}, parsedMessage), { MENSAGEM: encodeURI(parsedMessage.MENSAGEM), CODIGO_NUMERO });
                            }
                            else {
                                return false;
                            }
                        })));
                        for (const message of parsedMessases) {
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
                    }
                }
            }
            catch (err) {
                (0, utils_1.logWithDate)("Load Messages Error =>", err);
            }
        });
    }
    sendText(contact, text, quotedMessageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const numberId = yield this.client.getNumberId(contact);
                const chatId = numberId && numberId._serialized;
                if (chatId) {
                    const sentMessage = yield this.client.sendMessage(chatId, text, { quotedMessageId });
                    const parsedMessage = yield (0, utils_1.messageParser)(sentMessage);
                    if (parsedMessage) {
                        (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Send text success => ${parsedMessage.ID}`);
                    }
                    return parsedMessage;
                }
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Send text failure =>`, err);
            }
        });
    }
    sendFile({ contact, file, mimeType, fileName, caption, quotedMessageId, isAudio }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let formatedFile = file.toString("base64");
                if (isAudio === "true") {
                    formatedFile = (yield (0, utils_1.formatToOpusAudio)(file)).toString("base64");
                }
                const chatId = `${contact}@c.us`;
                const media = new whatsapp_web_js_1.default.MessageMedia(mimeType, formatedFile, fileName);
                const sentMessage = yield this.client.sendMessage(chatId, media, { caption, quotedMessageId, sendAudioAsVoice: !!isAudio });
                const parsedMessage = yield (0, utils_1.messageParser)(sentMessage);
                if (parsedMessage) {
                    (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Send file success => ${parsedMessage.ID}`);
                }
                return parsedMessage;
            }
            catch (err) {
                (0, utils_1.logWithDate)(`[${this.clientName} - ${this.whatsappNumber}] Send file failure  =>`, err);
            }
        });
    }
    getProfilePicture(number) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pfpURL = yield this.client.getProfilePicUrl(number + "@c.us");
                (0, utils_1.logWithDate)("Get PFP URL Success!");
                return pfpURL;
            }
            catch (err) {
                (0, utils_1.logWithDate)("Get PFP URL err =>", err);
                return null;
            }
        });
    }
    validateNumber(number) {
        return __awaiter(this, void 0, void 0, function* () {
            const isValid = yield this.client.getNumberId(number);
            return !!isValid && isValid.user;
        });
    }
}
exports.default = WhatsappInstance;
//# sourceMappingURL=whatsapp.js.map