import { Connection, FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import WAWebJS from "whatsapp-web.js";
import { join, dirname } from "node:path";
import { access, readFile, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { Router } from "express";
import { config } from "dotenv";
import { extension } from "mime-types";
import { ParsedMessage } from "./types";
config();

const filesPath = process.env.FILES_DIRECTORY!;

function isMessageFromNow(message: WAWebJS.Message) {
	const messageDate = new Date(Number(`${message.timestamp}000`));
	const currentDate = new Date();
	const TWO_MINUTES = 1000 * 60 * 2;
	const timeDifference = currentDate.getTime() - messageDate.getTime();

	return timeDifference <= TWO_MINUTES;
}

async function messageParser(message: WAWebJS.Message, from: string, to: string): Promise<ParsedMessage> {
	const parsedMessage = {
		id: message.id._serialized,
		referenceId: (await message.getQuotedMessage())?.id?._serialized || null,
		type: message.type,
		text: message.body,
		timestamp: `${message.timestamp}000`,
		status: ["PENDING", "SENT", "RECEIVED", "READ", "PLAYED"][message.ack] || "ERROR",
		from,
		to
	};

	if (message.hasMedia) {
		const messageMedia = await message.downloadMedia();
		const isAudio: boolean = messageMedia.mimetype.includes("audio");
		let mediaBuffer: Buffer = Buffer.from(messageMedia.data, "base64");

		if (isAudio) {
			mediaBuffer = await formatToOpusAudio(mediaBuffer);
		}

		const uuid = randomUUID();
		const ext = isAudio ? "mp3" : extension(messageMedia.mimetype) || "dat";

		const parsedFile = {
			fileName: messageMedia.filename ? `${uuid}_${messageMedia.filename}` : `${uuid}_unamed.${ext}`,
			fileOriginalname: messageMedia.filename || `unamed.${ext}`,
			fileMimetype: messageMedia.mimetype
		};

		const savePath = join(filesPath, "/media", parsedFile.fileName);
		await writeFile(savePath, mediaBuffer);
		await access(savePath);

		return { ...parsedMessage, ...parsedFile };
	}

	return parsedMessage;
}

function logWithDate(str: string, error?: any) {
	const dateSring = new Date().toLocaleString();

	if (error) {
		console.error(`${dateSring}: ${str}`, error);
	} else {
		console.log(`${dateSring}: ${str}`);
	}
}

async function toJsonLog(name: string, logData: any) {
	const logFilePath = join(__dirname, "logs", `${name}.json`);

	await mkdir(dirname(logFilePath), { recursive: true });
	await writeFile(logFilePath, JSON.stringify(logData, null, 2));
}

function getAllEndpoints(router: Router, path: string) {
	const endpoints: Array<string> = [];

	if (router && router.stack) {
		router.stack.forEach((layer) => {
			if (layer.route) {
				const subPath = layer.route.path;
				const methods = Object.keys((layer.route as any).methods);

				methods.forEach((method) => {
					endpoints.push(`${method.toUpperCase().padEnd(6, " ")} ${path}${subPath}`);
				});
			}
		});
	}

	return endpoints;
}

async function formatToOpusAudio(file: Buffer): Promise<Buffer> {
	try {
		const tempPath = join(filesPath, "temp");

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

		const ffmpeg = spawn("ffmpeg", ["-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "128k", savePath]);

		readableStream.pipe(ffmpeg.stdin);

		return new Promise((resolve, reject) => {
			ffmpeg.on("close", async (code: number) => {
				if (code === 0) {
					const file = await readFile(savePath);
					resolve(file);
				} else {
					reject(`Erro ao converter para Opus, código de saída: ${code}`);
				}
			});

			ffmpeg.on("error", (err: any) => {
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
	const SELECT_NUMBER_QUERY = "SELECT * FROM w_clientes_numeros WHERE NUMERO = ?";
	const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(SELECT_NUMBER_QUERY, [number]);

	if (!rows[0]) {
		const INSERT_NUMBER_QUERY = "INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)";
		const [result]: [ResultSetHeader, FieldPacket[]] = await connection.execute(INSERT_NUMBER_QUERY, [-1, name, number]);

		return result.insertId;
	}

	return rows[0].CODIGO;
}

function getRetryDate(currentDate: Date, retryCount: number) {
	const delay = Math.min(Math.pow(2, retryCount) * 30 * 1000, 3 * 60 * 60 * 1000);

	return new Date(currentDate.getTime() + delay);
}

export {
	isMessageFromNow,
	messageParser,
	formatToOpusAudio,
	logWithDate,
	getAllEndpoints,
	isUUID,
	decodeSafeURI,
	getOrCreateContact,
	filesPath,
	toJsonLog,
	getRetryDate
};
