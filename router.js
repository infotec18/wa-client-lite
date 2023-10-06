const { Router } = require("express");
const WhatsappInstances = require("./instances.js");
const path = require("path");
const fs = require("fs");
const multer = require('multer');
const { logWithDate } = require("./utils.js");

class AppRouter {
    router = Router();

    constructor() {
        const upload = multer();

        this.router.post("/messages/:from/:to", upload.single("file"), this.sendMessage);
        this.router.get("/files/:filename", this.getFile);
        this.router.get("", this.healthCheck);
        this.router.get("/clients", this.getClientStatus);
    }

    async sendMessage(req, res) {
        try {
            const { from, to } = req.params;
            const findInstance = WhatsappInstances.find(from);

            if (!findInstance) {
                return res.status(404).json({ message: "Whatsapp number isn't found " });
            }

            const { text, referenceId } = req.body;
            const file = req.file;

            if (file) {
                const sentMessageWithFile = await findInstance.sendFile({
                    file: file.buffer,
                    fileName: file.originalname,
                    mimeType: file.mimetype,
                    contact: to,
                    caption: text,
                    quotedMessageId: referenceId
                });

                res.status(201).json(sentMessageWithFile);
            } else {
                const sentMessage = await findInstance.sendText(to, text, referenceId);

                res.status(201).json(sentMessage);
            }

        } catch (err) {
            logWithDate("[router.js] Send message failure =>", err);
        }
    }

    async getFile(req, res) {
        try {
            const fileName = req.params.filename;
            const filesPath = path.join(__dirname, "/files");
            const searchFilePath = path.join(filesPath, fileName);

            if (!fs.existsSync(searchFilePath)) {
                res.status(404).json({ message: "File not found" });
            }

            const readStream = fs.createReadStream(searchFilePath);

            readStream.pipe(res);
            readStream.on('end', () => readStream.close());

            logWithDate("Get file success =>", fileName);
        } catch (err) {
            logWithDate("Get file failure =>", err);

            res.status(500).json({ message: "Something went wrong" });
        }
    }

    async healthCheck(req, res) {
        res.status(200).json({ online: true });
    }

    async getClientStatus(req, res) {
        try {
            const clientsStatus = [];

            for (const instance of WhatsappInstances.instances) {
                const instanceData = ({
                    number: instance.whatsappNumber,
                    auth: instance.isAuthenticated,
                    status: await instance.client.getState()
                });

                clientsStatus.push(instanceData)
            }

            logWithDate("Get clients statuses success!");
            res.status(200).json({ instances: clientsStatus });
        } catch (err) {
            logWithDate("Get clients statuses failure => ", err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }
}

module.exports = AppRouter;