const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const pool     = require('../db');

// ─────────────────────────────────────────────
// POST /api/auth/register
// Creates a new customer account.
// Body: { first_name, last_name, email, phone_num, password }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { first_name, last_name, email, phone_num, password } = req.body;

    if (!first_name || !last_name || !email || !phone_num || !password) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        // Check if the email is already registered
        const existing = await pool.query(
            'SELECT customer_id FROM customer WHERE email = $1',
            [email]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        // Hash the password — never store plain text
        const password_hash = await bcrypt.hash(password, 10);

        // Insert the new customer
        const result = await pool.query(
            `INSERT INTO customer (first_name, last_name, email, phone_num, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING customer_id, first_name, last_name, email, created_at`,
            [first_name, last_name, email, phone_num, password_hash]
        );

        // Also create an empty cart for this customer immediately
        await pool.query(
            'INSERT INTO carts (customer_id) VALUES ($1)',
            [result.rows[0].customer_id]
        );

        res.status(201).json({
            message: 'Account created successfully.',
            customer: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Logs in a customer by checking email + password.
// Body: { email, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find the customer by email
        const result = await pool.query(
            `SELECT customer_id, first_name, last_name, email, password_hash
             FROM customer WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const customer = result.rows[0];

        // Compare the submitted password against the stored hash
        const isMatch = await bcrypt.compare(password, customer.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Return customer info (no password hash)
        res.json({
            message: 'Login successful.',
            customer: {
                customer_id: customer.customer_id,
                first_name:  customer.first_name,
                last_name:   customer.last_name,
                email:       customer.email
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
