import WAWebJS, { MessageMedia } from "whatsapp-web.js";
import fs from "fs";
import path from "path";
import * as mime from "mime";
import { filesPath, formatToOpusAudio } from "../../utils";

async function sendMedia(message: WAWebJS.Message, filename: string, voice?: boolean, document?: boolean) {
    try {

        const searchFilePath = path.join(filesPath, "/auto-files", filename);

        const mimeType = mime.getType(searchFilePath);
        const file = fs.readFileSync(searchFilePath);

        if (mimeType && file) {
            if (voice) {
                const formatedFile = await formatToOpusAudio(file);
                const messageMedia = new MessageMedia("audio/mp3", formatedFile.toString("base64"), filename);

                await message.reply(messageMedia, undefined, { sendAudioAsVoice: true });
            } else {
                const messageMedia = new MessageMedia(mimeType, file.toString("base64"), filename);
                await message.reply(messageMedia, undefined, { sendMediaAsDocument: !!document });
            }
        }
    } catch (error) {
        console.error("Erro ao enviar media:", error);
    }
}

export default sendMedia;