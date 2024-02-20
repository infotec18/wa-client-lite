import WhatsappInstance from "./whatsapp";
import "dotenv/config";
declare class WhatsappInstances {
    instances: Array<WhatsappInstance>;
    constructor();
    find(number: string): WhatsappInstance | undefined;
}
declare const instances: WhatsappInstances;
export default instances;
//# sourceMappingURL=instances.d.ts.map