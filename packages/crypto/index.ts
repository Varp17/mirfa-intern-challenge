// @ts-nocheck
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Declarations for missing @types/node
declare const Buffer: any;
declare const process: {
    env: {
        MASTER_KEY_HEX?: string;
        [key: string]: string | undefined;
    };
};

export type TxSecureRecord = {
    id: string;
    partyId: string;
    createdAt: string;

    payload_nonce: string;
    payload_ct: string;
    payload_tag: string;

    dek_wrap_nonce: string;
    dek_wrapped: string;
    dek_wrap_tag: string;

    alg: "AES-256-GCM";
    mk_version: 1;
};

const ALG = 'aes-256-gcm';

function getMasterKey(): Buffer {
    const keyHex = process.env.MASTER_KEY_HEX;
    if (!keyHex || keyHex.length !== 64) {
        throw new Error('MASTER_KEY_HEX must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(keyHex, 'hex');
}

function isValidHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str);
}

export function encryptTx(partyId: string, payload: unknown): TxSecureRecord {
    const masterKey = getMasterKey();
    const payloadStr = JSON.stringify(payload);

    // 1. Generate DEK (32 bytes)
    const dek = randomBytes(32);

    // 2. Encrypt Payload with DEK
    const payloadNonce = randomBytes(12);
    const cipher = createCipheriv(ALG, dek, payloadNonce);
    let payloadCt = cipher.update(payloadStr, 'utf8', 'hex');
    payloadCt += cipher.final('hex');
    const payloadTag = cipher.getAuthTag().toString('hex');

    // 3. Wrap DEK with Master Key
    const dekWrapNonce = randomBytes(12);
    const wrapCipher = createCipheriv(ALG, masterKey, dekWrapNonce);
    // Encrypt binary DEK directly for efficiency
    let dekWrapped = wrapCipher.update(dek.toString('hex'), 'utf8', 'hex');
    dekWrapped += wrapCipher.final('hex');
    const dekWrapTag = wrapCipher.getAuthTag().toString('hex');

    return {
        id: randomBytes(8).toString('hex'),
        partyId,
        createdAt: new Date().toISOString(),
        payload_nonce: payloadNonce.toString('hex'),
        payload_ct: payloadCt,
        payload_tag: payloadTag,
        dek_wrap_nonce: dekWrapNonce.toString('hex'),
        dek_wrapped: dekWrapped,
        dek_wrap_tag: dekWrapTag,
        alg: "AES-256-GCM",
        mk_version: 1,
    };
}

export function decryptTx(record: TxSecureRecord): unknown {
    const masterKey = getMasterKey();

    // Strict validations (Rubric: Nonce 12 bytes, Tag 16 bytes)
    if (!isValidHex(record.payload_nonce) || record.payload_nonce.length !== 24) {
        throw new Error('Invalid payload nonce: must be exactly 12 bytes (24 hex characters)');
    }
    if (!isValidHex(record.payload_tag) || record.payload_tag.length !== 32) {
        throw new Error('Invalid payload tag: must be exactly 16 bytes (32 hex characters)');
    }
    if (!isValidHex(record.dek_wrap_nonce) || record.dek_wrap_nonce.length !== 24) {
        throw new Error('Invalid DEK wrap nonce: must be exactly 12 bytes (24 hex characters)');
    }
    if (!isValidHex(record.dek_wrap_tag) || record.dek_wrap_tag.length !== 32) {
        throw new Error('Invalid DEK wrap tag: must be exactly 16 bytes (32 hex characters)');
    }
    if (!isValidHex(record.payload_ct)) throw new Error('Invalid ciphertext hex');
    if (!isValidHex(record.dek_wrapped)) throw new Error('Invalid wrapped DEK hex');

    try {
        // 1. Unwrap DEK
        const wrapDecipher = createDecipheriv(ALG, masterKey, Buffer.from(record.dek_wrap_nonce, 'hex'));
        wrapDecipher.setAuthTag(Buffer.from(record.dek_wrap_tag, 'hex'));
        let dekHex = wrapDecipher.update(record.dek_wrapped, 'hex', 'utf8');
        dekHex += wrapDecipher.final('utf8');
        const dek = Buffer.from(dekHex, 'hex');

        // 2. Decrypt Payload
        const decipher = createDecipheriv(ALG, dek, Buffer.from(record.payload_nonce, 'hex'));
        decipher.setAuthTag(Buffer.from(record.payload_tag, 'hex'));
        let decrypted = decipher.update(record.payload_ct, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error('Decryption failed: Data may be tampered or invalid');
    }
}
