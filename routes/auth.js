const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const JWT_SECRET="0f377d7d618abfebf456d05b073e7b41489c92e42604891a2a5b6e083032f71d"

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, room_number } = req.body;

        // Validation
        if (!name || !email || !password || !room_number) {
            return res.status(400).json({ 
                error: 'All fields are required.' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long.' 
            });
        }

        // Check if user already exists
        const userExists = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ 
                error: 'User with this email already exists.' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const result = await db.query(
            `INSERT INTO users (name, email, password, room_number) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, room_number, is_admin, created_at`,
            [name, email.toLowerCase(), hashedPassword, room_number]
        );

        const user = result.rows[0];

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                room_number: user.room_number,
                is_admin: user.is_admin
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            error: 'Registration failed. Please try again.' 
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required.' 
            });
        }

        // Check if user exists
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid email or password.' 
            });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(400).json({ 
                error: 'Invalid email or password.' 
            });
        }

        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                room_number: user.room_number,
                is_admin: user.is_admin
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Login failed. Please try again.' 
        });
    }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, room_number, is_admin, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'User not found.' 
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch profile.' 
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, room_number } = req.body;

        if (!name && !room_number) {
            return res.status(400).json({ 
                error: 'At least one field (name or room_number) is required.' 
            });
        }

        let query = 'UPDATE users SET ';
        const values = [];
        const updates = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (room_number) {
            updates.push(`room_number = $${paramCount}`);
            values.push(room_number);
            paramCount++;
        }

        query += updates.join(', ');
        query += ` WHERE id = $${paramCount} RETURNING id, name, email, room_number, is_admin`;
        values.push(req.user.id);

        const result = await db.query(query, values);

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            error: 'Failed to update profile.' 
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                error: 'Current password and new password are required.' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                error: 'New password must be at least 6 characters long.' 
            });
        }

        // Get current password
        const result = await db.query(
            'SELECT password FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'User not found.' 
            });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(
            currentPassword, 
            result.rows[0].password
        );

        if (!validPassword) {
            return res.status(400).json({ 
                error: 'Current password is incorrect.' 
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, req.user.id]
        );

        res.json({ 
            message: 'Password changed successfully.' 
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ 
            error: 'Failed to change password.' 
        });
    }
});

module.exports = router;