"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* const { Router } = require("express");
const WhatsappInstances = require("./instances.js");
const path = require("path");
const fs = require("fs");
const multer = require('multer');
const { logWithDate, isUUID, decodeSafeURI } = require("./utils.js");
const { randomUUID } = require("crypto");
const mime = require('mime');
const { default: axios } = require("axios");
const mysql = require('mysql2/promise');
const connectionProps = require("./connection.js"); */
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const instances_1 = __importDefault(require("./instances"));
const utils_1 = require("./utils");
const mime = __importStar(require("mime"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const axios_1 = __importDefault(require("axios"));
class AppRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        const upload = (0, multer_1.default)();
        this.router.get("", this.healthCheck);
        this.router.get("/clients", this.getClientStatus);
        this.router.get("/clients/:from/avatars//:to", this.getProfilePic);
        this.router.get("/clients/:from/validate-number/:to", this.validateNumber);
        this.router.post("/clients/:from/messages/:to", upload.single("file"), this.sendMessage);
        this.router.post("/clients/:from/mass-messages/:from", upload.single("file"), this.sendMassMessages);
        this.router.get("/files/:filename", this.getFile);
        this.router.post("/files", upload.single("file"), this.uploadFile);
    }
    loadMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const instance = instances_1.default.find(req.params.from);
                if (!instance) {
                    res.status(404).send();
                    return;
                }
                yield instance.loadMessages();
                res.status(200).json({ message: "Successfully loaded messages!" });
            }
            catch (err) {
                res.status(500).send(err);
            }
        });
    }
    sendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { from, to } = req.params;
                const instance = instances_1.default.find(from);
                if (!instance) {
                    return res.status(404).json({ message: "Whatsapp number isn't found " });
                }
                const { text, referenceId, filename, isAudio } = req.body;
                const file = req.file;
                if (file) {
                    const sentMessageWithFile = yield instance.sendFile({
                        file: file.buffer,
                        fileName: (0, utils_1.decodeSafeURI)(file.originalname),
                        mimeType: file.mimetype,
                        contact: to,
                        caption: text,
                        quotedMessageId: referenceId,
                        isAudio
                    });
                    res.status(201).json(sentMessageWithFile);
                }
                else if (filename) {
                    const filePath = (0, node_path_1.join)(__dirname, './files', filename);
                    const localfile = (0, node_fs_1.readFileSync)(filePath);
                    const mimeType = mime.getType(filePath);
                    const fileNameWithoutUUID = filename.split("_").slice(1).join("_");
                    const sentMessageWithFile = yield instance.sendFile({
                        file: localfile,
                        fileName: fileNameWithoutUUID,
                        mimeType: mimeType || "unknown",
                        contact: to,
                        caption: text
                    });
                    res.status(201).json(sentMessageWithFile);
                }
                else {
                    const sentMessage = yield instance.sendText(to, text, referenceId);
                    res.status(201).json(sentMessage);
                }
            }
            catch (err) {
                (0, utils_1.logWithDate)("[router.js] Send message failure =>", err);
            }
        });
    }
    getProfilePic(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { from, to } = req.params;
                const instance = instances_1.default.find(from);
                if (!instance) {
                    return res.status(404).json({ message: "Whatsapp number isn't found " });
                }
                const pfpURL = yield instance.getProfilePicture(to);
                res.status(200).json({ url: pfpURL });
            }
            catch (_a) {
                res.status(500).send();
            }
        });
    }
    getFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileName = req.params.filename;
                const searchFilePath = (0, node_path_1.join)(__dirname, "/files", fileName);
                if (!(0, node_fs_1.existsSync)(searchFilePath)) {
                    return res.status(404).json({ message: "File not found" });
                }
                const mimeType = mime.getType(searchFilePath);
                const file = (0, node_fs_1.readFileSync)(searchFilePath);
                const haveUUID = (0, utils_1.isUUID)(fileName.split("_")[0]);
                const fileNameWithoutUUID = haveUUID ? fileName.split("_").slice(1).join("_") : fileName;
                res.setHeader('Content-Disposition', `inline; filename="${fileNameWithoutUUID}"`);
                mimeType && res.setHeader('Content-Type', mimeType);
                res.end(file);
                (0, utils_1.logWithDate)("Get file success =>", fileName);
            }
            catch (err) {
                // Log and send error response
                (0, utils_1.logWithDate)("Get file failure =>", err);
                res.status(500).json({ message: "Something went wrong" });
            }
        });
    }
    healthCheck(_, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({ online: true });
        });
    }
    getClientStatus(_, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const clientsStatus = [];
                for (const instance of instances_1.default.instances) {
                    const status = yield instance.client.getState().catch(() => undefined);
                    const instanceData = {
                        client: instance.clientName,
                        number: instance.whatsappNumber,
                        auth: instance.isAuthenticated,
                        ready: instance.isReady,
                        status
                    };
                    clientsStatus.push(instanceData);
                }
                (0, utils_1.logWithDate)("Get clients statuses success!");
                res.status(200).json({ instances: clientsStatus });
            }
            catch (err) {
                (0, utils_1.logWithDate)("Get clients statuses failure => ", err);
                res.status(500).json({ message: "Something went wrong" });
            }
        });
    }
    uploadFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    res.status(400).send();
                    return;
                }
                const uuid = (0, node_crypto_1.randomUUID)();
                const filename = decodeURIComponent(req.file.originalname).split(".")[0];
                const ext = decodeURIComponent(req.file.originalname).split(".")[1];
                const generatedName = `${uuid}_${filename}.${ext}`;
                const filePath = (0, node_path_1.join)(__dirname, "/files", generatedName);
                (0, node_fs_1.writeFileSync)(filePath, req.file.buffer);
                res.status(201).json({ filename: generatedName });
            }
            catch (err) {
                (0, utils_1.logWithDate)("Upload file failure => ", err);
                res.status(500).json({ message: "Something went wrong" });
            }
        });
    }
    sendMassMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { file, body, params } = req;
            const { contacts, text, mode } = body;
            const { from } = params;
            const instance = instances_1.default.find(from);
            if (!instance) {
                res.status(404).send();
                return;
            }
            res.status(200).send();
            const sendMM = (contacts, file) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const contact = contacts[0];
                    const haveUUID = (0, utils_1.isUUID)(file.originalname.split("_")[0]);
                    const fileName = haveUUID ? file.originalname.split("_").slice(1).join("_") : file.originalname;
                    const parsedMessage = file ?
                        yield instance.sendFile({
                            caption: text,
                            contact,
                            file: file.buffer,
                            fileName: fileName,
                            mimeType: file.mimetype
                        })
                        :
                            yield instance.sendText(contact, text);
                    yield axios_1.default.post(`${instance.requestURL.replace("/wwebjs", "")}/custom-routes/receive_mm/${instance.whatsappNumber}/${contact}`, parsedMessage);
                    const randomInterval = 5000 + (Math.random() * 5000);
                    contacts.shift();
                    setTimeout(() => {
                        sendMM(contacts, file);
                    }, randomInterval);
                }
                catch (err) {
                    (0, utils_1.logWithDate)(`Send MM Failure =>`, err);
                }
            });
            if (mode === "0" && file)
                sendMM(contacts, file);
        });
    }
    validateNumber(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { from, to } = req.params;
                const instance = instances_1.default.find(from);
                if (!instance) {
                    res.status(404).send();
                    return;
                }
                const validNumber = yield instance.validateNumber(to);
                res.status(200).json({ validNumber });
            }
            catch (err) {
                (0, utils_1.logWithDate)("Validate number failure => ", err);
                res.status(500).json({ message: "Something went wrong" });
            }
        });
    }
}
exports.default = AppRouter;
//# sourceMappingURL=router.js.map