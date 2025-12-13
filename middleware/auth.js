const jwt = require('jsonwebtoken');
const db = require('../db');

// Verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Access denied. No token provided.' 
        });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // { id, email }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                error: 'Token expired. Please login again.' 
            });
        }
        return res.status(403).json({ 
            error: 'Invalid token.' 
        });
    }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'User not found.' 
            });
        }

        if (!result.rows[0].is_admin) {
            return res.status(403).json({ 
                error: 'Access denied. Admin privileges required.' 
            });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        return res.status(500).json({ 
            error: 'Server error while verifying admin status.' 
        });
    }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
    } catch (error) {
        req.user = null;
    }
    
    next();
};

module.exports = {
    authenticateToken,
    isAdmin,
    optionalAuth
};