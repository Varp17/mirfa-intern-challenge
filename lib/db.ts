import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});
