const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const VALID_ROLES = ['doctor', 'nurse', 'admin'];

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input types' });
        }
        if (username.length > 100 || password.length > 200) {
            return res.status(400).json({ error: 'Input exceeds maximum length' });
        }

        const user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Audit log
        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, details) VALUES (?, ?, ?, ?)')
            .run(user.id, 'LOGIN', 'auth', `User ${username} logged in`);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                specialty: user.specialty
            }
        });
    } catch (err) {
        console.error('[AUTH ERROR]', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register (admin only)
router.post('/register', authenticate, (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only administrators can create new users' });
        }

        const { username, password, full_name, role, specialty } = req.body;
        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Username, password, and full name required' });
        }
        if (typeof username !== 'string' || typeof password !== 'string' || typeof full_name !== 'string') {
            return res.status(400).json({ error: 'Invalid input types' });
        }
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Username must be 3-50 characters' });
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
            return res.status(400).json({ error: 'Username may only contain letters, numbers, dots, hyphens, and underscores' });
        }
        if (password.length < 8 || password.length > 200) {
            return res.status(400).json({ error: 'Password must be 8-200 characters' });
        }
        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
        }

        const existing = req.db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const id = uuidv4();
        const password_hash = bcrypt.hashSync(password, 12);

        req.db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, specialty) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, username, password_hash, full_name, role || 'doctor', specialty || null);

        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, details) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'CREATE_USER', 'users', `Created user ${username} with role ${role || 'doctor'}`);

        res.status(201).json({ id, username, full_name, role: role || 'doctor' });
    } catch (err) {
        console.error('[REGISTER ERROR]', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, user: { id: decoded.id, role: decoded.role } });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
