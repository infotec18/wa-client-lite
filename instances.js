const { config } = require("dotenv");
const WhatsappClient = require("./whatsapp.js");

config();

const { WHATSAPP_NUMBERS, REQUEST_URL } = process.env;

const whatsappNumbers = WHATSAPP_NUMBERS.split(" ");

class WhatsappInstances {
    static instances = whatsappNumbers.map((str) => {
        const [clientName, wppNumber] = str.split("_");
        const requestURL = REQUEST_URL.replace(":clientName", clientName)
        return new WhatsappClient(clientName, str, wppNumber, requestURL);
    });

    static find(number) {
        return this.instances.find((i) => i.whatsappNumber == number);
    }
}

module.exports = WhatsappInstances;
