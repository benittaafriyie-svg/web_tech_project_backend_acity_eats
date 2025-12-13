const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all menu items
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { category, available, search } = req.query;
        
        let query = 'SELECT * FROM menu_items WHERE 1=1';
        const values = [];
        let paramCount = 1;

        // Filter by category
        if (category && category !== 'All') {
            query += ` AND category = $${paramCount}`;
            values.push(category);
            paramCount++;
        }

        // Filter by availability
        if (available !== undefined) {
            query += ` AND available = $${paramCount}`;
            values.push(available === 'true');
            paramCount++;
        } else {
            // By default, only show available items
            query += ' AND available = true';
        }

        // Search by name or description
        if (search) {
            query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            values.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY category, name';

        const result = await db.query(query, values);
        
        res.json(result.rows);

    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch menu items.' 
        });
    }
});

// Get single menu item by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT * FROM menu_items WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Menu item not found.' 
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Menu item fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch menu item.' 
        });
    }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;

        const result = await db.query(
            'SELECT * FROM menu_items WHERE category = $1 AND available = true ORDER BY name',
            [category]
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Category fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch menu items for this category.' 
        });
    }
});

// Get all categories
router.get('/meta/categories', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT DISTINCT category FROM menu_items WHERE available = true ORDER BY category'
        );

        const categories = result.rows.map(row => row.category);
        
        res.json(categories);

    } catch (error) {
        console.error('Categories fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch categories.' 
        });
    }
});

// Get popular/featured items
router.get('/meta/popular', async (req, res) => {
    try {
        // Get most ordered items
        const result = await db.query(`
            SELECT 
                m.*,
                COUNT(oi.id) as order_count
            FROM menu_items m
            LEFT JOIN order_items oi ON m.id = oi.menu_item_id
            WHERE m.available = true
            GROUP BY m.id
            ORDER BY order_count DESC, m.created_at DESC
            LIMIT 6
        `);

        res.json(result.rows);

    } catch (error) {
        console.error('Popular items fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch popular items.' 
        });
    }
});

module.exports = router;