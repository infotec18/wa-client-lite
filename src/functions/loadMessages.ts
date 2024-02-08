import { FieldPacket, ResultSetHeader } from "mysql2";
import { Connection, createConnection } from "mysql2/promise";
import { logWithDate, messageParser } from "../utils"
import WhatsappInstance from "../whatsapp";
import getNumberErpId from "./getNumberErpId";
import WAWebJS from "whatsapp-web.js";
import { ParsedMessage } from "../types";

async function loadMessages(instance: WhatsappInstance) {
    try {
        const connection = await createConnection(instance.connectionParams);
        const chats = (await instance.client.getChats()).filter((c) => !c.isGroup);

        for (let i = 0; i < chats.length; i++) {
            try {
                await processChat(connection, instance, chats, i);
            } catch (err) {
                logWithDate(`Failed to load contact messages for ${chats[i].id.user} =>`, err);
            }
        }
    } catch (err: any) {
        logWithDate("Load Messages Error =>", err)
    }
}

async function processChat(connection: any, instance: WhatsappInstance, chats: WAWebJS.Chat[], index: number) {
    const chat = chats[index];
    const contact = await instance.client.getContactById(chat.id._serialized);
    logWithDate(`[${index + 1}/${chats.length}] Loading Contact Messages: ${chat.id.user}...`);

    if (contact && connection) {
        await processContactMessages(connection, chat, contact);
    }
}

async function processContactMessages(connection: Connection, chat: WAWebJS.Chat, contact: WAWebJS.Contact) {
    try {
        const CODIGO_NUMERO = await getNumberErpId(connection, contact.id.user, contact.name);
        const blocked_types = ["e2e_notification", "notification_template", "call_log", "gp2"];
        const messages = (await chat.fetchMessages({})).filter(m => !blocked_types.includes(m.type));

        logWithDate(`Parsing ${messages.length} messages...`);

        const parsedMessages = await parseMessages(messages, CODIGO_NUMERO);

        for (const message of parsedMessages.filter(m => !!m)) {
            if (message) {
                await saveMessage(connection, message);
            }
        }
    } catch (err) {
        logWithDate(`Failed to insert messages for ${contact.id.user} =>`, err);
    }
}

async function parseMessages(messages: Array<WAWebJS.Message>, numberErpId: number) {
    return Promise.all(messages.map(async (m) => {
        try {
            const parsedMessage = await messageParser(m);

            return parsedMessage ? { ...parsedMessage, MENSAGEM: encodeURI(parsedMessage.MENSAGEM), CODIGO_NUMERO: numberErpId } : undefined;
        } catch (err) {
            console.error(`Failed to parse message ${m.id._serialized} =>`, err);

            return undefined;
        }
    }));
}

async function saveMessage(connection: any, message: ParsedMessage & { CODIGO_NUMERO: number }) {
    try {
        if (message) {
            const { CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS } = message;

            const INSERT_MESSAGE_QUERY = "INSERT INTO w_mensagens (CODIGO_OPERADOR, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            const [results]: [ResultSetHeader, FieldPacket[]] = await connection.execute(
                INSERT_MESSAGE_QUERY,
                [0, CODIGO_NUMERO, TIPO, MENSAGEM, FROM_ME, DATA_HORA, TIMESTAMP, ID, ID_REFERENCIA || null, STATUS]
            );

            const insertId = results.insertId;

            if (insertId && message.ARQUIVO) {
                const { NOME_ARQUIVO, TIPO, NOME_ORIGINAL, ARMAZENAMENTO } = message.ARQUIVO;
                const INSERT_FILE_QUERY = "INSERT INTO w_mensagens_arquivos (CODIGO_MENSAGEM, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO) VALUES (?, ?, ?, ?, ?)";
                await connection.execute(INSERT_FILE_QUERY, [insertId, TIPO, NOME_ARQUIVO, NOME_ORIGINAL, ARMAZENAMENTO]);
            }
        }
    } catch (err) {
        logWithDate(`Failed to save message id ${message?.ID} =>`, err);
    }
}

export default loadMessages;