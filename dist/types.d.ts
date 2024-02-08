export interface SendFileOptions {
    contact: string;
    file: any;
    mimeType: string;
    fileName: string;
    caption?: string;
    quotedMessageId?: string;
    isAudio?: "true" | "false";
}
export interface DBWhatsappInstance {
    readonly number: string;
    readonly client_name: string;
    readonly is_active: boolean;
    readonly created_at: string;
    readonly updated_at: string;
    readonly inactivated_at: string | null;
    readonly db_host: string;
    readonly db_port: number;
    readonly db_user: string;
    readonly db_pass: string;
    readonly db_name: string;
}
export interface DBAutomaticMessage {
    readonly id: number;
    readonly instance_number: string;
    readonly text: string;
    readonly attachment: string;
    readonly attachment_type: AttachmentType;
    readonly send_condition: string;
    readonly send_max_times: number;
}
export interface ParsedMessage {
    ID: string;
    ID_REFERENCIA?: string;
    TIPO: string;
    MENSAGEM: string;
    TIMESTAMP: number;
    FROM_ME: boolean;
    DATA_HORA: Date;
    STATUS: string;
    ARQUIVO: null | {
        NOME_ARQUIVO: string;
        TIPO: string;
        NOME_ORIGINAL: string;
        ARMAZENAMENTO: string;
    };
}
export type AttachmentType = "contact" | "document" | "image" | "video" | "audio" | "voice" | "location" | null;
//# sourceMappingURL=types.d.ts.map