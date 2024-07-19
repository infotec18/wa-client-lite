import WAWebJS from "whatsapp-web.js";
import WhatsappInstance from "../../whatsapp";

import { AutomaticMessage } from "@prisma/client";
import sendContact from "./sendContact.attachment";
import sendMedia from "./sendMedia.attachment";
import sendLocation from "./sendLocation.attachment";

async function sendResponse(am: AutomaticMessage, instance: WhatsappInstance, message: WAWebJS.Message) {
	const haveText = am.text?.length > 0;

	try {
		haveText && (await message.reply(am.text));

		if (am.attachment) {
			switch (am.attachmentType) {
				case "contact":
					sendContact(instance, message, am.attachment);
					break;
				case "voice":
					sendMedia(message, am.attachment);
				case "audio":
					sendMedia(message, am.attachment);
					break;
				case "document":
					sendMedia(message, am.attachment, false, true);
					break;
				case "image":
					sendMedia(message, am.attachment);
					break;
				case "video":
					sendMedia(message, am.attachment);
					break;
				case "location":
					sendLocation(message, am.attachment);
					break;
				default:
					break;
			}
		}
	} catch (err) {
		console.error("send auto response err =>", err);
	}
}

export default sendResponse;
