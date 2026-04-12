import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';
import { recordAttempt } from '../helpers/xp.js';

const router = Router();

// GET /api/listening/quiz?lesson_id= - generate listening quiz from vocab with audio
router.get('/quiz', requireUser, async (req, res) => {
  const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : null;

  let vocabQuery = 'SELECT * FROM vocabulary WHERE audio_url IS NOT NULL AND audio_url != \'\'';
  const params = [];
  if (lessonId) {
    vocabQuery += ' AND lesson_id = ?';
    params.push(lessonId);
  }

  const allVocab = await db.prepare(vocabQuery).all(...params);

  if (allVocab.length < 4) {
    return res.json([]);
  }

  // Shuffle and pick up to 10 questions
  const shuffled = allVocab.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(10, shuffled.length));

  const questions = selected.map(word => {
    // Pick 3 random distractors (different from correct answer)
    const others = allVocab.filter(v => v.id !== word.id);
    const distractors = others.sort(() => Math.random() - 0.5).slice(0, 3);

    const options = [word.english, ...distractors.map(d => d.english)];
    // Shuffle options
    options.sort(() => Math.random() - 0.5);

    return {
      vocab_id: word.id,
      audio_url: word.audio_url,
      romanized: word.romanized,
      amharic: word.amharic,
      correct_answer: word.english,
      options,
      lesson_id: word.lesson_id
    };
  });

  res.json(questions);
});

// POST /api/listening/submit - grade listening quiz
router.post('/submit', requireUser, async (req, res) => {
  const { answers } = req.body;
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers array required' });
  }

  let correct = 0;
  let totalXpEarned = 0;
  const results = [];

  for (const answer of answers) {
    const isCorrect = answer.user_answer === answer.correct_answer;
    if (isCorrect) {
      correct++;
      totalXpEarned += 5;
    }

    // Find a quiz_question to link to, or use 0
    const qq = await db.prepare(
      'SELECT id FROM quiz_questions WHERE lesson_id = ? LIMIT 1'
    ).get(answer.lesson_id);

    if (qq) {
      await recordAttempt(req.userId, qq.id, answer.lesson_id, answer.user_answer, answer.correct_answer, isCorrect, 'listening');
    }

    results.push({
      vocab_id: answer.vocab_id,
      correct: isCorrect,
      correct_answer: answer.correct_answer,
      romanized: answer.romanized,
      amharic: answer.amharic
    });
  }

  const isPerfect = correct === answers.length && answers.length > 0;
  if (isPerfect) totalXpEarned += 15;

  // Update XP
  const progress = await db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const newXp = progress.total_xp + totalXpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;
  const today = new Date().toISOString().split('T')[0];

  await db.prepare(
    'UPDATE user_progress SET total_xp = ?, level = ?, last_activity_date = ? WHERE user_id = ?'
  ).run(newXp, newLevel, today, req.userId);

  res.json({
    score: correct,
    total: answers.length,
    percentage: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
    xp_earned: totalXpEarned,
    perfect: isPerfect,
    total_xp: newXp,
    level: newLevel,
    leveled_up: leveledUp,
    results
  });
});

export default router;
