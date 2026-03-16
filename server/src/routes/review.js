import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';
import { recordAttempt } from '../helpers/xp.js';

const router = Router();

// GET /api/review/weak-words - questions the user gets wrong most often
router.get('/weak-words', requireUser, (req, res) => {
  const lessonFilter = req.query.lesson_id ? Number(req.query.lesson_id) : null;

  let query = `
    SELECT
      qa.question_id,
      qq.question as question_text,
      qq.correct_answer,
      qq.lesson_id,
      l.title as lesson_title,
      COUNT(*) as total_attempts,
      SUM(CASE WHEN qa.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
      ROUND(CAST(SUM(CASE WHEN qa.is_correct = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100) as error_rate
    FROM quiz_attempts qa
    JOIN quiz_questions qq ON qa.question_id = qq.id
    JOIN lessons l ON qq.lesson_id = l.id
    WHERE qa.user_id = ?
  `;
  const params = [req.userId];

  if (lessonFilter) {
    query += ' AND qq.lesson_id = ?';
    params.push(lessonFilter);
  }

  query += `
    GROUP BY qa.question_id
    HAVING error_rate > 40
    ORDER BY error_rate DESC, total_attempts DESC
    LIMIT 30
  `;

  const weakWords = db.prepare(query).all(...params);
  res.json(weakWords);
});

// GET /api/review/vocab-mastery?lesson_id= - per-vocab mastery levels
router.get('/vocab-mastery', requireUser, (req, res) => {
  const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : null;

  let vocabQuery = 'SELECT * FROM vocabulary';
  const params = [];
  if (lessonId) {
    vocabQuery += ' WHERE lesson_id = ?';
    params.push(lessonId);
  }

  const vocab = db.prepare(vocabQuery).all(...params);

  const flashcardData = db.prepare(
    'SELECT vocab_id, repetitions, ease_factor FROM flashcard_reviews WHERE user_id = ?'
  ).all(req.userId);

  const flashcardMap = {};
  for (const fr of flashcardData) {
    flashcardMap[fr.vocab_id] = fr;
  }

  const result = vocab.map(v => {
    const fr = flashcardMap[v.id];
    let mastery = 'new';
    if (fr) {
      if (fr.repetitions >= 5) mastery = 'mastered';
      else if (fr.repetitions >= 3) mastery = 'learning';
      else mastery = 'started';
    }
    return { ...v, mastery };
  });

  res.json(result);
});

// GET /api/review/quiz - generate quiz from missed questions
router.get('/quiz', requireUser, (req, res) => {
  const questions = db.prepare(`
    SELECT qq.*, l.title as lesson_title,
      COUNT(qa.id) as total_attempts,
      SUM(CASE WHEN qa.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count
    FROM quiz_attempts qa
    JOIN quiz_questions qq ON qa.question_id = qq.id
    JOIN lessons l ON qq.lesson_id = l.id
    WHERE qa.user_id = ?
    GROUP BY qa.question_id
    HAVING wrong_count > 0
    ORDER BY CAST(wrong_count AS REAL) / total_attempts DESC
    LIMIT 15
  `).all(req.userId);

  const parsed = questions.map(q => ({
    ...q,
    options: q.options ? JSON.parse(q.options) : null
  }));

  res.json(parsed);
});

// POST /api/review/submit - grade review quiz
router.post('/submit', requireUser, (req, res) => {
  const { answers } = req.body;
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers array required' });
  }

  const questionIds = answers.map(a => a.question_id);
  const placeholders = questionIds.map(() => '?').join(',');
  const questions = db.prepare(
    `SELECT * FROM quiz_questions WHERE id IN (${placeholders})`
  ).all(...questionIds);

  let correct = 0;
  let totalXpEarned = 0;
  const results = [];

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) continue;

    const isCorrect = answer.user_answer === question.correct_answer;
    if (isCorrect) {
      correct++;
      totalXpEarned += 3; // Lower XP for review (3 instead of 5)
    }

    recordAttempt(req.userId, question.id, question.lesson_id, answer.user_answer, question.correct_answer, isCorrect, 'review');

    results.push({
      question_id: question.id,
      correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation
    });
  }

  // Bonus for perfect review
  const isPerfect = correct === answers.length && answers.length > 0;
  if (isPerfect) totalXpEarned += 10;

  // Update XP
  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const newXp = progress.total_xp + totalXpEarned;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;
  const today = new Date().toISOString().split('T')[0];

  db.prepare(
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
