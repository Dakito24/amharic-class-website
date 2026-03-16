import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

function loadJSON(filename) {
  return JSON.parse(readFileSync(join(dataDir, filename), 'utf-8'));
}

console.log('Initializing database...');
initDatabase();

// Sync lessons (upsert — never deletes user data)
console.log('Syncing lessons...');
const lessons = loadJSON('lessons.json');
const upsertLesson = db.prepare(`
  INSERT INTO lessons (id, title, description, order_num, unit, unit_title, category, xp_reward, content)
  VALUES (@id, @title, @description, @order_num, @unit, @unit_title, @category, @xp_reward, @content)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, description=excluded.description,
    order_num=excluded.order_num, unit=excluded.unit,
    unit_title=excluded.unit_title, category=excluded.category,
    xp_reward=excluded.xp_reward, content=excluded.content
`);

const syncLessons = db.transaction(() => {
  for (const lesson of lessons) {
    const content = typeof lesson.content === 'string'
      ? lesson.content : JSON.stringify(lesson.content);
    upsertLesson.run({
      id: lesson.id, title: lesson.title,
      description: lesson.description, order_num: lesson.order_num,
      unit: lesson.unit, unit_title: lesson.unit_title,
      category: lesson.category, xp_reward: lesson.xp_reward || 20,
      content
    });
  }
});
syncLessons();
console.log(`  Synced ${lessons.length} lessons`);

// Sync vocabulary (upsert by explicit ID — preserves flashcard_reviews FKs)
console.log('Syncing vocabulary...');
const vocabulary = loadJSON('vocabulary.json');
const upsertVocab = db.prepare(`
  INSERT INTO vocabulary (id, english, amharic, romanized, pronunciation_guide, category, gender, lesson_id, audio_url)
  VALUES (@id, @english, @amharic, @romanized, @pronunciation_guide, @category, @gender, @lesson_id, @audio_url)
  ON CONFLICT(id) DO UPDATE SET
    english=excluded.english, amharic=excluded.amharic,
    romanized=excluded.romanized, pronunciation_guide=excluded.pronunciation_guide,
    category=excluded.category, gender=excluded.gender,
    lesson_id=excluded.lesson_id, audio_url=excluded.audio_url
`);

const syncVocab = db.transaction(() => {
  for (const word of vocabulary) {
    upsertVocab.run({
      id: word.id, english: word.english,
      amharic: word.amharic, romanized: word.romanized,
      pronunciation_guide: word.pronunciation_guide || null,
      category: word.category, gender: word.gender || null,
      lesson_id: word.lesson_id || null, audio_url: word.audio_url || null
    });
  }
});
syncVocab();
console.log(`  Synced ${vocabulary.length} vocabulary entries`);

// Safety check: warn about orphaned flashcard reviews
const existingReviewVocabIds = db.prepare(
  'SELECT DISTINCT vocab_id FROM flashcard_reviews'
).all().map(r => r.vocab_id);

if (existingReviewVocabIds.length > 0) {
  const incomingVocabIds = new Set(vocabulary.map(v => v.id));
  const orphaned = existingReviewVocabIds.filter(id => !incomingVocabIds.has(id));
  if (orphaned.length > 0) {
    console.warn(`  WARNING: ${orphaned.length} flashcard review(s) reference vocab IDs not in vocabulary.json: ${orphaned.join(', ')}`);
  }
}

// Sync quiz questions (upsert by explicit ID)
console.log('Syncing quiz questions...');
const quizzes = loadJSON('quizzes.json');
const upsertQuiz = db.prepare(`
  INSERT INTO quiz_questions (id, lesson_id, question_type, question, options, correct_answer, explanation, xp_reward)
  VALUES (@id, @lesson_id, @question_type, @question, @options, @correct_answer, @explanation, @xp_reward)
  ON CONFLICT(id) DO UPDATE SET
    lesson_id=excluded.lesson_id, question_type=excluded.question_type,
    question=excluded.question, options=excluded.options,
    correct_answer=excluded.correct_answer, explanation=excluded.explanation,
    xp_reward=excluded.xp_reward
`);

const syncQuizzes = db.transaction(() => {
  for (const q of quizzes) {
    const options = q.options
      ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options))
      : null;
    upsertQuiz.run({
      id: q.id, lesson_id: q.lesson_id,
      question_type: q.question_type, question: q.question,
      options, correct_answer: q.correct_answer,
      explanation: q.explanation || null, xp_reward: q.xp_reward || 5
    });
  }
});
syncQuizzes();
console.log(`  Synced ${quizzes.length} quiz questions`);

console.log('Database synced successfully!');
