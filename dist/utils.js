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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateContact = exports.decodeSafeURI = exports.isUUID = exports.getAllEndpoints = exports.logWithDate = exports.formatToOpusAudio = exports.messageParser = exports.isMessageFromNow = void 0;
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
const node_crypto_1 = require("node:crypto");
const node_stream_1 = require("node:stream");
const node_child_process_1 = require("node:child_process");
function isMessageFromNow(message) {
    const messageDate = new Date(Number(`${message.timestamp}000`));
    const currentDate = new Date();
    const TWO_MINUTES = 1000 * 60 * 2;
    const timeDifference = currentDate.getTime() - messageDate.getTime();
    return timeDifference <= TWO_MINUTES;
}
exports.isMessageFromNow = isMessageFromNow;
;
function messageParser(message) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const quotedMessage = yield message.getQuotedMessage();
            const ID_REFERENCIA = quotedMessage && quotedMessage.id._serialized;
            const ID = message.id._serialized;
            const TIPO = message.type;
            const MENSAGEM = message.body;
            const TIMESTAMP = Number(`${message.timestamp}000`);
            const FROM_ME = message.fromMe;
            const STATUS = ["PENDING", "SENT", "RECEIVED", "READ", "PLAYED"][message.ack] || "ERROR";
            const serializedMessage = { ID, ID_REFERENCIA, TIPO, MENSAGEM, TIMESTAMP, FROM_ME, DATA_HORA: new Date(TIMESTAMP), STATUS };
            if (message.hasMedia) {
                const messageMedia = yield message.downloadMedia();
                const mediaBuffer = Buffer.from(messageMedia.data, 'base64');
                const uuid = (0, node_crypto_1.randomUUID)();
                const ARQUIVO_NOME = `${uuid}_${messageMedia.filename}`;
                const ARQUIVO_NOME_ORIGINAL = messageMedia.filename || ARQUIVO_NOME;
                const ARQUIVO_TIPO = messageMedia.mimetype;
                const filesPath = (0, node_path_1.join)(__dirname, '/', 'files');
                const savePath = (0, node_path_1.join)(filesPath, ARQUIVO_NOME);
                yield (0, promises_1.writeFile)(savePath, mediaBuffer);
                yield (0, promises_1.access)(savePath);
                const serializedFile = {
                    NOME_ARQUIVO: ARQUIVO_NOME,
                    TIPO: ARQUIVO_TIPO,
                    NOME_ORIGINAL: ARQUIVO_NOME_ORIGINAL,
                    ARMAZENAMENTO: 'outros',
                };
                const parsedMessage = Object.assign(Object.assign({}, serializedMessage), { ARQUIVO: serializedFile });
                return parsedMessage;
            }
            return Object.assign(Object.assign({}, serializedMessage), { ARQUIVO: null });
        }
        catch (err) {
            logWithDate("Parse Message Failure =>", err);
            return null;
        }
    });
}
exports.messageParser = messageParser;
function logWithDate(str, error) {
    const dateSring = new Date().toLocaleString();
    if (error) {
        console.error(`${dateSring}: ${str}`, error);
    }
    else {
        console.log(`${dateSring}: ${str}`);
    }
}
exports.logWithDate = logWithDate;
function getAllEndpoints(router, path) {
    const endpoints = [];
    if (router && router.stack) {
        router.stack.forEach((layer) => {
            if (layer.route) {
                const subPath = layer.route.path;
                const methods = Object.keys(layer.route.methods);
                methods.forEach((method) => {
                    endpoints.push(`${method.toUpperCase().padEnd(6, " ")} ${path}${subPath}`);
                });
            }
        });
    }
    return endpoints;
}
exports.getAllEndpoints = getAllEndpoints;
function formatToOpusAudio(file) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tempPath = (0, node_path_1.join)(__dirname, "temp");
            try {
                yield (0, promises_1.access)(tempPath);
            }
            catch (_a) {
                yield (0, promises_1.mkdir)(tempPath);
            }
            const savePath = (0, node_path_1.join)(tempPath, `${(0, node_crypto_1.randomUUID)()}.mp3`);
            const readableStream = new node_stream_1.Readable({
                read() {
                    this.push(file);
                    this.push(null);
                }
            });
            const ffmpeg = (0, node_child_process_1.spawn)('ffmpeg', [
                '-i', 'pipe:0',
                '-c:a', 'libmp3lame',
                '-b:a', '128k',
                savePath
            ]);
            readableStream.pipe(ffmpeg.stdin);
            return new Promise((resolve, reject) => {
                ffmpeg.on('close', (code) => __awaiter(this, void 0, void 0, function* () {
                    if (code === 0) {
                        const file = yield (0, promises_1.readFile)(savePath);
                        resolve(file);
                    }
                    else {
                        reject(`Erro ao converter para Opus, código de saída: ${code}`);
                    }
                }));
                ffmpeg.on('error', (err) => {
                    reject(err);
                });
            });
        }
        catch (err) {
            throw err;
        }
    });
}
exports.formatToOpusAudio = formatToOpusAudio;
function decodeSafeURI(uri) {
    try {
        return decodeURI(uri);
    }
    catch (_a) {
        return uri;
    }
}
exports.decodeSafeURI = decodeSafeURI;
function isUUID(str) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(str);
}
exports.isUUID = isUUID;
function getOrCreateContact(connection, number, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const SELECT_NUMBER_QUERY = "SELECT * FROM w_clientes_numeros WHERE NUMERO = ?";
        const [rows] = yield connection.execute(SELECT_NUMBER_QUERY, [number]);
        if (!rows[0]) {
            const INSERT_NUMBER_QUERY = "INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)";
            const [result] = yield connection.execute(INSERT_NUMBER_QUERY, [-1, name, number]);
            return result.insertId;
        }
        return rows[0].CODIGO;
    });
}
exports.getOrCreateContact = getOrCreateContact;
//# sourceMappingURL=utils.js.map