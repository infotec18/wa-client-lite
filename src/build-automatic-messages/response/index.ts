import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../../types";
import WhatsappInstance from "../../whatsapp";
import sendContact from "./sendContact.attachment";
import sendLocation from "./sendLocation.attachment";
import sendMedia from "./sendMedia.attachment";

function buildResponse(automaticMessage: DBAutomaticMessage, instance: WhatsappInstance) {
    const haveText = automaticMessage.text?.length > 0;

    return async (message: WAWebJS.Message) => {
        try {
            haveText && await message.reply(automaticMessage.text);

            switch (automaticMessage.attachment_type) {
                case "contact":
                    sendContact(instance, message, automaticMessage.attachment);
                    break;
                case "voice":
                    sendMedia(message, automaticMessage.attachment);
                case "audio":
                    sendMedia(message, automaticMessage.attachment);
                    break;
                case "document":
                    sendMedia(message, automaticMessage.attachment, false, true);
                    break;
                case "image":
                    sendMedia(message, automaticMessage.attachment);
                    break;
                case "video":
                    sendMedia(message, automaticMessage.attachment);
                    break;
                case "location":
                    sendLocation(message, automaticMessage.attachment);
                    break;
            }
        } catch (err) {
            console.error("cb err", err)
        }
    }
}

export default buildResponse;