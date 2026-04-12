import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';
import { awardXP } from '../helpers/xp.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Load conversations.json for story adventures
const conversationsPath = join(__dirname, '../../data/conversations.json');
let conversations = [];
try {
  conversations = JSON.parse(readFileSync(conversationsPath, 'utf-8'));
} catch (err) {
  console.error('Failed to load conversations.json:', err);
}

// Picture match category mappings
const PICTURE_MATCH_CATEGORIES = {
  animals: ['cat', 'dog', 'bird', 'lion', 'elephant', 'monkey', 'snake', 'fish', 'horse', 'chicken', 'cow', 'sheep'],
  food: ['bread', 'water', 'coffee', 'meat', 'banana', 'orange', 'milk', 'egg', 'rice', 'sugar', 'salt', 'pepper'],
  body_parts: ['head', 'eye', 'ear', 'nose', 'mouth', 'hand', 'foot', 'leg', 'arm', 'finger', 'heart', 'stomach'],
  colors: ['black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'orange', 'pink', 'purple', 'gray', 'gold'],
  clothing: ['shirt', 'pants', 'shoe', 'dress', 'hat', 'coat', 'belt', 'sock', 'jacket', 'skirt', 'scarf', 'glove'],
  household: ['house', 'door', 'window', 'table', 'chair', 'bed', 'kitchen', 'bathroom', 'room', 'wall', 'floor', 'roof']
};

// Generate a deterministic random seed based on date
function getDailySeed() {
  const today = new Date().toISOString().split('T')[0];
  return today.split('-').reduce((acc, val) => acc + parseInt(val), 0);
}

// Seeded random number generator (simple LCG)
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Get daily challenge type based on today's seed
function getDailyChallengeType(seed) {
  const types = ['quiz', 'flashcard', 'listening', 'speed-typing', 'memory'];
  const index = Math.floor(seededRandom(seed) * types.length);
  return types[index];
}

// GET /api/games/daily-challenge - Returns today's daily challenge
router.get('/daily-challenge', requireUser, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const seed = getDailySeed();
  const challengeType = getDailyChallengeType(seed);

  // Check if user has completed today's challenge
  const completed = await db.prepare(
    'SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?'
  ).get(req.userId, today);

  let data = {};

  // Generate challenge data based on type
  switch (challengeType) {
    case 'quiz': {
      const questions = await db.prepare(`
        SELECT * FROM quiz_questions
        WHERE question_type = 'multiple_choice' AND options IS NOT NULL
        ORDER BY RANDOM()
        LIMIT 10
      `).all();
      data = {
        questions: questions.map(q => ({ ...q, options: JSON.parse(q.options) }))
      };
      break;
    }
    case 'flashcard': {
      const vocab = await db.prepare(`
        SELECT * FROM vocabulary
        ORDER BY RANDOM()
        LIMIT 15
      `).all();
      data = { vocabulary: vocab };
      break;
    }
    case 'listening': {
      const vocab = await db.prepare(`
        SELECT * FROM vocabulary
        WHERE audio_url IS NOT NULL
        ORDER BY RANDOM()
        LIMIT 10
      `).all();
      data = { vocabulary: vocab };
      break;
    }
    case 'speed-typing': {
      const vocab = await db.prepare(`
        SELECT * FROM vocabulary
        ORDER BY RANDOM()
        LIMIT 20
      `).all();
      data = { vocabulary: vocab };
      break;
    }
    case 'memory': {
      const vocab = await db.prepare(`
        SELECT * FROM vocabulary
        ORDER BY RANDOM()
        LIMIT 12
      `).all();
      data = { vocabulary: vocab };
      break;
    }
  }

  res.json({
    id: `${today}-${challengeType}`,
    date: today,
    type: challengeType,
    data,
    completed: !!completed,
    score: completed?.score || null,
    time_taken_ms: completed?.time_taken_ms || null
  });
});

