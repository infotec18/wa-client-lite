import "dotenv/config";
import { ConnectionOptions, createConnection } from "mysql2/promise";

const connectionProps: ConnectionOptions = {
    host: process.env.DATABASE_HOST!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_DATABASE!,
}

async function getDBConnection() {
    return await createConnection(connectionProps)
}

export default getDBConnection;