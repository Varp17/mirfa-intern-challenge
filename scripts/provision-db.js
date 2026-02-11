const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const sql = `
CREATE TABLE IF NOT EXISTS "TxSecureRecord" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_ct" TEXT NOT NULL,
    "payload_tag" TEXT NOT NULL,
    "payload_nonce" TEXT NOT NULL,
    "dek_wrapped" TEXT NOT NULL,
    "dek_wrap_tag" TEXT NOT NULL,
    "dek_wrap_nonce" TEXT NOT NULL,
    "alg" TEXT NOT NULL,
    "mk_version" INTEGER NOT NULL,

    CONSTRAINT "TxSecureRecord_pkey" PRIMARY KEY ("id")
);
`;

async function provision() {
    console.log('Connecting to Neon PostgreSQL...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Successfully connected.');
        console.log('Creating table "TxSecureRecord"...');
        await client.query(sql);
        console.log('Table created successfully.');
    } catch (err) {
        console.error('Error provisioning database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

provision();
