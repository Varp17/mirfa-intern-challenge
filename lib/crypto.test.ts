import { describe, it, expect } from 'vitest';
import { encryptTx, decryptTx } from './crypto';

describe('Security Layer (AES-256-GCM)', () => {
    const partyId = 'test-user-1';
    const payload = { amount: 100, currency: 'USD' };

    it('should correctly encrypt and decrypt a payload', () => {
        const encrypted = encryptTx(partyId, payload);
        const decrypted = decryptTx(encrypted);
        expect(decrypted).toEqual(payload);
    });

    it('should generate unique IDs and nonces for every encryption', () => {
        const enc1 = encryptTx(partyId, payload);
        const enc2 = encryptTx(partyId, payload);
        expect(enc1.id).not.toBe(enc2.id);
        expect(enc1.payload_nonce).not.toBe(enc2.payload_nonce);
    });

    it('should fail if the ciphertext is tampered with', () => {
        const encrypted = encryptTx(partyId, payload);
        // Flip one character in the ciphertext
        const tamperedCt = encrypted.payload_ct.slice(0, -1) + (encrypted.payload_ct.slice(-1) === 'a' ? 'b' : 'a');
        const tamperedRecord = { ...encrypted, payload_ct: tamperedCt };

        expect(() => decryptTx(tamperedRecord)).toThrow();
    });

    it('should fail if the authentication tag is tampered with', () => {
        const encrypted = encryptTx(partyId, payload);
        const tamperedTag = 'f'.repeat(32);
        const tamperedRecord = { ...encrypted, payload_tag: tamperedTag };

        expect(() => decryptTx(tamperedRecord)).toThrow();
    });

    it('should fail if the nonce is invalid length', () => {
        const encrypted = encryptTx(partyId, payload);
        const tamperedRecord = { ...encrypted, payload_nonce: 'abc' };

        expect(() => decryptTx(tamperedRecord)).toThrow(/Invalid payload nonce/);
    });
});
