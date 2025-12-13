const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please add it to backend/.env');
}

// Determine if we are connecting to a local database or a remote one (e.g. Render)
const isLocalDatabase =
    process.env.DATABASE_URL &&
    /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

// Create a connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Remote providers like Render require SSL, local Postgres usually does not.
    ssl: isLocalDatabase ? false : { rejectUnauthorized: false },
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client can be idle before being closed
    // Give remote databases (like Render) more time to accept new connections
    connectionTimeoutMillis: 10000, // How long to wait for a connection
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

// Helper function to get a client from the pool (for transactions)
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    
    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    
    // Monkey patch the release method to clear our timeout
    client.release = () => {
        clearTimeout(timeout);
        client.release = release;
        return release();
    };
    
    return client;
};

// Helper function for transactions
const transaction = async (callback) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    query,
    getClient,
    transaction,
    pool
};