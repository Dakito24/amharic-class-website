import db from '../db.js';

/**
 * Award XP to a user and return updated progress info.
 * @param {number} userId
 * @param {number} xpAmount
 * @returns {{ total_xp: number, level: number, leveled_up: boolean }}
 */
export function awardXP(userId, xpAmount) {
  const progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(userId);
  const newXp = progress.total_xp + xpAmount;
  const newLevel = Math.floor(newXp / 100) + 1;
  const leveledUp = newLevel > progress.level;
  const today = new Date().toISOString().split('T')[0];

  db.prepare(
    'UPDATE user_progress SET total_xp = ?, level = ?, last_activity_date = ? WHERE user_id = ?'
  ).run(newXp, newLevel, today, userId);

  return { total_xp: newXp, level: newLevel, leveled_up: leveledUp };
}

/**
 * Record a quiz attempt.
 * @param {number} userId
 * @param {number} questionId
 * @param {number|null} lessonId
 * @param {string} userAnswer
 * @param {string} correctAnswer
 * @param {boolean} isCorrect
 * @param {string} mode - 'standard', 'timed', 'listening', 'review'
 * @param {number|null} timeTakenMs
 */
export function recordAttempt(userId, questionId, lessonId, userAnswer, correctAnswer, isCorrect, mode = 'standard', timeTakenMs = null) {
  db.prepare(`
    INSERT INTO quiz_attempts (user_id, question_id, lesson_id, user_answer, correct_answer, is_correct, mode, time_taken_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, questionId, lessonId, userAnswer, correctAnswer, isCorrect ? 1 : 0, mode, timeTakenMs);
}
