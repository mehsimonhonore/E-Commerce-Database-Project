const express = require('express');
const app = express();
const port = 3000;

// Parse incoming JSON request bodies
app.use(express.json());

// CORS — allows the frontend (opened from a different port or file)
// to call this backend without being blocked by the browser
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/payments',   require('./routes/payments'));

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'Trendora API is running', version: '1.0.0' });
});

// Global error handler — catches anything the routes don't handle
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
