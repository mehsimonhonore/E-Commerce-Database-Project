const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────────
// GET /api/orders/customer/:customer_id
// Returns all orders for a customer, newest first.
// ─────────────────────────────────────────────
router.get('/customer/:customer_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                order_id,
                order_number,
                total_amount,
                payment_method,
                payment_status,
                order_status,
                placed_at
             FROM orders
             WHERE customer_id = $1
             ORDER BY placed_at DESC`,
            [req.params.customer_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/orders/:order_id
// Returns one full order with all its line items.
// ─────────────────────────────────────────────
router.get('/:order_id', async (req, res) => {
    try {
        // Order header
        const order = await pool.query(
            `SELECT
                o.order_id,
                o.order_number,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.order_notes,
                o.placed_at,
                a.region,
                a.city,
                a.address_line
             FROM orders o
             LEFT JOIN addresses a ON a.address_id = o.address_id
             WHERE o.order_id = $1`,
            [req.params.order_id]
        );

        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        // Line items
        const items = await pool.query(
            `SELECT
                oi.items_id,
                oi.quantity,
                oi.unit_price,
                p.prod_name,
                pv.prod_size,
                pv.prod_color,
                v.vendor_name
             FROM order_items oi
             JOIN product_variants pv ON pv.prod_var_id = oi.prod_var_id
             JOIN product          p  ON p.prod_id      = pv.prod_id
             JOIN vendor           v  ON v.vendor_id    = p.vendor_id
             WHERE oi.order_id = $1`,
            [req.params.order_id]
        );

        res.json({ ...order.rows[0], items: items.rows });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /api/orders
// Places a new order from the customer's cart.
// Body: { customer_id, address_id, payment_method, coupon_code (optional) }
//
// This uses a database transaction — either everything
// succeeds (order + items + stock update) or nothing saves.
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { customer_id, address_id, payment_method, coupon_code } = req.body;

    if (!customer_id || !address_id || !payment_method) {
        return res.status(400).json({ error: 'customer_id, address_id, and payment_method are required.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the customer's cart items
        const cartItems = await client.query(
            `SELECT
                ci.cart_item_id,
                ci.quantity,
                ci.prod_var_id,
                COALESCE(pv.prod_price, p.price) AS unit_price,
                pv.stock_quantity
             FROM carts ca
             JOIN cart_items      ci ON ci.cart_id      = ca.cart_id
             JOIN product_variants pv ON pv.prod_var_id = ci.prod_var_id
             JOIN product          p  ON p.prod_id      = pv.prod_id
             WHERE ca.customer_id = $1`,
            [customer_id]
        );

        if (cartItems.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cart is empty.' });
        }

        // 2. Check stock for every item
        for (const item of cartItems.rows) {
            if (item.stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    error: `Not enough stock for variant ${item.prod_var_id}.`
                });
            }
        }

        // 3. Calculate total
        let total = cartItems.rows.reduce(
            (sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0
        );

        // 4. Apply coupon if provided
        let coupon_id = null;
        if (coupon_code) {
            const coupon = await client.query(
                `SELECT coupon_id, discount_type, discount_value, minimum_order_amount
                 FROM coupons
                 WHERE code = $1
                   AND is_active = TRUE
                   AND (expires_at IS NULL OR expires_at > NOW())
                   AND (usage_limit IS NULL OR times_used < usage_limit)`,
                [coupon_code]
            );

            if (coupon.rows.length > 0) {
                const c = coupon.rows[0];
                if (total >= c.minimum_order_amount) {
                    coupon_id = c.coupon_id;
                    if (c.discount_type === 'percentage') {
                        total = total - (total * c.discount_value / 100);
                    } else {
                        total = total - c.discount_value;
                    }
                    total = Math.max(0, total);
                }
            }
        }

        // 5. Generate a human-readable order number
        const order_number = 'TRD-' + Date.now();

        // 6. Create the order
        const order = await client.query(
            `INSERT INTO orders
                (customer_id, address_id, order_number, total_amount, payment_method)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING order_id, order_number, total_amount, order_status, placed_at`,
            [customer_id, address_id, order_number, total.toFixed(2), payment_method]
        );

        const order_id = order.rows[0].order_id;

        // 7. Insert order items and reduce stock
        for (const item of cartItems.rows) {
            await client.query(
                `INSERT INTO order_items (order_id, prod_var_id, quantity, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                [order_id, item.prod_var_id, item.quantity, item.unit_price]
            );

            // Reduce stock on the variant
            await client.query(
                `UPDATE product_variants
                 SET stock_quantity = stock_quantity - $1
                 WHERE prod_var_id = $2`,
                [item.quantity, item.prod_var_id]
            );

            // Log inventory change
            await client.query(
                `INSERT INTO inventory (prod_var_id, stock_out)
                 VALUES ($1, $2)`,
                [item.prod_var_id, item.quantity]
            );
        }

        // 8. Record coupon usage if one was applied
        if (coupon_id) {
            await client.query(
                `INSERT INTO coupon_usages (coupon_id, customer_id, order_id)
                 VALUES ($1, $2, $3)`,
                [coupon_id, customer_id, order_id]
            );
            await client.query(
                'UPDATE coupons SET times_used = times_used + 1 WHERE coupon_id = $1',
                [coupon_id]
            );
        }

        // 9. Clear the cart
        await client.query(
            `DELETE FROM cart_items
             WHERE cart_id = (SELECT cart_id FROM carts WHERE customer_id = $1)`,
            [customer_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Order placed successfully.',
            order: order.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
