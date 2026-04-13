import { Router } from 'express';
import db from '../db.js';
import { requireUser } from '../middleware/requireUser.js';

const router = Router();

// GET /api/lessons - list all lessons with completion status
router.get('/', requireUser, (req, res) => {
  const lessons = db.prepare(`
    SELECT id, title, description, order_num, unit, unit_title, category, xp_reward
    FROM lessons ORDER BY order_num
  `).all();

  const progress = db.prepare('SELECT lessons_completed FROM user_progress WHERE user_id = ?').get(req.userId);
  const completed = JSON.parse(progress?.lessons_completed || '[]');

  const result = lessons.map((lesson, index) => ({
    ...lesson,
    completed: completed.includes(lesson.id),
    locked: index > 0 && !completed.includes(lessons[index - 1].id) && !completed.includes(lesson.id)
  }));

  res.json(result);
});

// GET /api/lessons/:id - get lesson content + vocabulary
router.get('/:id', requireUser, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const vocabulary = db.prepare('SELECT * FROM vocabulary WHERE lesson_id = ?').all(req.params.id);
  const progress = db.prepare('SELECT lessons_completed FROM user_progress WHERE user_id = ?').get(req.userId);
  const completed = JSON.parse(progress?.lessons_completed || '[]');

  res.json({
    ...lesson,
    content: JSON.parse(lesson.content),
    vocabulary,
    completed: completed.includes(lesson.id)
  });
});

// POST /api/lessons/:id/complete - mark lesson complete, award XP
router.post('/:id/complete', requireUser, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.userId);
  const completed = JSON.parse(progress.lessons_completed);

  if (completed.includes(lesson.id)) {
    return res.json({ message: 'Already completed', xp_earned: 0, total_xp: progress.total_xp, level: progress.level });
  }

  completed.push(lesson.id);
  const newXp = progress.total_xp + lesson.xp_reward;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;

  // Check achievements
  const achievements = JSON.parse(progress.achievements);
  const newAchievements = [];

  if (completed.length === 1 && !achievements.includes('first_steps')) {
    achievements.push('first_steps');
    newAchievements.push({ key: 'first_steps', title: 'First Steps', description: 'Complete your first lesson' });
  }
  if (completed.includes(2) && !achievements.includes('greeting_master')) {
    achievements.push('greeting_master');
    newAchievements.push({ key: 'greeting_master', title: 'Greeting Master', description: 'Complete the greetings lesson' });
  }
  if (completed.includes(4) && completed.includes(5) && !achievements.includes('number_cruncher')) {
    achievements.push('number_cruncher');
    newAchievements.push({ key: 'number_cruncher', title: 'Number Cruncher', description: 'Complete both number lessons' });
  }
  const grammarLessons = [11, 12, 13, 14, 15, 16];
  if (grammarLessons.every(id => completed.includes(id)) && !achievements.includes('grammar_guru')) {
    achievements.push('grammar_guru');
    newAchievements.push({ key: 'grammar_guru', title: 'Grammar Guru', description: 'Complete all grammar lessons' });
  }
  const conversationLessons = [23, 24, 25, 26, 27, 28];
  if (conversationLessons.every(id => completed.includes(id)) && !achievements.includes('conversationalist')) {
    achievements.push('conversationalist');
    newAchievements.push({ key: 'conversationalist', title: 'Conversationalist', description: 'Complete all conversation lessons' });
  }
  if (completed.length === 28 && !achievements.includes('amharic_speaker')) {
    achievements.push('amharic_speaker');
    newAchievements.push({ key: 'amharic_speaker', title: 'Amharic Speaker', description: 'Complete all lessons' });
  }

  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    UPDATE user_progress SET
      total_xp = ?, level = ?, lessons_completed = ?, achievements = ?, last_activity_date = ?
    WHERE user_id = ?
  `).run(newXp, newLevel, JSON.stringify(completed), JSON.stringify(achievements), today, req.userId);

  res.json({
    xp_earned: lesson.xp_reward,
    total_xp: newXp,
    level: newLevel,
    leveled_up: leveledUp,
    new_achievements: newAchievements
  });
});

export default router;
