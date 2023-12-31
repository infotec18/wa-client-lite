const { Router } = require("express");
const WhatsappInstances = require("./instances.js");
const path = require("path");
const fs = require("fs");
const multer = require('multer');
const { logWithDate } = require("./utils.js");
const { randomUUID } = require("crypto");
const mime = require('mime');
const { default: axios } = require("axios");

class AppRouter {
    router = Router();

    constructor() {
        const upload = multer();

        this.router.post("/messages/:from/:to", upload.single("file"), this.sendMessage);
        this.router.post("/files", upload.single("file"), this.uploadFile);
        this.router.post("/mass-message/:from", upload.single("file"), this.sendMassMessages)
        this.router.get("/files/:filename", this.getFile);
        this.router.get("/avatars/:from/:to", this.getProfilePic);
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

            const { text, referenceId, filename } = req.body;
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
            } else if (filename) {
                const filePath = path.join(__dirname, './files', filename)
                const localfile = fs.readFileSync(filePath);
                const mimeType = mime.getType(filePath);

                const sentMessageWithFile = await findInstance.sendFile({
                    file: localfile,
                    fileName: filename,
                    mimeType: mimeType,
                    contact: to,
                    caption: text,
                    quotedMessageId: null
                })

                res.status(201).json(sentMessageWithFile);
            } else {
                const sentMessage = await findInstance.sendText(to, text, referenceId);

                res.status(201).json(sentMessage);
            }

        } catch (err) {
            logWithDate("[router.js] Send message failure =>", err);
        }
    }

    async getProfilePic(req, res) {
        try {
            const { from, to } = req.params;
            console.log(from, to)

            const findInstance = WhatsappInstances.find(from);

            if (!findInstance) {
                return res.status(404).json({ message: "Whatsapp number isn't found " });
            }

            const pfpURL = await findInstance.getProfilePicture(to);

            res.status(200).json({ url: pfpURL });
        } catch {
            res.status(500).send();
        }

    }

    async getFile(req, res) {
        try {
            const fileName = req.params.filename;
            const searchFilePath = path.join(__dirname, "/files", fileName);

            if (!fs.existsSync(searchFilePath)) {
                return res.status(404).json({ message: "File not found" });
            }
            const mimeType = mime.getType(searchFilePath);
            const file = fs.readFileSync(searchFilePath);

            res.setHeader('Content-Type', mimeType);
            res.end(file);

            logWithDate("Get file success =>", fileName);
        } catch (err) {
            // Log and send error response
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
                    client: instance.clientName,
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

    async uploadFile(req, res) {
        try {
            console.log(req.file);
            const uuid = randomUUID();
            const filename = req.file.originalname.split(".")[0]
            const ext = req.file.originalname.split(".")[1]
            const generatedName = `${uuid}_${filename}.${ext}`;
            const filePath = path.join(__dirname, "/files", generatedName);

            fs.writeFileSync(filePath, req.file.buffer);

            res.status(201).json({ filename: generatedName });

        } catch (err) {
            logWithDate("Upload file failure => ", err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }

    async sendMassMessages(req, res) {
        const { file, body, params } = req;
        const { contacts, text, mode, filename } = body;
        const { from } = params;

        const findInstance = WhatsappInstances.find(from);

        res.status(200).send();

        if (mode === "0") {
            for (const contact of contacts.split(" ")) {
                try {
                    const parsedMessage = file ?
                        await findInstance.sendFile({
                            caption: text,
                            contact,
                            file: file.buffer,
                            fileName: file.originalname,
                            mimeType: file.mimeType
                        })
                        :
                        await findInstance.sendText(contact, text);

                    await axios.post(`${findInstance.requestURL.replace("/wwebjs", "")}/custom-routes/receive_mm/${findInstance.whatsappNumber}/${contact}`, parsedMessage);
                    const randomInterval = 1000 + (Math.random() * 500);
                    await new Promise((res) => setTimeout(() => res(), randomInterval));

                } catch (err) {
                    logWithDate(`Send MM Failure =>`, err);
                }
            }
        }
    }
}

module.exports = AppRouter;