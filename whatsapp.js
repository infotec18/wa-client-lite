const WAWebJS = require("whatsapp-web.js");
const { messageParser, logWithDate, formatToOpusAudio, isMessageFromNow } = require("./utils.js");
const axios = require("axios");

class WhatsappClient {
    clientName = "";
    isAuthenticated = false;
    isReady = false;
    whatsappNumber = null;
    requestURL = "";

    constructor(clientName, clientId, whatsappNumber, requestURL) {
        this.clientName = clientName;
        this.whatsappNumber = whatsappNumber;

        this.requestURL = requestURL;
        this.buildClient(clientId, whatsappNumber);
        this.initialize();
    }

    buildClient(clientId) {
        this.client = new WAWebJS.Client({
            authStrategy: new WAWebJS.LocalAuth({ clientId }),
            puppeteer: {
                headless: true,
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

        this.client.on("qr", async (qr) => {
            try {
                await axios.post(`${this.requestURL}/qr/${this.whatsappNumber}`, { qr });
                logWithDate(`[${this.whatsappNumber}] QR success => ${qr.slice(0, 30)}...`);
            } catch (err) {
                logWithDate(`[${this.whatsappNumber}] QR failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("loading_screen", (p, message) => {
            logWithDate(`[${this.whatsappNumber}] Loading => ${message} | ${percent}`);
        });

        this.client.on("change_state", (state) => {
            logWithDate(`[${this.whatsappNumber}] Chage state => ${state}`);
        });

        this.client.on("authenticated", async () => {
            try {
                await axios.post(`${this.requestURL}/auth/${this.whatsappNumber}`, {});
                this.isAuthenticated = true;
                logWithDate(`[${this.whatsappNumber}] Auth success!`);
            } catch (err) {
                logWithDate(`[${this.whatsappNumber}] Auth failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("ready", async () => {
            try {
                await axios.put(`${this.requestURL}/ready/${this.whatsappNumber}`);
                this.isR = true;
                logWithDate(`[${this.whatsappNumber}] Ready success!`);
            } catch (err) {
                logWithDate(`[${this.whatsappNumber}] Ready failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
            }
        });

        this.client.on("message", (message) => this.onReceiveMessage(message));
        this.client.on("message_ack", (status) => this.onReceiveMessageStatus(status));
    }

    async initialize() {
        try {
            await axios.put(`${this.requestURL}/init/${this.whatsappNumber}`);
            logWithDate(`[${this.whatsappNumber}] Init success!`);
        } catch (err) {
            logWithDate(`[${this.whatsappNumber}] Init failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        } finally {
            await this.client.initialize();
        }
    }

    async onReceiveMessage(message) {
        try {
            const typesBlackList = ["e2e_notification", "notification_template", "call_log"];
            const numbersBlackList = [];

            const chat = await message.getChat();
            const messageFromNow = isMessageFromNow(message);
            const contactNumber = chat.id.user;

            const isBlackListedType = typesBlackList.includes(message.type);
            const isBlackListedContact = numbersBlackList.includes(contactNumber);
            const isBlackListed = isBlackListedType || isBlackListedContact;

            if (!chat.isGroup && messageFromNow && !message.isStatus && !isBlackListed) {
                const parsedMessage = await messageParser(message);

                await axios.post(`${this.requestURL}/receive_message/${this.whatsappNumber}/${contactNumber}`, parsedMessage);
                logWithDate(`[${this.whatsappNumber}] Message success => ${message.id._serialized}`);
            }
        } catch (err) {
            logWithDate(`[${this.whatsappNumber}] Message failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        }
    }

    async onReceiveMessageStatus(message) {
        try {
            const statuses = ["UNKNOWN_0", "PENDING", "RECEIVED", "READ", "UNKNOWN_4", "UNKNOWN_5"];
            const status = statuses[message.ack];
            await axios.put(`${this.requestURL}/update_message/${message.id._serialized}`, { status });
            logWithDate(`[${this.whatsappNumber}] Status success => ${status} ${message.id._serialized}`);
        } catch (err) {
            logWithDate(`[${this.whatsappNumber}] Status failure =>`, err.response ? err.response.status : err.request ? err.request._currentUrl : err);
        }
    }

    async sendText(contact, text, quotedMessageId) {
        try {
            const numberId = await this.client.getNumberId(contact);
            const chatId = numberId && numberId._serialized;

            console.log(numberId, chatId);

            const sentMessage = await this.client.sendMessage(chatId, text, { quotedMessageId });
            const parsedMessage = await messageParser(sentMessage);

            logWithDate(`[${this.whatsappNumber}] Send text success => ${parsedMessage.ID}`);

            return parsedMessage;
        } catch (err) {
            console.error(err)
            logWithDate(`[${this.whatsappNumber}] Send text failure =>`, err);
        }
    }

    async sendFile({ contact, file, mimeType, fileName, caption, quotedMessageId, isAudio }) {
        try {
            let formatedFile = file.toString("base64");

            console.log(typeof isAudio, isAudio);

            if (isAudio === "true") {
                formatedFile = (await formatToOpusAudio(file)).toString("base64");
            }

            const chatId = `${contact}@c.us`;
            const media = new WAWebJS.MessageMedia(mimeType, formatedFile, fileName);
            const sentMessage = await this.client.sendMessage(chatId, media, { caption, quotedMessageId, sendAudioAsVoice: !!isAudio });
            const parsedMessage = await messageParser(sentMessage);

            logWithDate(`[${this.whatsappNumber}] Send file success => ${parsedMessage.ID}`);

            return parsedMessage;
        } catch (err) {
            logWithDate(`[${this.whatsappNumber}] Send file failure  =>`, err);
        }
    }

    async getProfilePicture(number) {
        try {
            const pfpURL = await this.client.getProfilePicUrl(number + "@c.us");

            console.log(pfpURL);
            logWithDate("Get PFP URL Success!");
            return pfpURL
        } catch (err) {
            logWithDate("Get PFP URL err =>", err);
            return null;
        }
    }

    async validateNumber(number) {
        const isValid = await this.client.isRegisteredUser(`${number}@c.us`);

        if (isValid) {
            const chatId = await this.client.getNumberId(number);

            return chatId.user;
        }

        return isValid;
    }
}

module.exports = WhatsappClient;