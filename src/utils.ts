import { Connection, FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import WAWebJS, { MessageAck } from "whatsapp-web.js";
import { join } from "node:path";
import { access, readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { Router } from "express";

function isMessageFromNow(message: WAWebJS.Message) {
    const messageDate = new Date(Number(`${message.timestamp}000`));
    const currentDate = new Date();
    const TWO_MINUTES = 1000 * 60 * 2;
    const timeDifference = currentDate.getTime() - messageDate.getTime();

    return timeDifference <= TWO_MINUTES;
};

async function messageParser(message: WAWebJS.Message) {
    try {
        const quotedMessage = await message.getQuotedMessage();
        const ID_REFERENCIA = quotedMessage && quotedMessage.id._serialized;
        const ID = message.id._serialized;
        const TIPO = message.type;
        const MENSAGEM = message.body;
        const TIMESTAMP = Number(`${message.timestamp}000`);
        const FROM_ME = message.fromMe;

        const STATUS = MessageAck[message.ack];

        const serializedMessage = { ID, ID_REFERENCIA, TIPO, MENSAGEM, TIMESTAMP, FROM_ME, DATA_HORA: new Date(TIMESTAMP), STATUS }

        if (message.hasMedia) {
            const messageMedia = await message.downloadMedia();
            const mediaBuffer = Buffer.from(messageMedia.data, 'base64');
            const uuid = randomUUID();
            const ARQUIVO_NOME = `${uuid}_${messageMedia.filename}`;
            const ARQUIVO_NOME_ORIGINAL = messageMedia.filename || ARQUIVO_NOME;
            const ARQUIVO_TIPO = messageMedia.mimetype;

            const filesPath = join(__dirname, '/', 'files');
            const savePath = join(filesPath, ARQUIVO_NOME);

            await writeFile(savePath, mediaBuffer);
            await access(savePath);

            const serializedFile = {
                NOME_ARQUIVO: ARQUIVO_NOME,
                TIPO: ARQUIVO_TIPO,
                NOME_ORIGINAL: ARQUIVO_NOME_ORIGINAL,
                ARMAZENAMENTO: 'outros',
            }

            const parsedMessage = { ...serializedMessage, ARQUIVO: serializedFile }

            return parsedMessage;
        }

        return { ...serializedMessage, ARQUIVO: null }
    } catch (err: any) {
        logWithDate("Parse Message Failure =>", err);

        return null;
    }
}

function logWithDate(str: string, error?: any) {
    const dateSring = new Date().toLocaleString();

    if (error) {
        console.error(`${dateSring}: ${str}`, error);
    } else {
        console.log(`${dateSring}: ${str}`);
    }
}

function getAllEndpoints(router: Router, path: string) {
    const endpoints: Array<string> = [];

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

async function formatToOpusAudio(file: any) {
    try {
        const tempPath = join(__dirname, "temp");

        try {
            await access(tempPath);
        } catch {
            await mkdir(tempPath);
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
            ffmpeg.on('close', async (code: number) => {
                if (code === 0) {
                    const file = await readFile(savePath);
                    resolve(file);
                } else {
                    reject(`Erro ao converter para Opus, código de saída: ${code}`);
                }
            });

            ffmpeg.on('error', (err: any) => {
                reject(err);
            });
        });
    } catch (err) {
        throw err;
    }
}

function decodeSafeURI(uri: string) {
    try {
        return decodeURI(uri);
    } catch {
        return uri;
    }
}

function isUUID(str: string) {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(str);
}

async function getOrCreateContact(connection: Connection, number: string, name: string): Promise<number> {
    const SELECT_NUMBER_QUERY = "SELECT * FROM w_clientes_numeros WHERE NUMERO = ?"
    const [rows, fields]: [RowDataPacket[], FieldPacket[]] = await connection.execute(SELECT_NUMBER_QUERY, [number]);

    console.log("Rows", rows);
    console.log("Fields", fields);

    if (!rows[0]) {
        const INSERT_NUMBER_QUERY = "INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)";
        const [results, fields]: [ResultSetHeader[], FieldPacket[]] = await connection.execute(INSERT_NUMBER_QUERY, [-1, name, number]);

        console.log("Results", results);
        console.log("Fields", fields);
        return results[0].insertId;
    }

    return rows[0].CODIGO;
}

export { isMessageFromNow, messageParser, formatToOpusAudio, logWithDate, getAllEndpoints, isUUID, decodeSafeURI, getOrCreateContact };