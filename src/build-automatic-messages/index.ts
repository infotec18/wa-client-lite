import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../types";
import WhatsappInstance from "../whatsapp";
import buildCondition from "./conditions";
import buildResponse from "./response";

function buildAutomaticMessage(
    instance: WhatsappInstance,
    automaticMessage: DBAutomaticMessage
): (message: WAWebJS.Message) => void {

    const execute = (message: WAWebJS.Message) => {
        console.log(message);
        const callback = buildResponse(automaticMessage, instance);
        const condition = buildCondition(automaticMessage.send_condition, message, callback);

        condition();
    }

    return execute;
}

export default buildAutomaticMessage;