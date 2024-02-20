import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../types";
import WhatsappInstance from "../whatsapp";
import buildCondition from "./conditions";
import buildResponse from "./response";

function buildAutomaticMessage(
    instance: WhatsappInstance,
    automaticMessage: DBAutomaticMessage
): (message: WAWebJS.Message, contact: string) => void {

    const execute = (message: WAWebJS.Message, contact: string) => {
        const callback = buildResponse(automaticMessage, instance);
        const condition = buildCondition(automaticMessage.send_condition, message, callback);

        if (!instance.autoMessageCounters.get(automaticMessage.id)) {
            instance.autoMessageCounters.set(automaticMessage.id, []);
        }

        const autoMessageCounts = instance.autoMessageCounters.get(automaticMessage.id);

        if (!autoMessageCounts?.find(c => c.number === contact)) {
            autoMessageCounts?.push({ number: contact, count: 0 });
        }

        const contactCount = autoMessageCounts?.find(c => c.number === contact);

        if (contactCount?.count && automaticMessage.send_max_times > contactCount.count) {
            autoMessageCounts?.find(c => c.number === contact);
            condition();
        }
    }

    return execute;
}

export default buildAutomaticMessage;