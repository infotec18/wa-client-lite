const { Router } = require("express");
const WhatsappInstances = require("./instances.js");
const path = require("path");
const fs = require("fs");
const multer = require('multer');
const { logWithDate, isUUID } = require("./utils.js");
const { randomUUID } = require("crypto");
const mime = require('mime');
const { default: axios } = require("axios");
const mysql = require('mysql2/promise');

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
        this.router.get("/validate-number/:from/:to", this.validateNumber);
        this.router.get("/update-avatars", this.updateAvatars);
    }

    async updateAvatars(_, res) {
        try {
            // Criação de uma conexão com o banco de dados
            const createConnection = async () => await mysql.createConnection({
                host: process.env.DATABASE_HOST,
                user: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_DATABASE,
            });

            const connection = await createConnection()

            const [rows] = await connection.execute(`
                SELECT
                    wa.CODIGO, 
                    wcn.NUMERO
                FROM w_atendimentos wa
                LEFT JOIN w_clientes_numeros wcn ON wcn.CODIGO = wa.CODIGO_NUMERO
                WHERE 
                    wa.AVATAR_URL IS NULL 
                AND 
                    NOT wa.CONCLUIDO
            `);

            let counter = 0;

            for (const row of rows) {
                counter++;

                const { CODIGO, NUMERO } = row;

                const instance = WhatsappInstances.instances[0];
                const AVATAR_URL = await instance.getProfilePicture(NUMERO);
                console.log(`[${counter} of ${rows.length}]`, CODIGO, NUMERO, typeof AVATAR_URL === "string")

                if (AVATAR_URL) {
                    await connection.execute('UPDATE w_atendimentos SET AVATAR_URL = ? WHERE CODIGO = ?', [AVATAR_URL, CODIGO]);
                }
            }

            // Fechar a conexão com o banco de dados
            await connection.end();

            res.status(200).json({ message: "Avatars atualizados com sucesso!" });
        } catch (err) {
            logWithDate("Erro ao atualizar avatars => ", err);
            res.status(500).json({ message: "Algo deu errado ao atualizar avatars" });
        }
    }

    async sendMessage(req, res) {
        try {
            const { from, to } = req.params;
            const findInstance = WhatsappInstances.find(from);

            if (!findInstance) {
                return res.status(404).json({ message: "Whatsapp number isn't found " });
            }

            const { text, referenceId, filename, isAudio } = req.body;
            const file = req.file;

            if (file) {
                const sentMessageWithFile = await findInstance.sendFile({
                    file: file.buffer,
                    fileName: file.originalname,
                    mimeType: file.mimetype,
                    contact: to,
                    caption: text,
                    quotedMessageId: referenceId,
                    isAudio
                });

                res.status(201).json(sentMessageWithFile);
            } else if (filename) {

                const filePath = path.join(__dirname, './files', filename)
                const localfile = fs.readFileSync(filePath);
                const mimeType = mime.getType(filePath);

                const fileNameWithoutUUID = filename.split("_").slice(1).join("_");

                const sentMessageWithFile = await findInstance.sendFile({
                    file: localfile,
                    fileName: fileNameWithoutUUID,
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
            const haveUUID = isUUID(fileName.split("_")[0])
            const fileNameWithoutUUID = haveUUID ? fileName.split("_").slice(1).join("_") : fileName;

            res.setHeader('Content-Disposition', `inline; filename="${fileNameWithoutUUID}"`);
            res.setHeader('Content-Type', mimeType);
            res.end(file);

            logWithDate("Get file success =>", fileName);
        } catch (err) {
            // Log and send error response
            logWithDate("Get file failure =>", err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }

    async healthCheck(_, res) {
        res.status(200).json({ online: true });
    }

    async getClientStatus(_, res) {
        try {
            const clientsStatus = [];

            for (const instance of WhatsappInstances.instances) {
                const status = await instance.client.getState().catch(() => undefined);
                const instanceData = {
                    client: instance.clientName,
                    number: instance.whatsappNumber,
                    auth: instance.isAuthenticated,
                    ready: instance.isReady,
                    status
                };

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
            const filename = decodeURIComponent(req.file.originalname).split(".")[0]
            const ext = decodeURIComponent(req.file.originalname).split(".")[1]
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
        const { contacts, text, mode } = body;
        const { from } = params;

        const findInstance = WhatsappInstances.find(from);

        res.status(200).send();

        if (mode === "0") {
            for (const contact of contacts.split(" ")) {
                try {
                    const haveUUID = isUUID(file.originalname.split("_")[0])
                    const fileName = haveUUID ? file.originalname.split("_").slice(1).join("_") : file.originalname;

                    console.log(file.originalname, fileName);

                    const parsedMessage = file ?
                        await findInstance.sendFile({
                            caption: text,
                            contact,
                            file: file.buffer,
                            fileName: fileName,
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

    async validateNumber(req, res) {
        try {
            const { from, to } = req.params;

            const findInstance = WhatsappInstances.find(from);
            const validNumber = await findInstance.validateNumber(to);

            res.status(200).json({ validNumber });
        } catch (err) {
            logWithDate("Validate number failure => ", err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }
}

module.exports = AppRouter;