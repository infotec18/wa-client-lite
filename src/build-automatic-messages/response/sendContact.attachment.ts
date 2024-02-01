import WAWebJS from "whatsapp-web.js";
import WhatsappInstance from "../../whatsapp";

async function sendContact(instance: WhatsappInstance, message: WAWebJS.Message, number: string) {
    try {

        const numberId = await instance.client.getNumberId(number);

        console.log(numberId)

        if (numberId) {
            const contact = await instance.client.getContactById(numberId?._serialized);
            contact && await message.reply(contact);
        }
    } catch (err) {
        console.error(err);
    }
}

export default sendContact;