import { Router } from 'express';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const articles = JSON.parse(readFileSync(join(__dirname, '../../data/culture.json'), 'utf-8'));

const router = Router();

// GET /api/culture - list all articles
router.get('/', (req, res) => {
  const list = articles.map(({ sections, vocab_highlights, ...rest }) => rest);
  res.json(list);
});

// GET /api/culture/:id - full article
router.get('/:id', (req, res) => {
  const article = articles.find(a => a.id === Number(req.params.id));
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

export default router;
