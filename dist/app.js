"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router_1 = __importDefault(require("./router"));
const utils_1 = require("./utils");
const app = (0, express_1.default)();
const appRouter = new router_1.default();
const endpoints = (0, utils_1.getAllEndpoints)(appRouter.router, "/whatsapp");
endpoints.forEach((e) => (0, utils_1.logWithDate)(`[ROUTE] ${e}`));
app.use("/whatsapp", appRouter.router);
app.listen(7000);
//# sourceMappingURL=app.js.map