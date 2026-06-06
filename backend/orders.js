const express = require('express');
const router  = express.Router();
const pool    = require('./db');
const { authenticateToken, checkoutLimiter } = require('./middleware');

// Apply JWT verification to all order routes
router.use(authenticateToken);

// ─────────────────────────────────────────────
// GET /api/orders/customer/:customer_id
// Returns all orders for a customer, newest first.
// ─────────────────────────────────────────────
router.get('/customer/:customer_id', async (req, res) => {
    // CIA Triad: Confidentiality
    if (req.user.customer_id !== req.params.customer_id) {
        return res.status(403).json({ error: 'Unauthorized to view these orders.' });
    }

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
// GET /api/orders/coupon/:code
// Validates a promo coupon code.
// ─────────────────────────────────────────────
router.get('/coupon/:code', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT coupon_id, code, discount_type, discount_value, minimum_order_amount
             FROM coupons
             WHERE code = $1
               AND is_active = TRUE
               AND (expires_at IS NULL OR expires_at > NOW())
               AND (usage_limit IS NULL OR times_used < usage_limit)`,
            [req.params.code]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired coupon.' });
        }
        res.json(result.rows[0]);
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
                o.customer_id,
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

        // CIA Triad: Confidentiality
        if (order.rows[0].customer_id !== req.user.customer_id) {
            return res.status(403).json({ error: 'Unauthorized to view this order.' });
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
// Body: { customer_id, address_id, address_line, payment_method, coupon_code }
// Uses checkoutLimiter to prevent bot scalping.
// ─────────────────────────────────────────────
router.post('/', checkoutLimiter, async (req, res) => {
    const { customer_id, address_id, address_line, payment_method, coupon_code } = req.body;

    if (!customer_id || (!address_id && !address_line) || !payment_method) {
        return res.status(400).json({ error: 'customer_id, shipping address, and payment_method are required.' });
    }

    // CIA Triad: Integrity & Confidentiality
    if (req.user.customer_id !== customer_id) {
        return res.status(403).json({ error: 'Unauthorized to place order for this account.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Resolve address: if address_line is passed, insert new address row
        let final_address_id = address_id;
        if (!final_address_id && address_line) {
            const addrResult = await client.query(
                `INSERT INTO addresses (customer_id, region, city, address_line)
                 VALUES ($1, $2, $3, $4)
                 RETURNING address_id`,
                [customer_id, 'Cameroon', 'Buea', address_line.trim()]
            );
            final_address_id = addrResult.rows[0].address_id;
        }

        // 2. Get the customer's cart items using FOR UPDATE for concurrency protection (Anti-Scalping)
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

        // 3. Check and lock stock for every item (concurrency safety)
        for (const item of cartItems.rows) {
            const variantLock = await client.query(
                `SELECT stock_quantity FROM product_variants 
                 WHERE prod_var_id = $1 FOR UPDATE`,
                [item.prod_var_id]
            );
            
            const currentStock = variantLock.rows[0].stock_quantity;
            if (currentStock < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    error: `Out of stock: Only ${currentStock} units left for product variant.`
                });
            }
        }

        // 4. Calculate total
        let total = cartItems.rows.reduce(
            (sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0
        );

        // 5. Apply coupon if provided
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

        const order_number = 'TRD-' + Date.now();

        // 6. Create the order
        const order = await client.query(
            `INSERT INTO orders
                (customer_id, address_id, order_number, total_amount, payment_method)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING order_id, order_number, total_amount, order_status, placed_at`,
            [customer_id, final_address_id, order_number, total.toFixed(2), payment_method]
        );

        const order_id = order.rows[0].order_id;

        // 7. Insert order items and reduce stock
        for (const item of cartItems.rows) {
            await client.query(
                `INSERT INTO order_items (order_id, prod_var_id, quantity, unit_price)
                 VALUES ($1, $2, $3, $4)`,
                [order_id, item.prod_var_id, item.quantity, item.unit_price]
            );

            await client.query(
                `UPDATE product_variants
                 SET stock_quantity = stock_quantity - $1
                 WHERE prod_var_id = $2`,
                [item.quantity, item.prod_var_id]
            );

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

        // 9. Create payment transaction (MTN Momo / Orange Money)
        await client.query(
            `INSERT INTO payment (order_id, customer_id, payment_method, amount, payment_status)
             VALUES ($1, $2, $3, $4, 'successful')`,
            [order_id, customer_id, payment_method, total.toFixed(2)]
        );

        // 10. Clear the cart
        await client.query(
            `DELETE FROM cart_items
             WHERE cart_id = (SELECT cart_id FROM carts WHERE customer_id = $1)`,
            [customer_id]
        );

        // Create delivery entry
        await client.query(
            `INSERT INTO deliveries (order_id, delivery_status)
             VALUES ($1, 'pending')`,
            [order_id]
        );

        // Create transaction notification
        await client.query(
            `INSERT INTO notifications (customer_id, title, message)
             VALUES ($1, 'Order Placed', 'Your order ' || $2 || ' of ' || $3 || ' FCFA was placed successfully.')`,
            [customer_id, order_number, total.toFixed(2)]
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

// Mark order as delivered and process vendor payout
router.put('/:order_id/deliver', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Lock order row
        const orderCheck = await client.query(
            'SELECT * FROM orders WHERE order_id = $1 FOR UPDATE',
            [req.params.order_id]
        );
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderCheck.rows[0];
        if (order.customer_id !== req.user.customer_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Unauthorized.' });
        }
        if (order.order_status === 'delivered') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Order already delivered.' });
        }

        // Update order status
        await client.query(
            `UPDATE orders SET order_status = 'delivered' WHERE order_id = $1`,
            [req.params.order_id]
        );

        // Update delivery history
        const deliveryCheck = await client.query(
            'SELECT delivery_id FROM deliveries WHERE order_id = $1',
            [req.params.order_id]
        );
        if (deliveryCheck.rows.length > 0) {
            await client.query(
                `UPDATE deliveries SET delivery_status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
                [req.params.order_id]
            );
        } else {
            await client.query(
                `INSERT INTO deliveries (order_id, delivery_status, delivered_at) VALUES ($1, 'delivered', CURRENT_TIMESTAMP)`,
                [req.params.order_id]
            );
        }

        // Get vendors associated with order items
        const items = await client.query(
            `SELECT oi.quantity, oi.unit_price, p.vendor_id
             FROM order_items oi
             JOIN product_variants pv ON pv.prod_var_id = oi.prod_var_id
             JOIN product p ON p.prod_id = pv.prod_id
             WHERE oi.order_id = $1`,
            [req.params.order_id]
        );

        // Process payouts (90% to vendor, 10% platform fee)
        for (const item of items.rows) {
            if (item.vendor_id) {
                await client.query(
                    'SELECT balance FROM vendor WHERE vendor_id = $1 FOR UPDATE',
                    [item.vendor_id]
                );
                const payout = parseFloat(item.unit_price) * item.quantity * 0.90;
                await client.query(
                    'UPDATE vendor SET balance = balance + $1 WHERE vendor_id = $2',
                    [payout, item.vendor_id]
                );
                await client.query(
                    `INSERT INTO vendor_payouts (vendor_id, order_id, amount, status)
                     VALUES ($1, $2, $3, 'paid')`,
                    [item.vendor_id, req.params.order_id, payout]
                );
            }
        }

        // Log transaction notification
        await client.query(
            `INSERT INTO notifications (customer_id, title, message)
             VALUES ($1, 'Order Delivered', 'Your order ' || $2 || ' has been delivered. Thank you!')`,
            [order.customer_id, order.order_number]
        );

        await client.query('COMMIT');
        res.json({ message: 'Order marked as delivered and vendor payout processed.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Process order refund within 7 days
router.post('/:order_id/refund', async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: 'Reason for refund is required.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Lock order row
        const orderCheck = await client.query(
            'SELECT * FROM orders WHERE order_id = $1 FOR UPDATE',
            [req.params.order_id]
        );
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderCheck.rows[0];
        if (order.customer_id !== req.user.customer_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Unauthorized.' });
        }
        if (order.order_status === 'refunded' || order.order_status === 'cancelled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Order already refunded or cancelled.' });
        }

        // Validate 7-day refund policy
        const placedDate = new Date(order.placed_at);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 7);
        if (placedDate < limitDate) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Refunds only allowed within 7 days of purchase.' });
        }

        // Log refund transaction
        await client.query(
            `INSERT INTO refunds (order_id, customer_id, reason, status, amount)
             VALUES ($1, $2, $3, 'approved', $4)`,
            [order.order_id, order.customer_id, reason, order.total_amount]
        );

        // Update statuses
        await client.query(
            `UPDATE orders SET order_status = 'refunded', payment_status = 'refunded' WHERE order_id = $1`,
            [order.order_id]
        );
        await client.query(
            `UPDATE payment SET payment_status = 'refunded' WHERE order_id = $1`,
            [order.order_id]
        );

        // Restore stocks
        const items = await client.query(
            'SELECT prod_var_id, quantity FROM order_items WHERE order_id = $1',
            [order.order_id]
        );
        for (const item of items.rows) {
            await client.query(
                `UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE prod_var_id = $2`,
                [item.quantity, item.prod_var_id]
            );
        }

        // Create alert notification
        await client.query(
            `INSERT INTO notifications (customer_id, title, message)
             VALUES ($1, 'Refund Processed', 'Refund of ' || $2 || ' FCFA was processed for order ' || $3)`,
            [order.customer_id, order.total_amount, order.order_number]
        );

        await client.query('COMMIT');
        res.json({ message: 'Refund processed successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Process product return within 7 days of delivery
router.post('/:order_id/return', async (req, res) => {
    const { reason, condition } = req.body;
    if (!reason || !condition) {
        return res.status(400).json({ error: 'Reason and condition are required.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock order row
        const orderCheck = await client.query(
            'SELECT * FROM orders WHERE order_id = $1 FOR UPDATE',
            [req.params.order_id]
        );
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Order not found.' });
        }
        const order = orderCheck.rows[0];
        if (order.customer_id !== req.user.customer_id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Unauthorized.' });
        }
        if (order.order_status !== 'delivered') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Only delivered orders can be returned.' });
        }

        // Check if return is within 7 days of delivery
        const deliveryCheck = await client.query(
            `SELECT delivered_at FROM deliveries WHERE order_id = $1 AND delivery_status = 'delivered'`,
            [order.order_id]
        );
        if (deliveryCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No delivery record found.' });
        }
        
        const deliveredDate = new Date(deliveryCheck.rows[0].delivered_at);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 7);
        if (deliveredDate < limitDate) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Returns only allowed within 7 days of delivery.' });
        }

        // Log return request
        await client.query(
            `INSERT INTO returns (order_id, customer_id, reason, condition, status)
             VALUES ($1, $2, $3, $4, 'approved')`,
            [order.order_id, order.customer_id, reason, condition]
        );

        // Update status
        await client.query(
            `UPDATE orders SET order_status = 'returned' WHERE order_id = $1`,
            [order.order_id]
        );

        // Restore stock if item condition is acceptable
        if (condition === 'unopened' || condition === 'opened_unused') {
            const items = await client.query(
                'SELECT prod_var_id, quantity FROM order_items WHERE order_id = $1',
                [order.order_id]
            );
            for (const item of items.rows) {
                await client.query(
                    `UPDATE product_variants SET stock_quantity = stock_quantity + $1 WHERE prod_var_id = $2`,
                    [item.quantity, item.prod_var_id]
                );
            }
        }

        // Log return notification
        await client.query(
            `INSERT INTO notifications (customer_id, title, message)
             VALUES ($1, 'Return Approved', 'Your return for order ' || $2 || ' has been approved.')`,
            [order.customer_id, order.order_number]
        );

        await client.query('COMMIT');
        res.json({ message: 'Return processed successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

