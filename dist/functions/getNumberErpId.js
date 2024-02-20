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
Object.defineProperty(exports, "__esModule", { value: true });
function getNumberErpId(connection, number, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const SELECT_CONTACT_QUERY = `SELECT * FROM w_clientes_numeros WHERE NUMERO = ?`;
        const [rows] = yield connection.execute(SELECT_CONTACT_QUERY, [number]);
        if (!rows[0]) {
            const INSERT_CONTACT_QUERY = `INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)`;
            const nameOrNumber = (name === null || name === void 0 ? void 0 : name.slice(0, 30)) || number;
            const [result] = yield connection
                .execute(INSERT_CONTACT_QUERY, [-1, nameOrNumber, number]);
            return result.insertId;
        }
        const CODIGO_NUMERO = rows[0].CODIGO;
        return CODIGO_NUMERO;
    });
}
exports.default = getNumberErpId;
//# sourceMappingURL=getNumberErpId.js.map