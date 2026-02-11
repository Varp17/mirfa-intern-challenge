import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

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

    const dek = randomBytes(32);

    const payloadNonce = randomBytes(12);
    const cipher = createCipheriv(ALG, dek, payloadNonce);
    let payloadCt = cipher.update(payloadStr, 'utf8', 'hex');
    payloadCt += cipher.final('hex');
    const payloadTag = cipher.getAuthTag().toString('hex');

    const dekWrapNonce = randomBytes(12);
    const wrapCipher = createCipheriv(ALG, masterKey, dekWrapNonce);
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
        const wrapDecipher = createDecipheriv(ALG, masterKey, Buffer.from(record.dek_wrap_nonce, 'hex'));
        wrapDecipher.setAuthTag(Buffer.from(record.dek_wrap_tag, 'hex'));
        let dekHex = wrapDecipher.update(record.dek_wrapped, 'hex', 'utf8');
        dekHex += wrapDecipher.final('utf8');
        const dek = Buffer.from(dekHex, 'hex');

        const decipher = createDecipheriv(ALG, dek, Buffer.from(record.payload_nonce, 'hex'));
        decipher.setAuthTag(Buffer.from(record.payload_tag, 'hex'));
        let decrypted = decipher.update(record.payload_ct, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error('Decryption failed: Data may be tampered or invalid');
    }
}
