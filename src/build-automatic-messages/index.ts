import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../types";
import WhatsappInstance from "../whatsapp";
import checkCondition from "./conditions";
import sendMessage from "./response";

async function runAutoMessage(
    instance: WhatsappInstance,
    automaticMessage: DBAutomaticMessage,
    message: WAWebJS.Message,
    contact: string
) {
    if (!instance.autoMessageCounters.get(automaticMessage.id)) {
        instance.autoMessageCounters.set(automaticMessage.id, []);
    }

    const autoMessageCounts = instance.autoMessageCounters.get(automaticMessage.id);

    if (!autoMessageCounts?.find(c => c.number === contact)) {
        autoMessageCounts?.push({ number: contact, count: 0 });
    }

    const contactCount = autoMessageCounts?.find(c => c.number === contact);

    if (contactCount && automaticMessage.send_max_times > contactCount.count) {
        autoMessageCounts?.find(c => c.number === contact);
        const condition = checkCondition(automaticMessage.send_condition);

        condition && await sendMessage(automaticMessage, instance, message);
    }

}

export default runAutoMessage;