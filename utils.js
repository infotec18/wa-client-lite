const { join } = require("path");
const { existsSync, readFileSync, unlinkSync, mkdirSync } = require("fs");
const { writeFile } = require("fs/promises");
const { Readable } = require('stream');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');


const isMessageFromNow = (message) => {
    const messageDate = new Date(Number(`${message.timestamp}000`));
    const currentDate = new Date();
    const TWO_MINUTES = 1000 * 60 * 2;
    const timeDifference = currentDate.getTime() - messageDate.getTime();

    return timeDifference <= TWO_MINUTES;
};

async function messageParser(message) {
    const quotedMessage = await message.getQuotedMessage();
    const ID_REFERENCIA = quotedMessage && quotedMessage.id._serialized;
    const ID = message.id._serialized;
    const TIPO = message.type;
    const MENSAGEM = message.body;
    const TIMESTAMP = Number(`${message.timestamp}000`);
    const FROM_ME = message.fromMe;

    let STATUS = 'SENT';

    switch (message.ack) {
        case -1:
            STATUS = 'ERROR';
            break;
        case 1:
            STATUS = 'SENT';
            break;
        case 2:
            STATUS = 'RECEIVED';
            break;
        case 3:
            STATUS = 'READ';
            break;
        default:
            STATUS = 'PENDING';
            break;
    }

    const serializedMessage = {
        ID,
        ID_REFERENCIA,
        TIPO,
        MENSAGEM,
        TIMESTAMP,
        FROM_ME,
        DATA_HORA: new Date(TIMESTAMP),
        STATUS,
    }

    if (message.hasMedia) {
        const messageMedia = await message.downloadMedia();
        const mediaBuffer = Buffer.from(messageMedia.data, 'base64');
        const uuid = randomUUID();
        const ARQUIVO_NOME = `${uuid}_${messageMedia.filename}`;
        const ARQUIVO_NOME_ORIGINAL = messageMedia.filename || ARQUIVO_NOME;

        const filesPath = join(__dirname, '/', 'files');
        const savePath = join(filesPath, ARQUIVO_NOME);

        await writeFile(savePath, mediaBuffer);
        const succesfulWritedFile = existsSync(savePath);

        if (succesfulWritedFile) {
            const ARQUIVO_TIPO = messageMedia.mimetype;
            const serializedFile = {
                NOME_ARQUIVO: ARQUIVO_NOME,
                TIPO: ARQUIVO_TIPO,
                NOME_ORIGINAL: ARQUIVO_NOME_ORIGINAL,
                ARMAZENAMENTO: 'outros',
            }

            const parsedMessage = {
                ...serializedMessage,
                ARQUIVO: serializedFile,
            }

            return parsedMessage;
        }
    }

    return { ...serializedMessage, ARQUIVO: null }
}

function logWithDate(str, error) {
    const dateSring = new Date().toLocaleString();

    if (error) {
        console.error(`${dateSring}: ${str}`, error);
    } else {
        console.log(`${dateSring}: ${str}`);
    }
}

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

async function formatToOpusAudio(file) {
    try {
        const tempPath = join(__dirname, "temp");
        if (!existsSync(tempPath)) {
            mkdirSync(tempPath);
        }
        const savePath = join(tempPath, `${randomUUID()}.mp3`);
        const readableStream = new Readable({
            read() {
                this.push(file);
                this.push(null);
            }
        });

        const ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            savePath
        ]);

        readableStream.pipe(ffmpeg.stdin);

        return new Promise((resolve, reject) => {
            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    resolve(readFileSync(savePath));
                } else {
                    reject(`Erro ao converter para Opus, código de saída: ${code}`);
                }
            });

            ffmpeg.on('error', (err) => {
                reject(err);
            });
        });
    } catch (err) {
        throw err;
    }
}

function decodeSafeURI(uri) {
    try {
        return decodeURI(uri);
    } catch (error) {
        return uri;
    }
}

function isUUID(str) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(str);
}

module.exports = { isMessageFromNow, messageParser, formatToOpusAudio, logWithDate, getAllEndpoints, isUUID, decodeSafeURI };