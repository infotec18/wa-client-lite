import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../types";
import WhatsappInstance from "../whatsapp";
declare function buildAutomaticMessage(instance: WhatsappInstance, automaticMessage: DBAutomaticMessage): (message: WAWebJS.Message) => void;
export default buildAutomaticMessage;
//# sourceMappingURL=index.d.ts.map