// POST /api/games/daily-challenge/complete - Marks today's challenge complete
router.post('/daily-challenge/complete', requireUser, async (req, res) => {
  const { score, time_taken_ms } = req.body;
  const today = new Date().toISOString().split('T')[0];
  const seed = getDailySeed();
  const challengeType = getDailyChallengeType(seed);

  if (score === undefined) {
    return res.status(400).json({ error: 'score is required' });
  }

  // Check if already completed
  const existing = await db.prepare(
    'SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?'
  ).get(req.userId, today);

  if (existing) {
    return res.status(400).json({ error: 'Daily challenge already completed' });
  }

  // Calculate XP based on score (score is typically 0-100 or number of correct answers)
  const xpEarned = Math.max(10, Math.floor(score / 2)); // At least 10 XP, up to 50 for perfect score

  // Save challenge completion
  await db.prepare(`
    INSERT INTO daily_challenges (user_id, challenge_date, challenge_type, score, time_taken_ms)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.userId, today, challengeType, score, time_taken_ms || null);

  // Award XP
  const { total_xp, level, leveled_up } = await awardXP(req.userId, xpEarned);

  // Calculate streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const completedYesterday = await db.prepare(
    'SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?'
  ).get(req.userId, yesterday);

  const progress = await db.prepare('SELECT current_streak FROM user_progress WHERE user_id = ?').get(req.userId);
  const newStreak = completedYesterday ? (progress.current_streak + 1) : 1;

  // Update streak
  await db.prepare(
    'UPDATE user_progress SET current_streak = ?, longest_streak = MAX(longest_streak, ?) WHERE user_id = ?'
  ).run(newStreak, newStreak, req.userId);

  res.json({
    xp_earned: xpEarned,
    total_xp,
    level,
    leveled_up,
    streak: newStreak
  });
});

// GET /api/games/high-scores/:game_type - Gets leaderboard
router.get('/high-scores/:game_type', async (req, res) => {
  const { game_type } = req.params;
  const userId = req.userId;

  // Get top 20 scores
  const topScores = await db.prepare(`
    SELECT gs.*, u.name as username, u.avatar_color
    FROM game_scores gs
    JOIN users u ON gs.user_id = u.id
    WHERE gs.game_type = ?
    ORDER BY gs.score DESC
    LIMIT 20
  `).all(game_type);

  let userRank = null;
  let userBestScore = null;

  if (userId) {
    // Get user's best score and rank
    userBestScore = await db.prepare(`
      SELECT MAX(score) as best_score FROM game_scores
      WHERE user_id = ? AND game_type = ?
    `).get(userId, game_type);

    if (userBestScore?.best_score) {
      const rank = await db.prepare(`
        SELECT COUNT(DISTINCT score) + 1 as rank FROM game_scores
        WHERE game_type = ? AND score > ?
      `).get(game_type, userBestScore.best_score);
      userRank = rank.rank;
    }
  }

  res.json({
    leaderboard: topScores,
    user_rank: userRank,
    user_best_score: userBestScore?.best_score || null
  });
});

// POST /api/games/score - Saves a game score
router.post('/score', requireUser, async (req, res) => {
  const { game_type, score, time_taken_ms, metadata } = req.body;

  if (!game_type || score === undefined) {
    return res.status(400).json({ error: 'game_type and score are required' });
  }

  // Save the score
  await db.prepare(`
    INSERT INTO game_scores (user_id, game_type, score, time_taken_ms, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.userId,
    game_type,
    score,
    time_taken_ms || null,
    metadata ? JSON.stringify(metadata) : null
  );

  // Award XP (score / 10, minimum 5, maximum 50)
  const xpEarned = Math.max(5, Math.min(50, Math.floor(score / 10)));
  const { total_xp, level, leveled_up } = await awardXP(req.userId, xpEarned);

  // Check if this is a high score
  const bestScore = await db.prepare(`
    SELECT MAX(score) as best FROM game_scores
    WHERE user_id = ? AND game_type = ?
  `).get(req.userId, game_type);

  const isHighScore = score >= bestScore.best;

  // Get user's rank
  const rank = await db.prepare(`
    SELECT COUNT(DISTINCT score) + 1 as rank FROM game_scores
    WHERE game_type = ? AND score > ?
  `).get(game_type, score);

  res.json({
    xp_earned: xpEarned,
    total_xp,
    level,
    leveled_up,
    high_score: isHighScore,
    rank: rank.rank
  });
});

// GET /api/games/picture-match/categories - Gets available picture match categories
router.get('/picture-match/categories', async (req, res) => {
  const categories = [];

  for (const category of Object.keys(PICTURE_MATCH_CATEGORIES)) {
    // Count how many vocab words we have for this category
    const words = PICTURE_MATCH_CATEGORIES[category];
    const placeholders = words.map(() => '?').join(',');
    const count = await db.prepare(`
      SELECT COUNT(*) as count FROM vocabulary
      WHERE LOWER(english) IN (${placeholders})
    `).get(...words);

    categories.push({
      id: category,
      name: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      word_count: count.count,
      available: count.count >= 8 // Need at least 8 words for a good game
    });
  }

  res.json(categories);
});

// GET /api/games/picture-match/data?category=animals - Gets picture match game data
router.get('/picture-match/data', async (req, res) => {
  const { category } = req.query;

  if (!category || !PICTURE_MATCH_CATEGORIES[category]) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const words = PICTURE_MATCH_CATEGORIES[category];
  const placeholders = words.map(() => '?').join(',');

  const vocab = await db.prepare(`
    SELECT * FROM vocabulary
    WHERE LOWER(english) IN (${placeholders})
    ORDER BY RANDOM()
    LIMIT 12
  `).all(...words);

  // Map vocabulary to include emoji/icon hints
  const vocabWithIcons = vocab.map(v => ({
    ...v,
    icon: getIconForWord(v.english.toLowerCase())
  }));

  res.json({
    category,
    vocabulary: vocabWithIcons
  });
});

// Helper function to get icon/emoji for common words
function getIconForWord(word) {
  const iconMap = {
    // Animals
    cat: '🐱', dog: '🐕', bird: '🐦', lion: '🦁', elephant: '🐘',
    monkey: '🐵', snake: '🐍', fish: '🐟', horse: '🐴', chicken: '🐔',
    cow: '🐄', sheep: '🐑',
    // Food
    bread: '🍞', water: '💧', coffee: '☕', meat: '🥩', banana: '🍌',
    orange: '🍊', milk: '🥛', egg: '🥚', rice: '🍚', sugar: '🍬',
    salt: '🧂', pepper: '🌶️',
    // Body parts
    head: '👤', eye: '👁️', ear: '👂', nose: '👃', mouth: '👄',
    hand: '✋', foot: '🦶', leg: '🦵', arm: '💪', finger: '☝️',
    heart: '❤️', stomach: '🫃',
    // Colors
    black: '⬛', white: '⬜', red: '🟥', blue: '🟦', green: '🟩',
    yellow: '🟨', brown: '🟫', orange: '🟧', pink: '🌸', purple: '🟪',
    gray: '⬜', gold: '🏆',
    // Clothing
    shirt: '👕', pants: '👖', shoe: '👞', dress: '👗', hat: '🎩',
    coat: '🧥', belt: '🔗', sock: '🧦', jacket: '🧥', skirt: '👗',
    scarf: '🧣', glove: '🧤',
    // Household
    house: '🏠', door: '🚪', window: '🪟', table: '🪑', chair: '🪑',
    bed: '🛏️', kitchen: '🍳', bathroom: '🚽', room: '🏠', wall: '🧱',
    floor: '⬛', roof: '🏠'
  };

  return iconMap[word] || '❓';
}

// GET /api/games/story-adventure/chapters - Lists available story chapters
router.get('/story-adventure/chapters', (req, res) => {
  const chapters = conversations.map(conv => ({
    id: conv.id,
    title: conv.title,
    description: conv.description,
    difficulty: conv.difficulty,
    xp_reward: conv.xp_reward,
    turn_count: conv.turns.length
  }));

  res.json(chapters);
});

// GET /api/games/story-adventure/:id - Gets specific story chapter
router.get('/story-adventure/:id', (req, res) => {
  const chapter = conversations.find(c => c.id === parseInt(req.params.id));

  if (!chapter) {
    return res.status(404).json({ error: 'Story chapter not found' });
  }

  res.json(chapter);
});

// POST /api/games/story-adventure/:id/complete - Completes a story chapter
router.post('/story-adventure/:id/complete', requireUser, async (req, res) => {
  const chapterId = parseInt(req.params.id);
  const { choices } = req.body;

  const chapter = conversations.find(c => c.id === chapterId);

  if (!chapter) {
    return res.status(404).json({ error: 'Story chapter not found' });
  }

  // Award XP based on chapter reward
  const xpEarned = chapter.xp_reward || 50;
  const { total_xp, level, leveled_up } = await awardXP(req.userId, xpEarned);

  // Save the score
  await db.prepare(`
    INSERT INTO game_scores (user_id, game_type, score, metadata)
    VALUES (?, ?, ?, ?)
  `).run(
    req.userId,
    'story-adventure',
    xpEarned,
    choices ? JSON.stringify({ chapter_id: chapterId, choices }) : null
  );

  res.json({
    xp_earned: xpEarned,
    total_xp,
    level,
    leveled_up
  });
});

export default router;
