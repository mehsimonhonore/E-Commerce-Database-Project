const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Database connection (YOUR FRIEND'S DATABASE)
const pool = new Pool({
    user: 'postgres',
    password: 'trendora',
    host: '162.19.128.36',      // Friend's IP
    port: 5432,
    database: 'ecommerce_db'
});

// Test the connection
pool.connect((err) => {
    if (err) {
        console.log('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to PostgreSQL!');
    }
});

// API: Get all products
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM product_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query('SELECT * FROM product_name WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Product not found' });
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Homepage
app.get('/', (req, res) => {
    res.send('E-Commerce Backend is running! Go to /api/products to see data');
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📦 Products API: http://localhost:${port}/api/products`);
});