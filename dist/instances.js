"use strict";
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
const connection_1 = __importDefault(require("./connection"));
const whatsapp_1 = __importDefault(require("./whatsapp"));
require("dotenv/config");
const { REQUEST_URL } = process.env;
const SELECT_INSTANCES_QUERY = `
SELECT 
    wi.*,
    db.host AS db_host,
    db.port AS db_port,
    db.user AS db_user,
    db.password AS db_pass,
    db.database AS db_name
FROM whatsapp_instances wi
LEFT JOIN clients c ON c.name = wi.client_name
LEFT JOIN database_connections db ON db.client_name = wi.client_name
WHERE c.is_active AND wi.is_active;
`;
const getURL = (client) => (REQUEST_URL === null || REQUEST_URL === void 0 ? void 0 : REQUEST_URL.replace(":clientName", client)) || "";
class WhatsappInstances {
    constructor() {
        this.instances = [];
        (0, connection_1.default)()
            .then((c) => __awaiter(this, void 0, void 0, function* () {
            const [rows] = yield c.execute(SELECT_INSTANCES_QUERY);
            const instances = rows;
            this.instances = instances.map(i => (new whatsapp_1.default(i.client_name, i.number, getURL(i.client_name), { host: i.db_host, port: i.db_port, user: i.db_user, password: i.db_pass, database: i.db_name })));
            yield c.end();
            c.destroy();
        }));
    }
    find(number) {
        return this.instances.find((i) => i.whatsappNumber == number);
    }
}
const instances = new WhatsappInstances();
exports.default = instances;
//# sourceMappingURL=instances.js.map