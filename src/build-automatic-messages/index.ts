import WAWebJS from "whatsapp-web.js";
import WhatsappInstance from "../whatsapp";
import checkCondition from "./conditions";
import sendMessage from "./response";
import { AutomaticMessage } from "@prisma/client";

async function runAutoMessage(
    instance: WhatsappInstance,
    am: AutomaticMessage,
    message: WAWebJS.Message,
    contact: string
) {
    if (!instance.autoMessageCounters.get(am.id)) {
        instance.autoMessageCounters.set(am.id, []);
    }

    const autoMessageCounts = instance.autoMessageCounters.get(am.id);

    if (!autoMessageCounts?.find(c => c.phone === contact)) {
        autoMessageCounts?.push({ phone: contact, count: 0 });
    }

    const contactCount = autoMessageCounts?.find(c => c.phone === contact);

    if (contactCount && am.sendLimit > contactCount.count) {
        autoMessageCounts?.find(c => c.phone === contact);
        const condition = checkCondition(am.sendCondition);

        condition && await sendMessage(am, instance, message);
    }
}

export default runAutoMessage;