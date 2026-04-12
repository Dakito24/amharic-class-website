import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';
import { recordAttempt } from '../helpers/xp.js';

const router = Router();

// GET /api/quizzes/:lessonId - get quiz questions for a lesson
router.get('/:lessonId', async (req, res) => {
  const questions = await db.prepare(
    'SELECT * FROM quiz_questions WHERE lesson_id = ? ORDER BY id'
  ).all(req.params.lessonId);

  const parsed = questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null
  }));

  res.json(parsed);
});

// POST /api/quizzes/submit - submit quiz answers, return score + XP
router.post('/submit', requireUser, async (req, res) => {
  const { lesson_id, answers } = req.body;
  // answers is an array of { question_id, user_answer }

  if (!lesson_id || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'lesson_id and answers array required' });
  }

  const questions = await db.prepare(
    'SELECT * FROM quiz_questions WHERE lesson_id = ?'
  ).all(lesson_id);

  let correct = 0;
  let totalXpEarned = 0;
  const results = [];

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) continue;

    const isCorrect = answer.user_answer === question.correct_answer;
    if (isCorrect) {
      correct++;
      totalXpEarned += question.xp_reward;
    }

    // Record attempt for weak words tracking
    await recordAttempt(req.userId, question.id, lesson_id, answer.user_answer, question.correct_answer, isCorrect, 'standard');

    results.push({
      question_id: question.id,
      correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation
    });
  }

  // Bonus XP for perfect score
  const isPerfect = correct === answers.length && answers.length > 0;
  if (isPerfect) {
    totalXpEarned += 15;
  }

  // Update user progress
  const progress = await db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const newXp = progress.total_xp + totalXpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;

  const achievements = JSON.parse(progress.achievements);
  const newAchievements = [];

  if (isPerfect && !achievements.includes('quiz_champion')) {
    achievements.push('quiz_champion');
    newAchievements.push({ key: 'quiz_champion', title: 'Quiz Champion', description: 'Get 100% on any quiz' });
  }

  const today = new Date().toISOString().split('T')[0];
  await db.prepare(`
    UPDATE user_progress SET total_xp = ?, level = ?, achievements = ?, last_activity_date = ?
    WHERE user_id = ?
  `).run(newXp, newLevel, JSON.stringify(achievements), today, req.userId);

  res.json({
    score: correct,
    total: answers.length,
    percentage: Math.round((correct / answers.length) * 100),
    xp_earned: totalXpEarned,
    perfect: isPerfect,
    total_xp: newXp,
    level: newLevel,
    leveled_up: leveledUp,
    new_achievements: newAchievements,
    results
  });
});

export default router;
