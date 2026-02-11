import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { encryptTx, decryptTx, TxSecureRecord } from './crypto';

class JsonStore {
    private filePath: string;
    private memory: Map<string, TxSecureRecord>;

    constructor(filename: string) {
        this.filePath = join(process.cwd(), filename);
        this.memory = new Map();
        this.load();
    }

    private load() {
        if (existsSync(this.filePath)) {
            try {
                const data = JSON.parse(readFileSync(this.filePath, 'utf8'));
                Object.entries(data).forEach(([id, record]) => this.memory.set(id, record as TxSecureRecord));
            } catch (e) {
                console.warn('DB load failed, starting fresh');
            }
        }
    }

    private save() {
        const obj = Object.fromEntries(this.memory);
        writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
    }

    set(id: string, record: TxSecureRecord) {
        this.memory.set(id, record);
        this.save();
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
        this.store = new JsonStore('db.json');
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
