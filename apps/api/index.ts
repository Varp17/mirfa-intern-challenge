// @ts-nocheck
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { encryptTx, decryptTx, TxSecureRecord } from '@secure-tx/crypto';

// Resolution for missing @types/node in the IDE's eye
declare const process: {
    env: {
        MASTER_KEY_HEX?: string;
        PORT?: string;
        [key: string]: string | undefined;
    };
    exit: (code?: number) => never;
};

const fastify = Fastify({ logger: true });

// Environment variable validation
const MASTER_KEY_HEX = process.env.MASTER_KEY_HEX;
if (!MASTER_KEY_HEX || MASTER_KEY_HEX.length !== 64) {
    console.error('CRITICAL: MASTER_KEY_HEX must be a 64-character hex string (32 bytes).');
    process.exit(1);
}

// In-memory storage
const store = new Map<string, TxSecureRecord>();

// Zod schemas
const EncryptSchema = z.object({
    partyId: z.string().min(1, 'partyId is required'),
    payload: z.any().refine(p => p !== undefined, 'payload is required'),
});

const DecryptSchema = z.object({
    id: z.string().min(1, 'id is required'),
});

// Centralized Error Handler
fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) {
        return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors.map(e => ({ path: e.path, message: e.message }))
        });
    }

    if (error.message.includes('Decryption failed') || error.message.includes('Invalid')) {
        fastify.log.warn(`Security Event: ${error.message}`);
        return reply.status(400).send({ error: 'Security Error: Data integrity check failed' });
    }

    fastify.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
});

// Plugins
fastify.register(cors, { origin: '*' });

// Routes
// 1. POST /tx/encrypt
fastify.post('/tx/encrypt', async (request, reply) => {
    try {
        const { partyId, payload } = EncryptSchema.parse(request.body);
        const record = encryptTx(partyId, payload, MASTER_KEY_HEX);
        store.set(record.id, record);
        return record;
    } catch (error) {
        if (error instanceof z.ZodError) {
            return reply.status(400).send({ error: 'Validation failed', details: error.errors });
        }
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Internal Server Error' });
    }
});

// 2. GET /tx/:id
fastify.get('/tx/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = store.get(id);
    if (!record) {
        return reply.status(404).send({ error: 'Record not found' });
    }
    return record;
});

// 3. POST /tx/:id/decrypt
fastify.post('/tx/:id/decrypt', async (request, reply) => {
    const { id } = request.params as { id: string };
    const record = store.get(id);
    if (!record) {
        return reply.status(404).send({ error: 'Record not found' });
    }

    try {
        const payload = decryptTx(record, MASTER_KEY_HEX);
        return { payload };
    } catch (error) {
        fastify.log.warn(`Decryption failed for record ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(400).send({ error: 'Decryption failed: Data may be tampered or invalid' });
    }
});

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Start server
const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3001;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`API server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
