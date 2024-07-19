import axios from "axios";
import { ConnectionOptions, Pool, createPool } from "mysql2/promise";
import WAWebJS, { Client, LocalAuth } from "whatsapp-web.js";
import { formatToOpusAudio, getRetryDate, logWithDate, messageParser } from "./utils";
import { SendFileOptions } from "./types";
import loadAvatars from "./functions/loadAvatars";
import { schedule } from "node-cron";
import runAutoMessage from "./build-automatic-messages";
import { AutomaticMessage, Message } from "@prisma/client";
import prisma from "./prisma";

interface AMCounter {
	phone: string;
	count: number;
}

class WhatsappInstance {
	public readonly name;
	public readonly clientName: string;
	public readonly requestURL: string;
	public readonly client: Client;
	public readonly pool: Pool | null;
	public readonly automaticMessages;
	public readonly blockedNumbers;
	public readonly unsyncMessages;
	public isAuthenticated: boolean = false;
	public isReady: boolean = false;
	public connectionParams: ConnectionOptions | null;
	public autoMessageCounters: Map<string, Array<AMCounter>> = new Map();

	constructor(
		clientName: string,
		instanceName: string,
		requestURL: string,
		blockedNumbers: string[],
		automaticMessages: Array<AutomaticMessage>,
		unsyncMessages: Array<Message>,
		connection?: ConnectionOptions | null
	) {
		this.clientName = clientName;
		this.name = instanceName;
		this.requestURL = requestURL;
		this.connectionParams = connection || null;
		this.automaticMessages = automaticMessages;
		this.blockedNumbers = blockedNumbers;
		this.unsyncMessages = unsyncMessages;

		this.client = new Client({
			authStrategy: new LocalAuth({ clientId: `${clientName}_${instanceName}` }),
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
					"--disable-gpu"
				]
			}
		});

		schedule("30 7 * * *", async () => {
			try {
				await this.loadAvatars();
				logWithDate(`[${this.clientName} - ${this.name}] has been successfuly loaded avatars`);
			} catch (err: any) {
				logWithDate(`[${this.clientName} - ${this.name}] faild to load avatars: `, err?.message);
			}
		});

		schedule("*/20 * * * * *", async () => {
			try {
				logWithDate(`[${this.clientName} - ${this.name}] running sync messages routine...`);
				const currentDate = new Date(Date.now() + 30000);
				const currentMessages = this.unsyncMessages.filter((m) => m.nextSyncRetry && currentDate > m.nextSyncRetry);

				logWithDate(`[${this.clientName} - ${this.name}] ${currentMessages.length} messages to sync`);
				await this.syncMessages(currentMessages);
			} catch (err: any) {
				logWithDate(`[${this.clientName} - ${this.name}] failed to sync messages:`, err?.message);
			}
		});

		this.buildClient();
		this.initialize();

		this.pool = this.connectionParams ? createPool(this.connectionParams) : null;
	}

	private buildClient() {
		this.client.on("disconnected", async (reason) => {
			logWithDate("has been disconnected: ", reason);
		});

		this.client.on("qr", async (qr) => {
			try {
				await axios.post(`${this.requestURL}/qr/${this.name}`, { qr });
				logWithDate(`[${this.clientName} - ${this.name}] QR code has been successfully sent.`);
			} catch (err: any) {
				logWithDate(
					`[${this.clientName} - ${this.name}] failed to send QR code:`,
					err?.response ? err.response.status : err.request ? err.request._currentUrl : err
				);
			}
		});

		this.client.on("loading_screen", (percent, message) => {
			logWithDate(`[${this.clientName} - ${this.name}] loading ${message} ${percent}%`);
		});

		this.client.on("change_state", (state) => {
			logWithDate(`[${this.clientName} - ${this.name}] changed it state to: ${state}`);
		});

		this.client.on("authenticated", async () => {
			this.isAuthenticated = true;
			logWithDate(`[${this.clientName} - ${this.name}] has been authenticated.`);
		});

		this.client.on("ready", async () => {
			this.isReady = true;
			logWithDate(`[${this.clientName} - ${this.name}] is ready to work!`);
		});

		this.client.on("message", (message) => this.onMessage(message));
		this.client.on("message_edit", (message) => this.onMessageEdit(message));
		this.client.on("message_ack", (status) => this.onMessageStatus(status));
		this.client.on("call", (call) => console.log(call));
	}

	public async initialize() {
		await this.client.initialize().then(() => {
			logWithDate(`[${this.clientName} - ${this.name}] has been initialized.`);
		});
	}

	public async onMessage(message: WAWebJS.Message) {
		try {
			const allowedTypes: WAWebJS.MessageTypes[] = [
				WAWebJS.MessageTypes.TEXT,
				WAWebJS.MessageTypes.AUDIO,
				WAWebJS.MessageTypes.VOICE,
				WAWebJS.MessageTypes.IMAGE,
				WAWebJS.MessageTypes.VIDEO,
				WAWebJS.MessageTypes.DOCUMENT,
				WAWebJS.MessageTypes.STICKER,
				WAWebJS.MessageTypes.LOCATION,
				WAWebJS.MessageTypes.CONTACT_CARD,
				WAWebJS.MessageTypes.CONTACT_CARD_MULTI
			];

			const chat = await message.getChat();
			const contactNumber = chat.id.user;

			const isStatus = message.isStatus;
			const isBlackListedType = !allowedTypes.includes(message.type);
			const isBlackListedContact = this.blockedNumbers.includes(contactNumber);
			const isBlackListed = isBlackListedType || isBlackListedContact;

			for (const autoMessage of this.automaticMessages) {
				await runAutoMessage(this, autoMessage, message, contactNumber);
			}

			if (!chat.isGroup && !message.isStatus && !isBlackListed && !isStatus) {
				const { ...parsedMessage } = await messageParser(message, contactNumber, this.name);

				const savedMessage = await prisma.message.create({
					data: {
						...parsedMessage,
						isMessageSync: false,
						isStatusSync: false,
						from: contactNumber,
						to: this.name,
						instanceName: this.name
					}
				});

				await axios.post(`${this.requestURL}/receive_message/${this.name}/${contactNumber}`, parsedMessage);
				await prisma.message.update({
					where: {
						id: savedMessage.id
					},
					data: {
						isMessageSync: true,
						isStatusSync: true,
						lastSyncRetry: new Date()
					}
				});
				logWithDate(`[${this.clientName} - ${this.name}] received message: ${message.id._serialized}`);
			}
		} catch (err: any) {
			logWithDate(
				`[${this.clientName} - ${this.name}] failed to receive message:`,
				err.response ? err.response.status : err.request ? err.request._currentUrl : err?.message || err
			);

			const unsyncMessage = await prisma.message.update({
				where: {
					id: message.id._serialized
				},
				data: {
					nextSyncRetry: getRetryDate(new Date(), 0),
				}
			});

			unsyncMessage && this.unsyncMessages.push(unsyncMessage);
		}
	}

	public async onMessageEdit(message: WAWebJS.Message) {
		try {
			const TIMESTAMP = Number(`${message.timestamp}000`);

			const changes = {
				MENSAGEM: message.body,
				DATA_HORA: new Date(TIMESTAMP),
				TIMESTAMP
			};

			await axios.post(`${this.requestURL}/update_message/${message.id._serialized}`, changes);
			logWithDate(`[${this.clientName} - ${this.name}] Message edit success => ${message.id._serialized}`);
		} catch (err: any) {
			logWithDate(`[${this.clientName} - ${this.name}] Message edit failure => `, err);
		}
	}

	public async onMessageStatus(message: WAWebJS.Message) {
		try {
			const status = ["PENDING", "SENT", "RECEIVED", "READ", "PLAYED"][message.ack] || "ERROR";

			await axios.put(`${this.requestURL}/update_message/${message.id._serialized}`, { status });

			logWithDate(`[${this.clientName} - ${this.name}] Status success => ${status} ${message.id._serialized}`);
		} catch (err: any) {
			logWithDate(
				`[${this.clientName} - ${this.name}] Status failure =>`,
				err.response ? err.response.status : err.request ? err.request._currentUrl : err
			);
		}
	}

	public async loadMessages() {
		throw Error("Esta rotina está desativada temporariamente.");
		//return await loadMessages(this);
	}

	public async loadAvatars() {
		return await loadAvatars(this);
	}

	public async loadGroups() {
		try {
			const chats = await this.client.getChats();
			const groups = chats.filter((chat) => chat.isGroup);

			return groups;
		} catch (err) {
			throw err;
		}
	}

	public async sendText(contact: string, text: string, quotedMessageId?: string) {
		try {
			const numberId = await this.client.getNumberId(contact);
			const chatId = numberId && numberId._serialized;

			if (chatId) {
				const sentMessage = await this.client.sendMessage(chatId, text, { quotedMessageId });
				const parsedMessage = await messageParser(sentMessage, this.name, contact);

				await prisma.sentMessage.create({
					data: {
						...parsedMessage,
						isMessageSync: false,
						isStatusSync: false,
						instanceName: this.name
					}
				});

				logWithDate(`[${this.clientName} - ${this.name}] successfully sent text message: ${parsedMessage.id}`);

				return parsedMessage;
			}
		} catch (err: any) {
			logWithDate(`[${this.clientName} - ${this.name}] failed to send text message:`, err?.message);
		}
	}

	public async sendFile({ contact, file, mimeType, fileName, caption, quotedMessageId, isAudio }: SendFileOptions) {
		try {
			let formatedFile: unknown & any = file.toString("base64");

			if (isAudio === "true") {
				formatedFile = ((await formatToOpusAudio(file)) as any).toString("base64");
			}

			const chatId = `${contact}@c.us`;
			const media = new WAWebJS.MessageMedia(mimeType, formatedFile, fileName);
			const sentMessage = await this.client.sendMessage(chatId, media, {
				caption,
				quotedMessageId,
				sendAudioAsVoice: !!isAudio
			});
			const parsedMessage = await messageParser(sentMessage, this.name, contact);

			await prisma.sentMessage.create({
				data: {
					...parsedMessage,
					isMessageSync: false,
					isStatusSync: false,
					instanceName: this.name
				}
			});

			logWithDate(`[${this.clientName} - ${this.name}] successfully sent file message: ${parsedMessage.id}`);

			return parsedMessage;
		} catch (err: any) {
			logWithDate(`[${this.clientName} - ${this.name}] failed to send file message:`, err?.message);

			return null;
		}
	}

	public async getProfilePicture(number: string) {
		try {
			const pfpURL = await this.client.getProfilePicUrl(number + "@c.us");
			logWithDate(`[${this.clientName} - ${this.name}] successfully loaded avatar for: `, number);

			return pfpURL || null;
		} catch (err) {
			logWithDate(`[${this.clientName} - ${this.name}] failed to load avatar for: `, number);

			return null;
		}
	}

	public async getContactVars(number: string) {
		try {
			if (!this.pool) throw new Error("Connection not defined");

			const currentSaudation = () => {
				const currentTime = new Date();
				const hour = currentTime.getHours();

				if (hour >= 5 && hour < 12) {
					return "Bom dia";
				} else if (hour >= 12 && hour < 18) {
					return "Boa tarde";
				} else {
					return "Boa noite";
				}
			};

			const vars = {
				saudação_tempo: currentSaudation(),
				cliente_razao: "",
				cliente_cnpj: "",
				contato_primeiro_nome: "",
				contato_nome_completo: ""
			};

			const SELECT_QUERY = `
            SELECT 
                cli.RAZAO,
                cli.CPF_CNPJ,
                ct.NOME
            FROM w_clientes_numeros ct
            LEFT JOIN clientes cli ON cli.CODIGO = ct.CODIGO_CLIENTE
            WHERE ct.NUMERO = ?
            `;

			const [rows] = await this.pool.query(SELECT_QUERY, [number]);
			const findContact = (rows as Array<{ RAZAO: string; CNPJ: string; NOME: string }>)[0];

			vars.cliente_razao = findContact.RAZAO;
			vars.cliente_cnpj = findContact.CNPJ;
			vars.contato_primeiro_nome = findContact.NOME.split(" ")[0];
			vars.contato_nome_completo = findContact.NOME;

			return vars;
		} catch (err: any) {
			logWithDate(`[${this.clientName} - ${this.name}] failed to get contact variables: `, err?.message);
			throw err;
		}
	}

	public async validateNumber(number: string) {
		const isValid = await this.client.getNumberId(number);

		return !!isValid && isValid.user;
	}

	public async syncMessages(messages: Message[]) {
		const currentDate = new Date();
		for (const message of messages) {
			try {
				logWithDate(`trying to resync message: ${message.id}`);

				const inpulseMessage = await axios.post(`${this.requestURL}/receive_message/${this.name}/${message.from}`, message).then((res) => res.data);

				if (inpulseMessage) {
					await prisma.message.update({
						where: { id: message.id },
						data: {
							isMessageSync: true,
							lastSyncRetry: new Date(),
							nextSyncRetry: null
						}
					});

					logWithDate(`[${this.clientName} - ${this.name}] successfully resynced message: ${message.id}`);
				} else {
					throw new Error(inpulseMessage);
				}
			} catch (err: any) {
				const retryCount = message.syncRetryCount + 1;
				const retryDate = getRetryDate(currentDate, retryCount);
				const retryDelay = retryDate.getTime() - currentDate.getTime();

				await prisma.message.update({
					where: { id: message.id },
					data: {
						lastSyncRetry: new Date(),
						nextSyncRetry: retryDate,
						syncRetryCount: retryCount
					}
				});

				logWithDate(
					`[${this.clientName} - ${this.name}] failed to resync message: ${message.id}, retrying in ${retryDelay / 1000 / 60} minutes`,
					err.response ? err.response.data?.message || err?.message : err?.message
				);
			}
		}
	}
}

export default WhatsappInstance;
