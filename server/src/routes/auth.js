import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'amharic-class-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '30d';

function generateToken(user) {
    return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

function getUserWithProgress(userId) {
    return db.prepare(`
    SELECT u.id, u.username, u.name, u.avatar_color, u.created_at,
           COALESCE(up.total_xp, 0) as total_xp,
           COALESCE(up.level, 1) as level
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    WHERE u.id = ?
  `).get(userId);
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password, confirmPassword, name, avatar_color } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Username is required' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const displayName = (name || username).trim();

        // Check if username already exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (username, name, avatar_color, password_hash) VALUES (?, ?, ?, ?)'
        ).run(cleanUsername, displayName, avatar_color || '#e94560', passwordHash);

        const userId = result.lastInsertRowid;

        // Create corresponding user_progress row
        db.prepare('INSERT INTO user_progress (user_id) VALUES (?)').run(userId);

        const user = getUserWithProgress(userId);
        const token = generateToken(user);

        res.status(201).json({ token, user });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const cleanUsername = username.trim().toLowerCase();

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const userData = getUserWithProgress(user.id);
        const token = generateToken(user);

        res.json({ token, user: userData });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me — validate token and return current user
router.get('/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = getUserWithProgress(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// POST /api/auth/change-password — change password (requires valid token)
router.post('/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const { currentPassword, newPassword, confirmNewPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ error: 'New passwords do not match' });
        }

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
