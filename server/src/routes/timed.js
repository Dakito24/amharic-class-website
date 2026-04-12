import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';
import { recordAttempt } from '../helpers/xp.js';

const router = Router();

const DIFFICULTY_CONFIG = {
  easy: { questions: 10, timeMs: 120000, xpMultiplier: 1 },
  medium: { questions: 15, timeMs: 90000, xpMultiplier: 1.5 },
  hard: { questions: 20, timeMs: 60000, xpMultiplier: 2 }
};

// GET /api/timed/start?difficulty= - get random MC questions + time limit
router.get('/start', requireUser, async (req, res) => {
  const difficulty = req.query.difficulty || 'medium';
  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    return res.status(400).json({ error: 'Invalid difficulty. Use easy, medium, or hard.' });
  }

  const questions = await db.prepare(`
    SELECT * FROM quiz_questions
    WHERE question_type = 'multiple_choice' AND options IS NOT NULL
    ORDER BY RANDOM()
    LIMIT ?
  `).all(config.questions);

  const parsed = questions.map(q => ({
    ...q,
    options: JSON.parse(q.options)
  }));

  res.json({
    difficulty,
    time_limit_ms: config.timeMs,
    xp_multiplier: config.xpMultiplier,
    questions: parsed
  });
});

// POST /api/timed/submit - grade timed challenge
router.post('/submit', requireUser, async (req, res) => {
  const { difficulty, answers, time_remaining_ms } = req.body;

  if (!difficulty || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'difficulty and answers array required' });
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  if (!config) {
    return res.status(400).json({ error: 'Invalid difficulty' });
  }

  const questionIds = answers.map(a => a.question_id);
  const placeholders = questionIds.map(() => '?').join(',');
  const questions = questionIds.length > 0
    ? await db.prepare(`SELECT * FROM quiz_questions WHERE id IN (${placeholders})`).all(...questionIds)
    : [];

  let correct = 0;
  const results = [];

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) continue;

    const isCorrect = answer.user_answer === question.correct_answer;
    if (isCorrect) correct++;

    await recordAttempt(req.userId, question.id, question.lesson_id, answer.user_answer, question.correct_answer, isCorrect, 'timed', answer.time_taken_ms || null);

    results.push({
      question_id: question.id,
      correct: isCorrect,
      correct_answer: question.correct_answer
    });
  }

  // Calculate XP: base XP per correct answer * multiplier + speed bonus
  const baseXp = Math.round(correct * 5 * config.xpMultiplier);
  const speedBonus = time_remaining_ms > 0 ? Math.min(Math.floor(time_remaining_ms / 1000), 20) : 0;
  const totalXpEarned = baseXp + speedBonus;

  const score = correct * 100 + speedBonus * 10;

  // Save high score
  await db.prepare(`
    INSERT INTO high_scores (user_id, difficulty, score, correct_count, total_questions, time_remaining_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.userId, difficulty, score, correct, answers.length, time_remaining_ms || 0);

  // Update XP
  const progress = await db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const newXp = progress.total_xp + totalXpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;
  const today = new Date().toISOString().split('T')[0];

  // Check speed demon achievement
  const achievements = JSON.parse(progress.achievements);
  const newAchievements = [];
  if (correct >= answers.length && difficulty === 'hard' && !achievements.includes('speed_demon')) {
    achievements.push('speed_demon');
    newAchievements.push({ key: 'speed_demon', title: 'Speed Demon', description: 'Perfect score on hard timed challenge' });
  }

  await db.prepare(
    'UPDATE user_progress SET total_xp = ?, level = ?, achievements = ?, last_activity_date = ? WHERE user_id = ?'
  ).run(newXp, newLevel, JSON.stringify(achievements), today, req.userId);

  // Get personal best
  const personalBest = await db.prepare(
    'SELECT MAX(score) as best_score FROM high_scores WHERE user_id = ? AND difficulty = ?'
  ).get(req.userId, difficulty);

  res.json({
    score,
    correct_count: correct,
    total: answers.length,
    percentage: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
    base_xp: baseXp,
    speed_bonus: speedBonus,
    xp_earned: totalXpEarned,
    total_xp: newXp,
    level: newLevel,
    leveled_up: leveledUp,
    new_achievements: newAchievements,
    personal_best: personalBest?.best_score || score,
    is_new_best: score >= (personalBest?.best_score || 0),
    results
  });
});

// GET /api/timed/leaderboard?difficulty= - top scores
router.get('/leaderboard', async (req, res) => {
  const difficulty = req.query.difficulty || 'medium';

  const scores = await db.prepare(`
    SELECT hs.*, u.name, u.avatar_color
    FROM high_scores hs
    JOIN users u ON hs.user_id = u.id
    WHERE hs.difficulty = ?
    ORDER BY hs.score DESC
    LIMIT 20
  `).all(difficulty);

  res.json(scores);
});

export default router;
