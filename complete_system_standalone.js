const http = require('http');
const crypto = require('crypto');

/**
 * SECURE TRANSACTION MINI APP - STANDALONE ENGINE (0 DEPENDENCIES)
 * This file implements the entire production spec:
 * 1. AES-256-GCM Envelope Encryption
 * 2. Per-transaction DEK generation
 * 3. Master Key wrapping
 * 4. API Endpoints (Encrypt, Fetch, Decrypt)
 */

// Configuration
const PORT = 3001;
const MASTER_KEY_HEX = process.env.MASTER_KEY_HEX || '00'.repeat(32); // Default mock for demo
const ALG = 'aes-256-gcm';

// In-memory Store
const store = new Map();

// Helper: Secure JSON response
const sendJSON = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
};

// --- CORE CRYPTO LOGIC ---

function encryptTx(partyId, payload) {
    const masterKey = Buffer.from(MASTER_KEY_HEX, 'hex');
    if (masterKey.length !== 32) throw new Error('Invalid MASTER_KEY_HEX length');

    const payloadStr = JSON.stringify(payload);

    // 1. Generate DEK (32 bytes)
    const dek = crypto.randomBytes(32);

    // 2. Encrypt Payload with DEK
    const payloadNonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALG, dek, payloadNonce);
    let payloadCt = cipher.update(payloadStr, 'utf8', 'hex');
    payloadCt += cipher.final('hex');
    const payloadTag = cipher.getAuthTag().toString('hex');

    // 3. Wrap DEK with Master Key
    const dekWrapNonce = crypto.randomBytes(12);
    const wrapCipher = crypto.createCipheriv(ALG, masterKey, dekWrapNonce);
    let dekWrapped = wrapCipher.update(dek.toString('hex'), 'utf8', 'hex');
    dekWrapped += wrapCipher.final('hex');
    const dekWrapTag = wrapCipher.getAuthTag().toString('hex');

    return {
        id: crypto.randomBytes(8).toString('hex'),
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

function decryptTx(record) {
    const masterKey = Buffer.from(MASTER_KEY_HEX, 'hex');

    // 1. Unwrap DEK
    const wrapDecipher = crypto.createDecipheriv(ALG, masterKey, Buffer.from(record.dek_wrap_nonce, 'hex'));
    wrapDecipher.setAuthTag(Buffer.from(record.dek_wrap_tag, 'hex'));
    let dekHex = wrapDecipher.update(record.dek_wrapped, 'hex', 'utf8');
    dekHex += wrapDecipher.final('utf8');
    const dek = Buffer.from(dekHex, 'hex');

    // 2. Decrypt Payload
    const decipher = crypto.createDecipheriv(ALG, dek, Buffer.from(record.payload_nonce, 'hex'));
    decipher.setAuthTag(Buffer.from(record.payload_tag, 'hex'));
    let decrypted = decipher.update(record.payload_ct, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

// --- API SERVER ---

const server = http.createServer((req, res) => {
    // Simple CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            // Route: POST /tx/encrypt
            if (req.url === '/tx/encrypt' && req.method === 'POST') {
                const { partyId, payload } = JSON.parse(body);
                if (!partyId || !payload) return sendJSON(res, 400, { error: 'Missing partyId or payload' });

                const record = encryptTx(partyId, payload);
                store.set(record.id, record);
                return sendJSON(res, 201, record);
            }

            // Route: GET /tx/:id
            const fetchMatch = req.url.match(/^\/tx\/([a-f0-9]+)$/);
            if (fetchMatch && req.method === 'GET') {
                const record = store.get(fetchMatch[1]);
                if (!record) return sendJSON(res, 404, { error: 'Not found' });
                return sendJSON(res, 200, record);
            }

            // Route: POST /tx/:id/decrypt
            const decryptMatch = req.url.match(/^\/tx\/([a-f0-9]+)\/decrypt$/);
            if (decryptMatch && req.method === 'POST') {
                const record = store.get(decryptMatch[1]);
                if (!record) return sendJSON(res, 404, { error: 'Not found' });

                const payload = decryptTx(record);
                return sendJSON(res, 200, { payload });
            }

            // 404
            sendJSON(res, 404, { error: 'Not found' });
        } catch (err) {
            console.error('API Error:', err);
            sendJSON(res, 400, { error: 'Server Error: ' + err.message });
        }
    });
});

server.listen(PORT, () => {
    console.log(`\x1b[32m✅ SECURE SYSTEM RUNNING\x1b[0m`);
    console.log(`API URL: http://localhost:${PORT}`);
    console.log(`Master Key: ${MASTER_KEY_HEX.substring(0, 8)}...`);
});
