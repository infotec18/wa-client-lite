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

export interface connectionProps {
    host: string;
    user: string;
    password: string;
    database: string;
}