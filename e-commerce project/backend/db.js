const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1); // fail fast — don't serve requests with no DB
    } else {
        console.log('Connected to PostgreSQL — trendora');
        release(); // return the client to the pool
    }
});

module.exports = pool;
