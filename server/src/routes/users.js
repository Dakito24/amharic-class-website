import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/users - list all profiles
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.avatar_color, u.created_at,
           COALESCE(up.total_xp, 0) as total_xp,
           COALESCE(up.level, 1) as level
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    ORDER BY u.created_at
  `).all();
  res.json(users);
});

// POST /api/users - create new profile
router.post('/', (req, res) => {
  const { name, avatar_color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(
    'INSERT INTO users (name, avatar_color) VALUES (?, ?)'
  ).run(name.trim(), avatar_color || '#e94560');

  const userId = result.lastInsertRowid;

  // Create corresponding user_progress row
  db.prepare('INSERT INTO user_progress (user_id) VALUES (?)').run(userId);

  const user = db.prepare(`
    SELECT u.*, COALESCE(up.total_xp, 0) as total_xp, COALESCE(up.level, 1) as level
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    WHERE u.id = ?
  `).get(userId);
  res.status(201).json(user);
});

// GET /api/users/:id - get single profile
router.get('/:id', (req, res) => {
  const user = db.prepare(`
    SELECT u.*, COALESCE(up.total_xp, 0) as total_xp, COALESCE(up.level, 1) as level
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH /api/users/:id - update profile name/color
router.patch('/:id', (req, res) => {
  const { name, avatar_color } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newName = name?.trim() || user.name;
  const newColor = avatar_color || user.avatar_color;

  db.prepare('UPDATE users SET name = ?, avatar_color = ? WHERE id = ?')
    .run(newName, newColor, req.params.id);

  const updated = db.prepare(`
    SELECT u.*, COALESCE(up.total_xp, 0) as total_xp, COALESCE(up.level, 1) as level
    FROM users u
    LEFT JOIN user_progress up ON u.id = up.user_id
    WHERE u.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// DELETE /api/users/:id - delete profile (cascades all data)
router.delete('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Profile deleted', id: Number(req.params.id) });
});

export default router;
