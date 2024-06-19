import { RowDataPacket } from "mysql2";
import WhatsappInstance from "../whatsapp";

export async function loadContacts(instance: WhatsappInstance) {
    const contacts = (await instance.client.getContacts()).slice(0, 20);

    for (const contact of contacts) {

        if (!contact.number) continue
        const numberWithoutCountry = contact.number.slice(2);
        const DDD = numberWithoutCountry.slice(0, 2);
        const numberBody = numberWithoutCountry.length === 10 ? numberWithoutCountry.slice(2) : numberWithoutCountry.slice(3);

        const [numberWithout9, numberWith9] = [numberBody, `9${numberBody}`];
        const contactName = (contact.name || contact.pushname) || contact.shortName;

        const SEARCH_CUSTOMER_QUERY = `
        SELECT * FROM clientes
        WHERE (AREA1 = ${DDD} AND FONE1 = '${numberWith9}') OR 
              (AREA2 = ${DDD} AND FONE2 = '${numberWith9}') OR 
              (AREA3 = ${DDD} AND FONE3 = '${numberWith9}') OR 
              (AREA1 = ${DDD} AND FONE1 = '${numberWithout9}') OR 
              (AREA2 = ${DDD} AND FONE2 = '${numberWithout9}') OR 
              (AREA3 = ${DDD} AND FONE3 = '${numberWithout9}')
            `;

        const findCustomer = await instance.pool
            .query(SEARCH_CUSTOMER_QUERY)
            .then(res => (res[0] as RowDataPacket[])[0] || null)
            .catch(err => console.error(err));


        await instance.pool.query(
            "INSERT IGNORE INTO w_clientes_numeros (CODIGO_CLIENTE, NOME, NUMERO) VALUES (?, ?, ?);",
            [findCustomer?.CODIGO || -1, contactName || contact.number, contact.number]
        );
    }
}