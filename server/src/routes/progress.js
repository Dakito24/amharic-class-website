import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';

const router = Router();

const LEVEL_TITLES = {
  1: 'Beginner',
  2: 'Beginner',
  3: 'Learner',
  4: 'Learner',
  5: 'Speaker',
  6: 'Speaker',
  7: 'Speaker',
  8: 'Conversationalist',
  9: 'Conversationalist',
  10: 'Fluent Speaker'
};

const ALL_ACHIEVEMENTS = [
  { key: 'first_steps', title: 'First Steps', description: 'Complete your first lesson', icon: '1' },
  { key: 'greeting_master', title: 'Greeting Master', description: 'Complete the greetings lesson', icon: '2' },
  { key: 'number_cruncher', title: 'Number Cruncher', description: 'Complete both number lessons', icon: '3' },
  { key: 'grammar_guru', title: 'Grammar Guru', description: 'Complete all grammar lessons', icon: '4' },
  { key: 'word_collector', title: 'Word Collector', description: 'Master 50 vocabulary words', icon: '5' },
  { key: 'quiz_champion', title: 'Quiz Champion', description: 'Get 100% on any quiz', icon: '6' },
  { key: 'streak_week', title: 'Streak Week', description: '7-day streak', icon: '7' },
  { key: 'streak_month', title: 'Streak Month', description: '30-day streak', icon: '8' },
  { key: 'conversationalist', title: 'Conversationalist', description: 'Complete all conversation lessons', icon: '9' },
  { key: 'amharic_speaker', title: 'Amharic Speaker', description: 'Complete all lessons', icon: '10' }
];

// GET /api/progress - get user progress
router.get('/', requireUser, (req, res) => {
  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const unlockedAchievements = JSON.parse(progress.achievements);
  const lessonsCompleted = JSON.parse(progress.lessons_completed);
  const vocabMastered = JSON.parse(progress.vocab_mastered);

  const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lessons').get();
  const totalVocab = db.prepare('SELECT COUNT(*) as count FROM vocabulary').get();

  const levelTitle = LEVEL_TITLES[Math.min(progress.level, 10)] || 'Master';
  const xpForNextLevel = progress.level * 100;
  const xpInCurrentLevel = progress.total_xp - ((progress.level - 1) * 100);

  res.json({
    total_xp: progress.total_xp,
    level: progress.level,
    level_title: levelTitle,
    xp_for_next_level: xpForNextLevel,
    xp_in_current_level: xpInCurrentLevel,
    current_streak: progress.current_streak,
    longest_streak: progress.longest_streak,
    last_activity_date: progress.last_activity_date,
    lessons_completed: lessonsCompleted.length,
    total_lessons: totalLessons.count,
    vocab_mastered: vocabMastered.length,
    total_vocab: totalVocab.count,
    achievements: ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlockedAchievements.includes(a.key)
    }))
  });
});

// POST /api/progress/streak - update daily streak
router.post('/streak', requireUser, (req, res) => {
  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const today = new Date().toISOString().split('T')[0];

  if (progress.last_activity_date === today) {
    return res.json({
      current_streak: progress.current_streak,
      longest_streak: progress.longest_streak,
      message: 'Already logged today'
    });
  }

  let newStreak = 1;
  if (progress.last_activity_date) {
    const lastDate = new Date(progress.last_activity_date);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStreak = progress.current_streak + 1;
    }
  }

  const longestStreak = Math.max(newStreak, progress.longest_streak);

  // Check streak achievements
  const achievements = JSON.parse(progress.achievements);
  const newAchievements = [];

  if (newStreak >= 7 && !achievements.includes('streak_week')) {
    achievements.push('streak_week');
    newAchievements.push({ key: 'streak_week', title: 'Streak Week', description: '7-day streak' });
  }
  if (newStreak >= 30 && !achievements.includes('streak_month')) {
    achievements.push('streak_month');
    newAchievements.push({ key: 'streak_month', title: 'Streak Month', description: '30-day streak' });
  }

  db.prepare(`
    UPDATE user_progress SET
      current_streak = ?, longest_streak = ?, last_activity_date = ?, achievements = ?
    WHERE user_id = ?
  `).run(newStreak, longestStreak, today, JSON.stringify(achievements), req.userId);

  res.json({
    current_streak: newStreak,
    longest_streak: longestStreak,
    new_achievements: newAchievements
  });
});

// GET /api/flashcards/due - get flashcards due for review
router.get('/flashcards/due', requireUser, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Get vocab that either has no review record for this user or is due
  const due = db.prepare(`
    SELECT v.*, fr.ease_factor, fr.interval, fr.repetitions, fr.next_review, fr.last_review
    FROM vocabulary v
    LEFT JOIN flashcard_reviews fr ON v.id = fr.vocab_id AND fr.user_id = ?
    WHERE fr.id IS NULL OR fr.next_review <= ?
    ORDER BY CASE WHEN fr.id IS NULL THEN 0 ELSE 1 END, fr.next_review
    LIMIT 20
  `).all(req.userId, today);

  res.json(due);
});

// POST /api/flashcards/review - submit flashcard review (SM-2 algorithm)
router.post('/flashcards/review', requireUser, (req, res) => {
  const { vocab_id, quality } = req.body;
  // quality: 0-5 (0=complete fail, 5=perfect recall)

  if (vocab_id === undefined || quality === undefined) {
    return res.status(400).json({ error: 'vocab_id and quality (0-5) required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM flashcard_reviews WHERE user_id = ? AND vocab_id = ?').get(req.userId, vocab_id);

  let easeFactor = existing?.ease_factor || 2.5;
  let interval = existing?.interval || 1;
  let repetitions = existing?.repetitions || 0;

  // SM-2 algorithm
  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  const nextReviewStr = nextReview.toISOString().split('T')[0];

  if (existing) {
    db.prepare(`
      UPDATE flashcard_reviews SET
        ease_factor = ?, interval = ?, repetitions = ?, next_review = ?, last_review = ?
      WHERE user_id = ? AND vocab_id = ?
    `).run(easeFactor, interval, repetitions, nextReviewStr, today, req.userId, vocab_id);
  } else {
    db.prepare(`
      INSERT INTO flashcard_reviews (user_id, vocab_id, ease_factor, interval, repetitions, next_review, last_review)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.userId, vocab_id, easeFactor, interval, repetitions, nextReviewStr, today);
  }

  // Award XP
  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const newXp = progress.total_xp + 2;
  const newLevel = Math.floor(newXp / 100) + 1;

  // Check word collector achievement
  const achievements = JSON.parse(progress.achievements);
  const vocabMastered = JSON.parse(progress.vocab_mastered);
  const newAchievements = [];

  if (quality >= 4 && !vocabMastered.includes(vocab_id)) {
    vocabMastered.push(vocab_id);
    if (vocabMastered.length >= 50 && !achievements.includes('word_collector')) {
      achievements.push('word_collector');
      newAchievements.push({ key: 'word_collector', title: 'Word Collector', description: 'Master 50 vocabulary words' });
    }
  }

  db.prepare(`
    UPDATE user_progress SET
      total_xp = ?, level = ?, vocab_mastered = ?, achievements = ?, last_activity_date = ?
    WHERE user_id = ?
  `).run(newXp, newLevel, JSON.stringify(vocabMastered), JSON.stringify(achievements), today, req.userId);

  res.json({
    next_review: nextReviewStr,
    interval,
    xp_earned: 2,
    total_xp: newXp,
    new_achievements: newAchievements
  });
});

export default router;
