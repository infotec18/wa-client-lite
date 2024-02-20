import { ConnectionOptions } from "mysql2/promise";
import WAWebJS, { Client } from "whatsapp-web.js";
import { SendFileOptions } from "./types";
declare class WhatsappInstance {
    readonly requestURL: string;
    readonly client: Client;
    readonly clientName: string;
    readonly whatsappNumber: string;
    isAuthenticated: boolean;
    isReady: boolean;
    connectionParams: ConnectionOptions;
    blockedNumbers: Array<string>;
    autoMessageCounters: Map<number, Array<{
        number: string;
        count: number;
    }>>;
    private readonly autoMessageCallbacks;
    constructor(clientName: string, whatsappNumber: string, requestURL: string, connection: ConnectionOptions);
    private buildClient;
    private buildBlockedNumbers;
    private buildAutomaticMessages;
    initialize(): Promise<void>;
    onReceiveMessage(message: WAWebJS.Message): Promise<void>;
    onReceiveMessageStatus(message: WAWebJS.Message): Promise<void>;
    loadMessages(): Promise<void>;
    sendText(contact: string, text: string, quotedMessageId?: string): Promise<{
        ARQUIVO: {
            NOME_ARQUIVO: string;
            TIPO: string;
            NOME_ORIGINAL: string;
            ARMAZENAMENTO: string;
        };
        ID: string;
        ID_REFERENCIA: string;
        TIPO: WAWebJS.MessageTypes;
        MENSAGEM: string;
        TIMESTAMP: number;
        FROM_ME: boolean;
        DATA_HORA: Date;
        STATUS: string;
    } | {
        ARQUIVO: null;
        ID: string;
        ID_REFERENCIA: string;
        TIPO: WAWebJS.MessageTypes;
        MENSAGEM: string;
        TIMESTAMP: number;
        FROM_ME: boolean;
        DATA_HORA: Date;
        STATUS: string;
    } | null | undefined>;
    sendFile({ contact, file, mimeType, fileName, caption, quotedMessageId, isAudio }: SendFileOptions): Promise<{
        ARQUIVO: {
            NOME_ARQUIVO: string;
            TIPO: string;
            NOME_ORIGINAL: string;
            ARMAZENAMENTO: string;
        };
        ID: string;
        ID_REFERENCIA: string;
        TIPO: WAWebJS.MessageTypes;
        MENSAGEM: string;
        TIMESTAMP: number;
        FROM_ME: boolean;
        DATA_HORA: Date;
        STATUS: string;
    } | {
        ARQUIVO: null;
        ID: string;
        ID_REFERENCIA: string;
        TIPO: WAWebJS.MessageTypes;
        MENSAGEM: string;
        TIMESTAMP: number;
        FROM_ME: boolean;
        DATA_HORA: Date;
        STATUS: string;
    } | null | undefined>;
    getProfilePicture(number: string): Promise<string | null>;
    validateNumber(number: string): Promise<string | false>;
}
export default WhatsappInstance;
//# sourceMappingURL=whatsapp.d.ts.map