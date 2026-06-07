const express = require('express');
const router = express.Router();
const pool = require('./db');
const { authenticateToken } = require('./middleware');

router.use(authenticateToken);

// Create a support ticket
router.post('/', async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message are required.' });
    }
    try {
        const ticket = await pool.query(
            `INSERT INTO support_tickets (customer_id, subject, message)
             VALUES ($1::uuid, $2, $3)
             RETURNING *`,
            [req.user.customer_id, subject, message]
        );
        const ticketId = ticket.rows[0].ticket_id;
        
        // Immediate mock admin response
        await pool.query(
            `INSERT INTO ticket_responses (ticket_id, sender, message)
             VALUES ($1, 'admin', $2)`,
            [ticketId, `Hello! Thank you for contacting Trendora Support. We have received your query regarding "${subject}" and our team is looking into it.`]
        );

        res.status(201).json(ticket.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List all customer tickets
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM support_tickets
             WHERE customer_id = $1::uuid
             ORDER BY created_at DESC`,
            [req.user.customer_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get ticket details and replies
router.get('/:ticket_id', async (req, res) => {
    try {
        const ticketCheck = await pool.query(
            `SELECT * FROM support_tickets WHERE ticket_id = $1`,
            [req.params.ticket_id]
        );
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Support ticket not found.' });
        }
        if (ticketCheck.rows[0].customer_id !== req.user.customer_id) {
            return res.status(403).json({ error: 'Unauthorized to view this ticket.' });
        }

        const responses = await pool.query(
            `SELECT * FROM ticket_responses
             WHERE ticket_id = $1
             ORDER BY created_at ASC`,
            [req.params.ticket_id]
        );

        res.json({ ticket: ticketCheck.rows[0], responses: responses.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Respond to a ticket
router.post('/:ticket_id/respond', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }
    try {
        const ticketCheck = await pool.query(
            `SELECT customer_id FROM support_tickets WHERE ticket_id = $1`,
            [req.params.ticket_id]
        );
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Support ticket not found.' });
        }
        if (ticketCheck.rows[0].customer_id !== req.user.customer_id) {
            return res.status(403).json({ error: 'Unauthorized.' });
        }

        const customerReply = await pool.query(
            `INSERT INTO ticket_responses (ticket_id, sender, message)
             VALUES ($1, 'customer', $2)
             RETURNING *`,
            [req.params.ticket_id, message]
        );

        // Auto-reply mock agent response after 1 second
        setTimeout(async () => {
            try {
                await pool.query(
                    `INSERT INTO ticket_responses (ticket_id, sender, message)
                     VALUES ($1, 'admin', 'Thank you for updating your ticket. Our specialists will review this info and respond shortly.')`,
                    [req.params.ticket_id]
                );
            } catch (e) {
                console.error('Failed to add auto admin reply:', e.message);
            }
        }, 1000);

        res.status(201).json(customerReply.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
