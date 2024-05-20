import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const InitializeDb = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS invite_tracking (
                inviter_id VARCHAR(20) PRIMARY KEY,
                invite_count INT DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS member_invites (
                member_id VARCHAR(20) PRIMARY KEY,
                inviter_id VARCHAR(20),
                FOREIGN KEY (inviter_id) REFERENCES invite_tracking(inviter_id)
            );
        `);
    } finally {
        client.release();
    }
};

export const db = pool;
