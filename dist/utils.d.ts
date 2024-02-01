import { Connection } from "mysql2/promise";
import WAWebJS from "whatsapp-web.js";
import { Router } from "express";
declare function isMessageFromNow(message: WAWebJS.Message): boolean;
declare function messageParser(message: WAWebJS.Message): Promise<{
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
} | null>;
declare function logWithDate(str: string, error?: any): void;
declare function getAllEndpoints(router: Router, path: string): string[];
declare function formatToOpusAudio(file: any): Promise<unknown>;
declare function decodeSafeURI(uri: string): string;
declare function isUUID(str: string): boolean;
declare function getOrCreateContact(connection: Connection, number: string, name: string): Promise<number>;
export { isMessageFromNow, messageParser, formatToOpusAudio, logWithDate, getAllEndpoints, isUUID, decodeSafeURI, getOrCreateContact };
//# sourceMappingURL=utils.d.ts.map