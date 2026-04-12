import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase, isAsync } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

function loadJSON(filename) {
  return JSON.parse(readFileSync(join(dataDir, filename), 'utf-8'));
}

async function seed() {
  console.log('Initializing database...');
  if (isAsync) {
    await initDatabase();
  } else {
    initDatabase();
  }

  // Sync lessons (upsert — never deletes user data)
  console.log('Syncing lessons...');
  const lessons = loadJSON('lessons.json');
  const upsertLesson = db.prepare(`
    INSERT INTO lessons (id, title, description, order_num, unit, unit_title, category, xp_reward, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, description=excluded.description,
      order_num=excluded.order_num, unit=excluded.unit,
      unit_title=excluded.unit_title, category=excluded.category,
      xp_reward=excluded.xp_reward, content=excluded.content
  `);

  if (isAsync) {
    const syncLessons = db.transaction(async () => {
      for (const lesson of lessons) {
        const content = typeof lesson.content === 'string'
          ? lesson.content : JSON.stringify(lesson.content);
        await upsertLesson.run(
          lesson.id, lesson.title, lesson.description, lesson.order_num,
          lesson.unit, lesson.unit_title, lesson.category, lesson.xp_reward || 20,
          content
        );
      }
    });
    await syncLessons();
  } else {
    const syncLessons = db.transaction(() => {
      for (const lesson of lessons) {
        const content = typeof lesson.content === 'string'
          ? lesson.content : JSON.stringify(lesson.content);
        upsertLesson.run(
          lesson.id, lesson.title, lesson.description, lesson.order_num,
          lesson.unit, lesson.unit_title, lesson.category, lesson.xp_reward || 20,
          content
        );
      }
    });
    syncLessons();
  }
  console.log(`  Synced ${lessons.length} lessons`);

  // Sync vocabulary (upsert by explicit ID — preserves flashcard_reviews FKs)
  console.log('Syncing vocabulary...');
  const vocabulary = loadJSON('vocabulary.json');
  const upsertVocab = db.prepare(`
    INSERT INTO vocabulary (id, english, amharic, romanized, pronunciation_guide, category, gender, lesson_id, audio_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      english=excluded.english, amharic=excluded.amharic,
      romanized=excluded.romanized, pronunciation_guide=excluded.pronunciation_guide,
      category=excluded.category, gender=excluded.gender,
      lesson_id=excluded.lesson_id, audio_url=excluded.audio_url
  `);

  if (isAsync) {
    const syncVocab = db.transaction(async () => {
      for (const word of vocabulary) {
        await upsertVocab.run(
          word.id, word.english, word.amharic, word.romanized,
          word.pronunciation_guide || null, word.category, word.gender || null,
          word.lesson_id || null, word.audio_url || null
        );
      }
    });
    await syncVocab();
  } else {
    const syncVocab = db.transaction(() => {
      for (const word of vocabulary) {
        upsertVocab.run(
          word.id, word.english, word.amharic, word.romanized,
          word.pronunciation_guide || null, word.category, word.gender || null,
          word.lesson_id || null, word.audio_url || null
        );
      }
    });
    syncVocab();
  }
  console.log(`  Synced ${vocabulary.length} vocabulary entries`);

  // Safety check: warn about orphaned flashcard reviews
  const existingReviewVocabIds = isAsync
    ? (await db.prepare('SELECT DISTINCT vocab_id FROM flashcard_reviews').all()).map(r => r.vocab_id)
    : db.prepare('SELECT DISTINCT vocab_id FROM flashcard_reviews').all().map(r => r.vocab_id);

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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      lesson_id=excluded.lesson_id, question_type=excluded.question_type,
      question=excluded.question, options=excluded.options,
      correct_answer=excluded.correct_answer, explanation=excluded.explanation,
      xp_reward=excluded.xp_reward
  `);

  if (isAsync) {
    const syncQuizzes = db.transaction(async () => {
      for (const q of quizzes) {
        const options = q.options
          ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options))
          : null;
        await upsertQuiz.run(
          q.id, q.lesson_id, q.question_type, q.question,
          options, q.correct_answer, q.explanation || null, q.xp_reward || 5
        );
      }
    });
    await syncQuizzes();
  } else {
    const syncQuizzes = db.transaction(() => {
      for (const q of quizzes) {
        const options = q.options
          ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options))
          : null;
        upsertQuiz.run(
          q.id, q.lesson_id, q.question_type, q.question,
          options, q.correct_answer, q.explanation || null, q.xp_reward || 5
        );
      }
    });
    syncQuizzes();
  }
  console.log(`  Synced ${quizzes.length} quiz questions`);

  console.log('Database synced successfully!');
}

seed().catch(console.error);
