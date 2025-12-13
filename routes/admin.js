const express = require('express');
const db = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authenticateToken);
router.use(isAdmin);

// ============= ORDER MANAGEMENT =============

// Get all orders (with filters)
router.get('/orders', async (req, res) => {
    try {
        const { status, date, limit = 100 } = req.query;

        let query = `
            SELECT 
                o.id, 
                o.total_amount, 
                o.status, 
                o.created_at,
                o.updated_at,
                o.order_type,
                u.name as user_name,
                u.email as user_email,
                u.room_number,
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
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items m ON oi.menu_item_id = m.id
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 1;

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        if (date) {
            query += ` AND DATE(o.created_at) = $${paramCount}`;
            values.push(date);
            paramCount++;
        }

        query += `
            GROUP BY o.id, o.order_type, u.name, u.email, u.room_number
            ORDER BY o.created_at DESC
            LIMIT $${paramCount}
        `;
        values.push(parseInt(limit));

        const result = await db.query(query, values);
        
        res.json(result.rows);

    } catch (error) {
        console.error('Admin orders fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch orders.' 
        });
    }
});

// Get specific order details
router.get('/orders/:id', async (req, res) => {
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
            WHERE o.id = $1
            GROUP BY o.id, u.name, u.email, u.room_number
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found.' 
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Admin order fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch order details.' 
        });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: `Status must be one of: ${validStatuses.join(', ')}` 
            });
        }

        // Check if order exists
        const orderCheck = await db.query(
            'SELECT id FROM orders WHERE id = $1',
            [id]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found.' 
            });
        }

        // Update status
        await db.query(
            'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );

        res.json({ 
            message: 'Order status updated successfully.',
            order_id: id,
            new_status: status
        });

    } catch (error) {
        console.error('Order status update error:', error);
        res.status(500).json({ 
            error: 'Failed to update order status.' 
        });
    }
});

// Delete order
router.delete('/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM orders WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found.' 
            });
        }

        res.json({ 
            message: 'Order deleted successfully.' 
        });

    } catch (error) {
        console.error('Order deletion error:', error);
        res.status(500).json({ 
            error: 'Failed to delete order.' 
        });
    }
});

// ============= MENU MANAGEMENT =============

// Get all menu items (including unavailable)
router.get('/menu', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM menu_items ORDER BY category, name'
        );
        
        res.json(result.rows);

    } catch (error) {
        console.error('Admin menu fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch menu items.' 
        });
    }
});

// Add new menu item
router.post('/menu', async (req, res) => {
    try {
        const { name, description, price, original_price, category, image_url } = req.body;

        // Validation
        if (!name || !price || !category) {
            return res.status(400).json({ 
                error: 'Name, price, and category are required.' 
            });
        }

        if (isNaN(price) || parseFloat(price) <= 0) {
            return res.status(400).json({ 
                error: 'Price must be a positive number.' 
            });
        }

        const result = await db.query(
            `INSERT INTO menu_items 
             (name, description, price, original_price, category, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, description, price, original_price, category, image_url]
        );

        res.status(201).json({
            message: 'Menu item added successfully.',
            item: result.rows[0]
        });

    } catch (error) {
        console.error('Menu item creation error:', error);
        res.status(500).json({ 
            error: 'Failed to add menu item.' 
        });
    }
});

// Update menu item
router.put('/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, original_price, category, image_url, available } = req.body;

        // Check if item exists
        const itemCheck = await db.query(
            'SELECT id FROM menu_items WHERE id = $1',
            [id]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Menu item not found.' 
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (description !== undefined) {
            updates.push(`description = $${paramCount}`);
            values.push(description);
            paramCount++;
        }

        if (price !== undefined) {
            if (isNaN(price) || parseFloat(price) <= 0) {
                return res.status(400).json({ 
                    error: 'Price must be a positive number.' 
                });
            }
            updates.push(`price = $${paramCount}`);
            values.push(price);
            paramCount++;
        }

        if (original_price !== undefined) {
            updates.push(`original_price = $${paramCount}`);
            values.push(original_price);
            paramCount++;
        }

        if (category !== undefined) {
            updates.push(`category = $${paramCount}`);
            values.push(category);
            paramCount++;
        }

        if (image_url !== undefined) {
            updates.push(`image_url = $${paramCount}`);
            values.push(image_url);
            paramCount++;
        }

        if (available !== undefined) {
            updates.push(`available = $${paramCount}`);
            values.push(available);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                error: 'No fields to update.' 
            });
        }

        const query = `
            UPDATE menu_items 
            SET ${updates.join(', ')} 
            WHERE id = $${paramCount} 
            RETURNING *
        `;
        values.push(id);

        const result = await db.query(query, values);

        res.json({
            message: 'Menu item updated successfully.',
            item: result.rows[0]
        });

    } catch (error) {
        console.error('Menu item update error:', error);
        res.status(500).json({ 
            error: 'Failed to update menu item.' 
        });
    }
});

// Delete menu item
router.delete('/menu/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM menu_items WHERE id = $1 RETURNING id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Menu item not found.' 
            });
        }

        res.json({ 
            message: 'Menu item deleted successfully.' 
        });

    } catch (error) {
        console.error('Menu item deletion error:', error);
        res.status(500).json({ 
            error: 'Failed to delete menu item.' 
        });
    }
});

// ============= STATISTICS =============

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'Pending') as pending_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'Preparing') as preparing_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'Ready') as ready_orders,
                (SELECT COUNT(*) FROM orders WHERE status = 'Completed') as completed_orders,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'Completed') as completed_revenue,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM menu_items WHERE available = true) as available_items
        `);

        res.json(stats.rows[0]);

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch statistics.' 
        });
    }
});

// Get revenue by date range
router.get('/stats/revenue', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue
            FROM orders
            WHERE 1=1
        `;

        const values = [];
        let paramCount = 1;

        if (start_date) {
            query += ` AND DATE(created_at) >= $${paramCount}`;
            values.push(start_date);
            paramCount++;
        }

        if (end_date) {
            query += ` AND DATE(created_at) <= $${paramCount}`;
            values.push(end_date);
            paramCount++;
        }

        query += ' GROUP BY DATE(created_at) ORDER BY date DESC';

        const result = await db.query(query, values);
        
        res.json(result.rows);

    } catch (error) {
        console.error('Revenue stats error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch revenue statistics.' 
        });
    }
});

// Get top selling items
router.get('/stats/top-items', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const result = await db.query(`
            SELECT 
                m.id,
                m.name,
                m.category,
                m.price,
                COUNT(oi.id) as order_count,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM menu_items m
            JOIN order_items oi ON m.id = oi.menu_item_id
            GROUP BY m.id
            ORDER BY total_quantity DESC
            LIMIT $1
        `, [parseInt(limit)]);

        res.json(result.rows);

    } catch (error) {
        console.error('Top items fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch top selling items.' 
        });
    }
});

module.exports = router;