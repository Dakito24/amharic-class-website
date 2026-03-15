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

// Clear existing data
db.exec(`
  DELETE FROM flashcard_reviews;
  DELETE FROM user_progress;
  DELETE FROM users;
  DELETE FROM quiz_questions;
  DELETE FROM vocabulary;
  DELETE FROM lessons;
`);

// Seed lessons
console.log('Seeding lessons...');
const lessons = loadJSON('lessons.json');
const insertLesson = db.prepare(`
  INSERT INTO lessons (id, title, description, order_num, unit, unit_title, category, xp_reward, content)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const lesson of lessons) {
  const content = typeof lesson.content === 'string' ? lesson.content : JSON.stringify(lesson.content);
  insertLesson.run(
    lesson.id, lesson.title, lesson.description, lesson.order_num,
    lesson.unit, lesson.unit_title, lesson.category, lesson.xp_reward || 20, content
  );
}
console.log(`  Inserted ${lessons.length} lessons`);

// Seed vocabulary
console.log('Seeding vocabulary...');
const vocabulary = loadJSON('vocabulary.json');
const insertVocab = db.prepare(`
  INSERT INTO vocabulary (english, amharic, romanized, pronunciation_guide, category, gender, lesson_id, audio_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const word of vocabulary) {
  insertVocab.run(
    word.english, word.amharic, word.romanized, word.pronunciation_guide || null,
    word.category, word.gender || null, word.lesson_id || null, word.audio_url || null
  );
}
console.log(`  Inserted ${vocabulary.length} vocabulary entries`);

// Seed quizzes
console.log('Seeding quiz questions...');
const quizzes = loadJSON('quizzes.json');
const insertQuiz = db.prepare(`
  INSERT INTO quiz_questions (lesson_id, question_type, question, options, correct_answer, explanation, xp_reward)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const q of quizzes) {
  const options = q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null;
  insertQuiz.run(
    q.lesson_id, q.question_type, q.question, options,
    q.correct_answer, q.explanation || null, q.xp_reward || 5
  );
}
console.log(`  Inserted ${quizzes.length} quiz questions`);

console.log('Database seeded successfully!');
