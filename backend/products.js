const express = require('express');
const router  = express.Router();
const pool    = require('./db');

// ─────────────────────────────────────────────
// GET /api/products
// Returns all active products with category and vendor info.
// Uses the materialized view for speed (run caching.sql first).
// Falls back to a live query if the view doesn't exist yet.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.prod_id,
                p.prod_name,
                p.price,
                p.prod_description,
                c.cat_name,
                v.vendor_name,
                v.brand_name,
                (SELECT image_url FROM product_images WHERE prod_id = p.prod_id LIMIT 1) AS image_url
             FROM product p
             JOIN categories c ON p.cat_id    = c.cat_id
             JOIN vendor     v ON p.vendor_id = v.vendor_id
             ORDER BY p.prod_name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/products/search?q=hoodie
// Searches products by name or description.
// Uses GIN index if gin_indexes.sql has been run.
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
    const q = req.query.q || '';

    if (!q.trim()) {
        return res.status(400).json({ error: 'Search query cannot be empty.' });
    }

    try {
        const result = await pool.query(
            `SELECT
                p.prod_id,
                p.prod_name,
                p.price,
                p.prod_description,
                c.cat_name,
                v.vendor_name,
                v.brand_name,
                (SELECT image_url FROM product_images WHERE prod_id = p.prod_id LIMIT 1) AS image_url
             FROM product p
             JOIN categories c ON p.cat_id    = c.cat_id
             JOIN vendor     v ON p.vendor_id = v.vendor_id
             WHERE p.prod_name        ILIKE $1
                OR p.prod_description ILIKE $1
             LIMIT 30`,
            ['%' + q + '%']
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/products/:id
// Returns one product with all its variants and images.
// ─────────────────────────────────────────────
router.get('/category/:cat_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.prod_id,
                p.prod_name,
                p.price,
                p.prod_description,
                v.vendor_name,
                v.brand_name,
                (SELECT image_url FROM product_images WHERE prod_id = p.prod_id LIMIT 1) AS image_url
             FROM product p
             JOIN vendor v ON p.vendor_id = v.vendor_id
             WHERE p.cat_id = $1
             ORDER BY p.prod_name ASC`,
            [req.params.cat_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        // Main product info
        const product = await pool.query(
            `SELECT
                p.prod_id,
                p.prod_name,
                p.price,
                p.prod_description,
                c.cat_name,
                v.vendor_name,
                v.brand_name,
                (SELECT image_url FROM product_images WHERE prod_id = p.prod_id LIMIT 1) AS image_url
             FROM product p
             JOIN categories c ON p.cat_id    = c.cat_id
             JOIN vendor     v ON p.vendor_id = v.vendor_id
             WHERE p.prod_id = $1`,
            [req.params.id]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Variants (sizes, colors, stock)
        const variants = await pool.query(
            `SELECT prod_var_id, prod_size, prod_color, prod_price, stock_quantity
             FROM product_variants
             WHERE prod_id = $1`,
            [req.params.id]
        );

        // Images
        const images = await pool.query(
            `SELECT image_url FROM product_images WHERE prod_id = $1`,
            [req.params.id]
        );

        // Reviews
        const reviews = await pool.query(
            `SELECT r.comment, r.rating, r.created_at,
                    c.first_name, c.last_name
             FROM reviews r
             JOIN customer c ON c.customer_id = r.customer_id
             WHERE r.product_id = $1
             ORDER BY r.created_at DESC`,
            [req.params.id]
        );

        res.json({
            ...product.rows[0],
            variants:  variants.rows,
            images:    images.rows.map(i => i.image_url),
            reviews:   reviews.rows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// GET /api/products/category/:cat_id
// Returns all products under a specific category.
// ─────────────────────────────────────────────
router.get('/category/:cat_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.prod_id,
                p.prod_name,
                p.price,
                p.prod_description,
                v.vendor_name,
                v.brand_name
             FROM product p
             JOIN vendor v ON p.vendor_id = v.vendor_id
             WHERE p.cat_id = $1
             ORDER BY p.prod_name ASC`,
            [req.params.cat_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
// POST /api/products/:product_id/reviews
// Adds a review for a product.
// Body: { customer_id, comment, rating }
// ─────────────────────────────────────────────
router.post('/:id/reviews', async (req, res) => {
    const { customer_id, comment, rating } = req.body;
    const product_id = req.params.id;

    if (!customer_id || !comment || rating === undefined) {
        return res.status(400).json({ error: 'customer_id, comment, and rating are required.' });
    }

    const ratingVal = parseInt(rating, 10);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO reviews (customer_id, product_id, comment, rating)
             VALUES ($1, $2, $3, $4)
             RETURNING review_id, comment, rating, created_at`,
            [customer_id, product_id, comment, ratingVal]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Unique constraint: one review per customer per product
        if (err.code === '23505') {
            return res.status(409).json({ error: 'You have already reviewed this product.' });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
