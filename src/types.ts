import WAWebJS from "whatsapp-web.js";

export interface SendFileOptions {
	contact: string;
	file: any;
	mimeType: string;
	fileName: string;
	caption?: string;
	quotedMessageId?: string;
	isAudio?: "true" | "false";
}

export interface ParsedMessageWithoutFile {
	id: string;
	reference_id?: string | null;
	type: WAWebJS.MessageTypes;
	text: string;
	timestamp: string;
	status: string;
	from: string;
	to: string;
}

export interface ParsedMessageWithFile extends ParsedMessageWithoutFile {
	fileName: string;
	fileOriginalname: string;
	fileMimetype: string;
}

export type ParsedMessage = ParsedMessageWithoutFile | ParsedMessageWithFile;

export interface SavedMessage extends ParsedMessageWithoutFile {
	alreadyProcessed: boolean;
	statusUpdated: boolean;
	inpulseId?: string;
	fileName?: string | null;
	fileOriginalname?: string | null;
	fileMimetype?: string | null;
}

export interface Attendance {
	CODIGO: number;
	ATIVO_RECEP: "ATIVO" | "RECEP";
	CODIGO_OPERADOR: number;
	CODIGO_OPERADOR_ANTERIOR: number;
	CODIGO_CLIENTE: number;
	CODIGO_NUMERO: number;
	CODIGO_CC: number;
	CONCLUIDO: boolean;
	DATA_INICIO: Date | null;
	DATA_FIM: Date | null;
	DATA_AGENDAMENTO: Date | null;
	AGUARDANDO_RETORNO: "SIM" | "NAO";
	URGENCIA_SUPERVISOR: "URGENTE" | "MUITO_ALTA" | "ALTA" | "MEDIA" | "NORMAL";
	URGENCIA_AGENDAMENTO: "MUITO_ALTA" | "ALTA" | "MEDIA" | "NORMAL";
	URGENCIA_OPERADOR: "ALTA" | "MEDIA" | "NORMAL";
	SETOR: number;
	TIPO: string;
	SETOR_VENDAS: number;
	AVATAR_URL: string;
}

export interface AttendanceWithContact extends Attendance {
	CONTATO_NUMERO: string;
}

export type AttachmentType = "contact" | "document" | "image" | "video" | "audio" | "voice" | "location" | null;
