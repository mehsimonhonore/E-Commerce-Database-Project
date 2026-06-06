require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const pool = require('./db');
const { apiLimiter } = require('./middleware');

const app = express();
const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', 'frontend');

// Apply Helmet security headers (CIA Triad: Confidentiality & Integrity)
// Disable CSP to allow font-awesome and google fonts CDNs
app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.json());

// CORS configuration - secure default
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Serve static assets
app.use(express.static(frontendPath, { index: false }));

// Rate limit all API calls to prevent brute force and DDoS botting
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', require('./auth'));
app.use('/api/products', require('./products'));
app.use('/api/categories', require('./categories'));
app.use('/api/cart', require('./cart'));
app.use('/api/orders', require('./orders'));
app.use('/api/payments', require('./payments'));
app.use('/api/support', require('./support'));
app.use('/api/notifications', require('./notifications'));


// API status
app.get('/api', (req, res) => {
    res.json({ status: 'Trendora API is running', version: '1.0.0' });
});

// DB Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            database: 'unavailable',
            error: err.message
        });
    }
});

// Serving Restructured Frontend Pages
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'home.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'cart.html'));
});

app.get('/orders', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'orders.html'));
});

app.get('/product', (req, res) => {
    res.sendFile(path.join(frontendPath, 'pages', 'products.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
