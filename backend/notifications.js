const express = require('express');
const router = express.Router();
const pool = require('./db');
const { authenticateToken } = require('./middleware');

router.use(authenticateToken);

// Fetch all notifications for the user
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM notifications
             WHERE customer_id = $1
             ORDER BY created_at DESC`,
            [req.user.customer_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all notifications as read
router.post('/read', async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE customer_id = $1`,
            [req.user.customer_id]
        );
        res.json({ message: 'Notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
