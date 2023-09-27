import { config } from "dotenv";
import WhatsappClient from "./whatsapp.js";

config();

const { WHATSAPP_NUMBERS, REQUEST_URL } = process.env;

const whatsappNumbers = WHATSAPP_NUMBERS.split(" ");

class WhatsappInstances {
    static instances = whatsappNumbers.map((number, index) => {
        const clientId = `client-${index}`;

        return new WhatsappClient(clientId, number, REQUEST_URL);
    });

    static find(number) {
        return this.instances.find((i) => i.whatsappNumber == number);
    }
}

export default WhatsappInstances;
