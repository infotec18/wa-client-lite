import WAWebJS from "whatsapp-web.js";
import { DBAutomaticMessage } from "../../types";
import WhatsappInstance from "../../whatsapp";
declare function buildResponse(automaticMessage: DBAutomaticMessage, instance: WhatsappInstance): (message: WAWebJS.Message) => Promise<void>;
export default buildResponse;
//# sourceMappingURL=index.d.ts.map