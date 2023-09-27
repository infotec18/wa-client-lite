const { Router } = require("express");
const WhatsappInstances = require("./instances.js");
const path = require("path");
const fs = require("fs");

class AppRouter {
    router = Router();

    constructor() {
        this.router.post("/messages/:from/:to", this.sendMessage);
        this.router.get("files/:filename", this.getFile);
    }

    async sendMessage(req, res) {
        try {
            const [from, to] = req.params;
            const findInstance = WhatsappInstances.find(from);

            if (!findInstance) {
                return res.status(404).json({ message: "Whatsapp number isn't found " });
            }

            const [text, referenceId] = req.body;
            const file = "";

            if (file) {
                const sentMessageWithFile = await findInstance.sendFile({
                    file: file.buffer,
                    fileName: file.originalname,
                    mimeType: file.mimeType,
                    contact: to,
                    caption: text,
                    quotedMessageId: referenceId
                });

                return sentMessageWithFile;
            } else {
                const sentMessage = await findInstance.sendText(to, text, referenceId);

                return sentMessage;
            }

        } catch (err) {
            console.error("[router.js] Send message failure =>", err);
        }
    }

    async getFile(req, res) {
        try {
            const fileName = req.params.filename;
            const filesPath = path.join(__dirname, "/files");
            const searchFilePath = path.join(filesPath, fileName);
            const readStream = fs.createReadStream(searchFilePath);
            readStream.pipe(res);
            readStream.on('end', () => readStream.close());

            console.log("Get file success =>", fileName);
        } catch (err) {
            console.error("Get file failure =>", err);
        }
    }
}

module.exports = AppRouter;