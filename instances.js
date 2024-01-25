const { config } = require("dotenv");
const WhatsappClient = require("./whatsapp.js");

config();

const { WHATSAPP_NUMBERS, REQUEST_URL } = process.env;

try {
    const emptyNumbersEnvError = new Error("Missing 'WHATSAPP_NUMBERS' variable on .env");
    const emptyRequestURLEnvError = new Error("Missing 'REQUEST_URL' varialble on .env");

    if (!WHATSAPP_NUMBERS) throw emptyNumbersEnvError;
    if (!REQUEST_URL) throw emptyRequestURLEnvError;
} catch (err) {
    console.error(err.message);
    process.exit();
}

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
