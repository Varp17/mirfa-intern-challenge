
import { encryptTx, decryptTx, TxSecureRecord } from './crypto';

class JsonStore {
    private memory: Map<string, TxSecureRecord>;

    constructor() {
        this.memory = new Map();
    }

    set(id: string, record: TxSecureRecord) {
        this.memory.set(id, record);
    }

    get(id: string) {
        return this.memory.get(id);
    }

    getAll() {
        return Array.from(this.memory.values()).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
}


class TxService {
    private store: JsonStore;

    constructor() {
        this.store = new JsonStore();
    }

    async encryptAndStore(partyId: string, payload: any) {
        const record = encryptTx(partyId, payload);
        this.store.set(record.id, record);
        return record;
    }

    getRecord(id: string) {
        const record = this.store.get(id);
        if (!record) throw new Error('NOT_FOUND');
        return record;
    }

    async decryptRecord(id: string) {
        const record = this.getRecord(id);
        return decryptTx(record);
    }

    getAllRecords() {
        return this.store.getAll();
    }
}

export const txService = new TxService();
