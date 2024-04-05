import axios from "axios";
import { ConnectionOptions, FieldPacket, RowDataPacket, createConnection } from "mysql2/promise";
import WAWebJS, { Client, LocalAuth } from "whatsapp-web.js";
import { formatToOpusAudio, isMessageFromNow, logWithDate, messageParser } from "./utils";
import { DBAutomaticMessage, SendFileOptions } from "./types";
import buildAutomaticMessage from "./build-automatic-messages";
import getDBConnection from "./connection";
import loadMessages from "./functions/loadMessages";
import loadAvatars from "./functions/loadAvatars";
import { schedule } from "node-cron";

class WhatsappInstance {
    public readonly requestURL: string;
    public readonly client: Client;
    public readonly clientName: string;
    public readonly whatsappNumber;
    public isAuthenticated: boolean = false;
    public isReady: boolean = false;
    public connectionParams: ConnectionOptions;
    public blockedNumbers: Array<string> = [];
    public autoMessageCounters: Map<number, Array<{ number: string, count: number }>> = new Map();
    private readonly autoMessageCallbacks: Array<(message: WAWebJS.Message, contact: string) => void> = [];

    constructor(clientName: string, whatsappNumber: string, requestURL: string, connection: ConnectionOptions) {
        this.clientName = clientName;
        this.whatsappNumber = whatsappNumber;
        this.requestURL = requestURL;
        this.connectionParams = connection;

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
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html',
            }
        });

        schedule("30 7 * * *", async () => {
            try {
                await this.loadAvatars();
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Avatars loaded successfully.`);
            } catch (err: any) {
                logWithDate(`[${this.clientName} - ${this.whatsappNumber}] Avatars loading failure =>`, err);
            }
        });

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
        this.client.on("call", (call) => console.log(call));
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
            const blockedTypes = ["e2e_notification", "notification_template", "call_log", "gp2"];
            const fromNow = isMessageFromNow(message);
            const chat = await message.getChat();
            const contactNumber = chat.id.user;

            const isStatus = message.isStatus;
            const isBlackListedType = blockedTypes.includes(message.type);
            const isBlackListedContact = this.blockedNumbers.includes(contactNumber);
            const isBlackListed = isBlackListedType || isBlackListedContact;

            this.autoMessageCallbacks.forEach(cb => {
                cb(message, contactNumber);
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
            return await loadMessages(this);
        } catch (err) {
            throw err;
        }
    }

    public async loadAvatars() {
        try {
            return await loadAvatars(this);
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

            return pfpURL || null;
        } catch (err) {
            logWithDate("Get PFP URL err =>", err);
            return null;
        }
    }



    public async getContactVars(number: string) {
        try {
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
            }

            const vars = {
                "saudação_tempo": currentSaudation(),
                "cliente_razao": "",
                "cliente_cnpj": "",
                "contato_primeiro_nome": "",
                "contato_nome_completo": ""
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

            const connection = await createConnection(this.connectionParams)

            const [rows] = await connection.execute(SELECT_QUERY, [number]);
            const findContact = (rows as Array<{ RAZAO: string, CNPJ: string, NOME: string }>)[0];

            vars.cliente_razao = findContact.RAZAO;
            vars.cliente_cnpj = findContact.CNPJ;
            vars.contato_primeiro_nome = findContact.NOME.split(" ")[0];
            vars.contato_nome_completo = findContact.NOME;

            return vars;
        } catch (err) {
            logWithDate("Get Contact vars err =>", err);
            throw err;
        }
    }

    public async validateNumber(number: string) {
        const isValid = await this.client.getNumberId(number);

        return !!isValid && isValid.user;
    }
}

export default WhatsappInstance;