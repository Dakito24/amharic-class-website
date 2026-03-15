import db from '../db.js';

export function requireUser(req, res, next) {
  if (!req.userId) {
    return res.status(400).json({ error: 'X-User-Id header required' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  next();
}
