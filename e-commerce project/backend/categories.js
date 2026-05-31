const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────────
// GET /api/categories
// Returns all categories with product counts.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                c.cat_id,
                c.cat_name,
                COUNT(p.prod_id) AS product_count
             FROM categories c
             LEFT JOIN product p ON p.cat_id = c.cat_id
             GROUP BY c.cat_id, c.cat_name
             ORDER BY c.cat_name ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
