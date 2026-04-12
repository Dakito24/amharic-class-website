import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/vocabulary - get vocabulary, filterable by category and lesson_id
router.get('/', async (req, res) => {
  const { category, lesson_id } = req.query;
  let sql = 'SELECT * FROM vocabulary WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (lesson_id) {
    sql += ' AND lesson_id = ?';
    params.push(lesson_id);
  }

  sql += ' ORDER BY lesson_id, id';
  const vocab = await db.prepare(sql).all(...params);
  res.json(vocab);
});

// GET /api/vocabulary/search?q= - search vocabulary
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const vocab = await db.prepare(`
    SELECT * FROM vocabulary
    WHERE english LIKE ? OR romanized LIKE ? OR amharic LIKE ?
    ORDER BY lesson_id, id
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);

  res.json(vocab);
});

export default router;
