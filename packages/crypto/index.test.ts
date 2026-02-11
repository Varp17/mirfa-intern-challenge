import { describe, it, expect, beforeAll } from 'vitest';
import { encryptTx, decryptTx } from './index';

const MASTER_KEY_HEX = '00'.repeat(32);

describe('Crypto Package Security', () => {
    const partyId = 'party_456';
    const payload = { data: 'secret message' };

    beforeAll(() => {
        process.env.MASTER_KEY_HEX = MASTER_KEY_HEX;
    });

    it('correctly encrypts and decrypts', () => {
        const record = encryptTx(partyId, payload);
        const decrypted = decryptTx(record);
        expect(decrypted).toEqual(payload);
    });

    it('rejects tampered ciphertext', () => {
        const record = encryptTx(partyId, payload);
        record.payload_ct = record.payload_ct.slice(0, -2) + (record.payload_ct.endsWith('00') ? 'ff' : '00');
        expect(() => decryptTx(record)).toThrow('Decryption failed');
    });

    it('rejects tampered auth tag', () => {
        const record = encryptTx(partyId, payload);
        record.payload_tag = record.payload_tag.slice(0, -2) + (record.payload_tag.endsWith('00') ? 'ff' : '00');
        expect(() => decryptTx(record)).toThrow('Decryption failed');
    });

    it('rejects invalid nonce length', () => {
        const record = encryptTx(partyId, payload);
        record.payload_nonce = record.payload_nonce.slice(0, -2);
        expect(() => decryptTx(record)).toThrow('Invalid payload nonce');
    });

    it('rejects invalid hex characters', () => {
        const record = encryptTx(partyId, payload);
        record.payload_ct = 'G'.repeat(record.payload_ct.length); // Not hex
        expect(() => decryptTx(record)).toThrow('Invalid ciphertext hex');
    });
});
