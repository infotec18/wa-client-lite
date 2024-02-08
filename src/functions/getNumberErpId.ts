import { Connection, FieldPacket, ResultSetHeader, RowDataPacket } from "mysql2/promise";

async function getNumberErpId(connection: Connection, number: string, name?: string | null) {
    const SELECT_CONTACT_QUERY = `SELECT * FROM w_clientes_numeros WHERE NUMERO = ?`;
    const [rows]: [RowDataPacket[], FieldPacket[]] = await connection.execute(SELECT_CONTACT_QUERY, [number]);

    if (!rows[0]) {
        const INSERT_CONTACT_QUERY = `INSERT INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?)`;

        const nameOrNumber = name?.slice(0, 30) || number;

        const [result]: [ResultSetHeader, FieldPacket[]] = await connection
            .execute(INSERT_CONTACT_QUERY, [-1, nameOrNumber, number]);

        return result.insertId;
    }

    const CODIGO_NUMERO = (rows[0] as { CODIGO: number }).CODIGO;

    return CODIGO_NUMERO;
}

export default getNumberErpId;