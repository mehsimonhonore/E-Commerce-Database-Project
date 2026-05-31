const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────────
// POST /api/payments
// Records a payment for an order.
// In production this would call the MTN MoMo / Orange Money API.
// For now it saves the transaction and marks the order as paid.
// Body: { order_id, customer_id, payment_method, phone_number,
//         amount, transaction_reference }
// payment_method must be: 'MTN_MOMO' or 'ORANGE_MONEY'
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const {
        order_id,
        customer_id,
        payment_method,
        phone_number,
        amount,
        transaction_reference
    } = req.body;

    if (!order_id || !customer_id || !payment_method || !phone_number || !amount) {
        return res.status(400).json({ error: 'All payment fields are required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert the payment record
        const payment = await client.query(
            `INSERT INTO payment
                (order_id, customer_id, payment_method, phone_number,
                 amount, transaction_reference, payment_status)
             VALUES ($1, $2, $3, $4, $5, $6, 'successful')
             RETURNING payment_id, payment_status, created_at`,
            [order_id, customer_id, payment_method, phone_number,
             amount, transaction_reference || 'TXN-' + Date.now()]
        );

        // Update the order's payment status
        await client.query(
            `UPDATE orders
             SET payment_status = 'successful',
                 order_status   = 'confirmed'
             WHERE order_id = $1`,
            [order_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Payment recorded successfully.',
            payment: payment.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────
// GET /api/payments/order/:order_id
// Returns the payment record for a specific order.
// ─────────────────────────────────────────────
router.get('/order/:order_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                payment_id,
                payment_method,
                phone_number,
                amount,
                currency,
                payment_status,
                transaction_reference,
                created_at
             FROM payment
             WHERE order_id = $1`,
            [req.params.order_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No payment found for this order.' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
