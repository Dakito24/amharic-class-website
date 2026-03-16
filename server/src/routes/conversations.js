import { Router } from 'express';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { requireUser } from '../middleware/requireUser.js';
import { awardXP } from '../helpers/xp.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const conversations = JSON.parse(readFileSync(join(__dirname, '../../data/conversations.json'), 'utf-8'));

const router = Router();

// GET /api/conversations - list all scenarios
router.get('/', (req, res) => {
  const list = conversations.map(({ turns, ...rest }) => ({
    ...rest,
    turn_count: turns.filter(t => t.type === 'user').length
  }));
  res.json(list);
});

// GET /api/conversations/:id - full conversation
router.get('/:id', (req, res) => {
  const convo = conversations.find(c => c.id === Number(req.params.id));
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json(convo);
});

// POST /api/conversations/:id/complete - award XP for completing a conversation
router.post('/:id/complete', requireUser, (req, res) => {
  const convo = conversations.find(c => c.id === Number(req.params.id));
  if (!convo) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const result = awardXP(req.userId, convo.xp_reward);
  res.json({
    xp_earned: convo.xp_reward,
    ...result
  });
});

export default router;
