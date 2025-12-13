const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create new order
router.post('/', async (req, res) => {
    const client = await db.getClient();
    
    try {
        const { items, order_type } = req.body;

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                error: 'Order must contain at least one item.' 
            });
        }

        await client.query('BEGIN');

        // Verify all items exist and are available
        for (const item of items) {
            if (!item.menu_item_id || !item.quantity || !item.price) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Each item must have menu_item_id, quantity, and price.' 
                });
            }

            const menuItem = await client.query(
                'SELECT available FROM menu_items WHERE id = $1',
                [item.menu_item_id]
            );

            if (menuItem.rows.length === 0 || !menuItem.rows[0].available) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Menu item with id ${item.menu_item_id} is not available.` 
                });
            }
        }

        // Calculate total
        const total = items.reduce((sum, item) => {
            return sum + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);

        // Create order with order_type (default to 'Inhouse' if not provided)
        const orderType = order_type || 'Inhouse';
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, status, order_type) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [req.user.id, total, 'Pending', orderType]
        );

        const orderId = orderResult.rows[0].id;

        // Insert order items
        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
                 VALUES ($1, $2, $3, $4)`,
                [orderId, item.menu_item_id, item.quantity, item.price]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Order placed successfully',
            order_id: orderId,
            total_amount: total
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Order creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create order.' 
        });
    } finally {
        client.release();
    }
});

// Get user's orders
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;

        let query = `
            SELECT 
                o.id, 
                o.total_amount, 
                o.status, 
                o.created_at,
                o.updated_at,
                o.order_type,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'name', m.name,
                            'quantity', oi.quantity,
                            'price', oi.price
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'::json
                ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items m ON oi.menu_item_id = m.id
            WHERE o.user_id = $1
        `;

        const values = [req.user.id];
        let paramCount = 2;

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        query += `
            GROUP BY o.id, o.order_type
            ORDER BY o.created_at DESC
            LIMIT $${paramCount}
        `;
        values.push(parseInt(limit));

        const result = await db.query(query, values);
        
        res.json(result.rows);

    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch orders.' 
        });
    }
});

// Get specific order details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT 
                o.*,
                u.name as user_name,
                u.email as user_email,
                u.room_number,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'name', m.name,
                            'description', m.description,
                            'quantity', oi.quantity,
                            'price', oi.price,
                            'image_url', m.image_url
                        )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'::json
                ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items m ON oi.menu_item_id = m.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id, u.name, u.email, u.room_number
        `, [id, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found.' 
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order details.' 
        });
    }
});

// Cancel order (only if status is Pending)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if order belongs to user and is pending
        const orderCheck = await db.query(
            'SELECT status FROM orders WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found.' 
            });
        }

        if (orderCheck.rows[0].status !== 'Pending') {
            return res.status(400).json({ 
                error: 'Only pending orders can be cancelled.' 
            });
        }

        // Update order status to Cancelled
        await db.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            ['Cancelled', id]
        );

        res.json({ 
            message: 'Order cancelled successfully.' 
        });

    } catch (error) {
        console.error('Order cancellation error:', error);
        res.status(500).json({ 
            error: 'Failed to cancel order.' 
        });
    }
});

// Get order statistics for user
router.get('/meta/stats', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'Preparing' THEN 1 END) as preparing_orders,
                COUNT(CASE WHEN status = 'Ready' THEN 1 END) as ready_orders,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
                COALESCE(SUM(total_amount), 0) as total_spent
            FROM orders
            WHERE user_id = $1
        `, [req.user.id]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order statistics.' 
        });
    }
});

module.exports = router;