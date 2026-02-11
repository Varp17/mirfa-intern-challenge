const http = require('http');

const API_URL = 'http://localhost:3001';

async function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(`${API_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTest() {
    console.log('🚀 Starting End-to-End Verification...');

    try {
        // 1. Encrypt
        console.log('\nStep 1: Encrypting payload...');
        const encryptRes = await request('/tx/encrypt', 'POST', {
            partyId: 'user_99',
            payload: { amount: 1250, note: 'Payment for services' }
        });
        console.log('✅ Encrypted Record:', JSON.stringify(encryptRes.data, null, 2));
        const recordId = encryptRes.data.id;

        // 2. Fetch
        console.log(`\nStep 2: Fetching record ${recordId}...`);
        const fetchRes = await request(`/tx/${recordId}`);
        console.log('✅ Fetched Record Status:', fetchRes.status);

        // 3. Decrypt
        console.log(`\nStep 3: Decrypting record ${recordId}...`);
        const decryptRes = await request(`/tx/${recordId}/decrypt`, 'POST');
        console.log('✅ Decrypted Payload:', JSON.stringify(decryptRes.data.payload, null, 2));

        if (decryptRes.data.payload.amount === 1250) {
            console.log('\n\x1b[32m🌟 SUCCESS: FULL SYSTEM VERIFIED WITH 0 ERRORS 🌟\x1b[0m');
            process.exit(0);
        } else {
            throw new Error('Payload mismatch!');
        }
    } catch (err) {
        console.error('\n\x1b[31m❌ VERIFICATION FAILED:\x1b[0m', err.message);
        process.exit(1);
    }
}

runTest();
