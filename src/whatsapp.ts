import axios from "axios";
import { Connection, ConnectionOptions, FieldPacket, ResultSetHeader, RowDataPacket, createConnection } from "mysql2/promise";
import WAWebJS, { Client, LocalAuth } from "whatsapp-web.js";
import { formatToOpusAudio, isMessageFromNow, logWithDate, messageParser } from "./utils";
import { DBAutomaticMessage, SendFileOptions } from "./types";
import buildAutomaticMessage from "./build-automatic-messages";
import getDBConnection from "./connection";

class WhatsappInstance {
    public readonly requestURL: string;
    public readonly client: Client;
    public readonly clientName: string;
    public readonly whatsappNumber;
    public isAuthenticated: boolean = false;
    public isReady: boolean = false;
    public connection: Connection | null = null;
    public blockedNumbers: Array<string> = [];
    public autoMessageCounter: Map<string, Record<number, number>> = new Map();
    private readonly autoMessageCallbacks: Array<(message: WAWebJS.Message) => void> = [];

    constructor(clientName: string, whatsappNumber: string, requestURL: string, connection: ConnectionOptions) {
        this.clientName = clientName;
        this.whatsappNumber = whatsappNumber;
        this.requestURL = requestURL;

        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: `${clientName}_${whatsappNumber}` }),
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

        createConnection(connection)
            .then(async (res) => { this.connection = res })
            .catch((err) => logWithDate(`No connection for instance ${this.clientName}_${this.whatsappNumber}`, err));


        this.buildBlockedNumbers();
        this.buildAutomaticMessages();
        this.buildClient();
        this.initialize();
    }

    private buildClient() {
        this.client.on("qr", async (qr) => {
            try {
                await axios.post(`${this.requestURL}/qr/${this.whatsappNumber}`, { qr });
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] QR success => ${qr.slice(0, 30)}...`);
            } catch (err: any) {
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] QR failure =>`, err?.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("loading_screen", (percent, message) => {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Loading => ${message} ${percent}%`);
        });

        this.client.on("change_state", (state) => {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Chage state => ${state}`);
        });

        this.client.on("authenticated", async () => {
            try {
                await axios.post(`${this.requestURL}/auth/${this.whatsappNumber}`, {});
                this.isAuthenticated = true;
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Auth success!`);
            } catch (err: any) {
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Auth failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("ready", async () => {
            try {
                await axios.put(`${this.requestURL}/ready/${this.whatsappNumber}`);
                this.isReady = true;
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Ready success!`);
            } catch (err: any) {
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Ready failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("message", (message) => this.onReceiveMessage(message));
        this.client.on("message_ack", (status) => this.onReceiveMessageStatus(status));
    }

    private async buildBlockedNumbers() {
        const connection = await getDBConnection();

        const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(`SELECT * FROM blocked_numbers WHERE instance_number = ?`, [this.whatsappNumber]);
        this.blockedNumbers = rows.map((r) => r.blocked_number);

        connection.end();
        connection.destroy();
    }

    private async buildAutomaticMessages() {
        const connection = await getDBConnection();

        const SELECT_BOTS_QUERY = "SELECT * FROM automatic_messages WHERE instance_number = ?";
        const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(SELECT_BOTS_QUERY, [this.whatsappNumber]);
        const autoMessages = rows as DBAutomaticMessage[];

        autoMessages.forEach(am => {
            const callback = buildAutomaticMessage(this, am);
            this.autoMessageCallbacks.push(callback);
        })

        connection.end();
        connection.destroy();
    }

    public async initialize() {
        try {
            await axios.put(`${this.requestURL}/init/${this.whatsappNumber}`);
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Init success!`);
        } catch (err: any) {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Init failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        } finally {
            await this.client.initialize();
        }
    }

    public async onReceiveMessage(message: WAWebJS.Message) {
        try {
            const blockedTypes = ["e2e_notification", "notification_template", "call_log"];
            const fromNow = isMessageFromNow(message);
            const chat = await message.getChat();
            const contactNumber = chat.id.user;

            const isStatus = message.isStatus;
            const isBlackListedType = blockedTypes.includes(message.type);
            const isBlackListedContact = this.blockedNumbers.includes(contactNumber);
            const isBlackListed = isBlackListedType || isBlackListedContact;

            this.autoMessageCallbacks.forEach(cb => {
                cb(message);
            });

            if (!chat.isGroup && fromNow && !message.isStatus && !isBlackListed && !isStatus) {
                const parsedMessage = await messageParser(message);

                await axios.post(`${this.requestURL}/receive_message/${this.whatsappNumber}/${contactNumber}`, parsedMessage);
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Message success => ${message.id._serialized}`);
            }
        } catch (err: any) {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Message failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        }
    }

    public async onReceiveMessageStatus(message: WAWebJS.Message) {
        try {
            const status = ["PENDING", "SENT", "RECEIVED", "READ", "PLAYED"][message.ack] || "ERROR";

            await axios.put(`${this.requestURL}/update_message/${message.id._serialized}`, { status });
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Status success => ${status} ${message.id._serialized}`);

        } catch (err: any) {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Status failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        }
    }


    public async loadMessages() {
        try {
            const chats = (await this.client.getChats()).filter((c) => !c.isGroup);

            for (const chat of chats) {
                const contact = await this.client.getContactById(chat.id._serialized);

                if (contact && this.connection) {
                    const getCodigoNumero = async (connection: Connection) => {
                        const SELECT_CONTACT_QUERY = `SELECT * FROM w_clientes_numeros WHERE NUMERO = ?`;
                        const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(SELECT_CONTACT_QUERY, [chat.id.user]);

                        if (!rows[0]) {
                            const INSERT_CONTACT_QUERY = `INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)`;
                            const [result]: [ResultSetHeader, FieldPacket[]] = await connection.execute(
                                INSERT_CONTACT_QUERY,
                                [-1, contact.name?.slice(0, 30) || contact.number, contact.number]
                            )
                            return result.insertId;
                        }
                        const CODIGO_NUMERO = (rows[0] as { CODIGO: number }).CODIGO;

                        return CODIGO_NUMERO;
                    }

                    const CODIGO_NUMERO = await getCodigoNumero(this.connection)
                    const messages = await chat.fetchMessages({});

                    const parsedMessases = await Promise.all(messages.map(async (m) => {
                        const parsedMessage = await messageParser(m);

                        if (parsedMessage) {
                            return { ...parsedMessage, MENSAGEM: encodeURI(parsedMessage.MENSAGEM), CODIGO_NUMERO }
                        } else {
                            return false;
                        }
                    }));

                    for (const message of parsedMessases) {
                        if (message) {
                            const { CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS } = message;

                            const INSERT_MESSAGE_QUERY = "INSERT INTO w_mensagens (CODIGO_OPERADOR, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            const [results]: [ResultSetHeader, FieldPacket[]] = await this.connection.execute(
                                INSERT_MESSAGE_QUERY,
                                [0, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA || null, STATUS]
                            );

                            const insertId = results.insertId;

                            if (insertId && message.ARQUIVO) {
                                const { NOME_ARQUIVO, TIPO, NOME_ORIGINAL, ARMAZENAMENTO } = message.ARQUIVO;
                                const INSERT_FILE_QUERY = "INSERT INTO w_mensagens_arquivos (CODIGO_MENSAGEM, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO) VALUES (?, ?, ?, ?, ?)";
                                await this.connection.execute(INSERT_FILE_QUERY, [insertId, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO]);
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            logWithDate("Load Messages Error =>", err)
        }
    }


    public async sendText(contact: string, text: string, quotedMessageId?: string) {
        try {
            const numberId = await this.client.getNumberId(contact);
            const chatId = numberId && numberId._serialized;

            if (chatId) {
                const sentMessage = await this.client.sendMessage(chatId, text, { quotedMessageId });
                const parsedMessage = await messageParser(sentMessage);

                if (parsedMessage) {
                    logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Send text success => ${parsedMessage.ID}`);
                }

                return parsedMessage;
            }

        } catch (err) {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Send text failure =>`, err);
        }
    }

    public async sendFile({ contact, file, mimeType, fileName, caption, quotedMessageId, isAudio }: SendFileOptions) {
        try {
            let formatedFile: unknown & any = file.toString("base64");

            if (isAudio === "true") {
                formatedFile = (await formatToOpusAudio(file) as any).toString("base64");
            }

            const chatId = `${contact}@c.us`;
            const media = new WAWebJS.MessageMedia(mimeType, formatedFile, fileName);
            const sentMessage = await this.client.sendMessage(chatId, media, { caption, quotedMessageId, sendAudioAsVoice: !!isAudio });
            const parsedMessage = await messageParser(sentMessage);

            if (parsedMessage) {
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Send file success => ${parsedMessage.ID}`);
            }

            return parsedMessage;
        } catch (err) {
            logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Send file failure  =>`, err);
        }
    }

    public async getProfilePicture(number: string) {
        try {
            const pfpURL = await this.client.getProfilePicUrl(number + "@c.us");
            logWithDate("Get PFP URL Success!");

            return pfpURL
        } catch (err) {
            logWithDate("Get PFP URL err =>", err);
            return null;
        }
    }

    public async validateNumber(number: string) {
        const isValid = await this.client.getNumberId(number);

        return !!isValid && isValid.user;
    }
}

export default WhatsappInstance;