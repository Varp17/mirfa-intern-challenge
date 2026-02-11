import { pool } from './db';
import { encryptTx, decryptTx, TxSecureRecord } from './crypto';

class TxService {
    async encryptAndStore(partyId: string, payload: any) {
        const record = encryptTx(partyId, payload);

        await pool.query(
            `INSERT INTO "TxSecureRecord" (
                "id", "partyId", "createdAt", 
                "payload_ct", "payload_tag", "payload_nonce", 
                "dek_wrapped", "dek_wrap_tag", "dek_wrap_nonce", 
                "alg", "mk_version"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                record.id, record.partyId, new Date(record.createdAt),
                record.payload_ct, record.payload_tag, record.payload_nonce,
                record.dek_wrapped, record.dek_wrap_tag, record.dek_wrap_nonce,
                record.alg, record.mk_version
            ]
        );

        return record;
    }

    async getRecord(id: string) {
        const result = await pool.query(
            'SELECT * FROM "TxSecureRecord" WHERE "id" = $1',
            [id]
        );

        if (result.rows.length === 0) throw new Error('NOT_FOUND');
        return result.rows[0] as TxSecureRecord;
    }

    async decryptRecord(id: string) {
        const record = await this.getRecord(id);
        return decryptTx(record);
    }

    async getAllRecords() {
        const result = await pool.query(
            'SELECT * FROM "TxSecureRecord" ORDER BY "createdAt" DESC'
        );
        return result.rows as TxSecureRecord[];
    }
}

export const txService = new TxService();
