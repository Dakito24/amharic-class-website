/**
 * Main content expansion script.
 * Imports vocab, quizzes, and lessons from data-part files,
 * assigns IDs and audio URLs, and merges into existing JSON data files.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

// Read existing data
const vocabulary = JSON.parse(readFileSync(join(dataDir, 'vocabulary.json'), 'utf-8'));
const quizzes = JSON.parse(readFileSync(join(dataDir, 'quizzes.json'), 'utf-8'));
const lessons = JSON.parse(readFileSync(join(dataDir, 'lessons.json'), 'utf-8'));

// Find max existing IDs
const maxVocabId = Math.max(...vocabulary.map(v => v.id));
const maxQuizId = Math.max(...quizzes.map(q => q.id));

console.log(`Existing data: ${vocabulary.length} vocab (max ID ${maxVocabId}), ${quizzes.length} quizzes (max ID ${maxQuizId}), ${lessons.length} lessons`);

// Check if expansion already done
if (lessons.some(l => l.id >= 29)) {
  console.log('Expansion already applied (lessons >= 29 exist). Skipping.');
  process.exit(0);
}

// Import data parts
const { vocabPart1 } = await import('./data-part1.js');
const { vocabPart2 } = await import('./data-part2.js');
const { vocabPart3 } = await import('./data-part3.js');
const { quizzesPart1 } = await import('./quizzes-part1.js');
const { quizzesPart2 } = await import('./quizzes-part2.js');
const { newLessons } = await import('./lessons-new.js');

// Combine all new vocab
const allNewVocab = [...vocabPart1, ...vocabPart2, ...vocabPart3];

// Assign IDs and audio URLs to vocab
let vocabId = maxVocabId + 1;
const vocabWithIds = allNewVocab.map(entry => ({
  id: vocabId++,
  english: entry.english,
  amharic: entry.amharic,
  romanized: entry.romanized,
  pronunciation_guide: entry.pronunciation_guide || null,
  category: entry.category,
  gender: null,
  lesson_id: entry.lesson_id,
  audio_url: `/audio/vocab/vocab-${vocabId - 1}.mp3`
}));

// Combine all new quizzes
const allNewQuizzes = [...quizzesPart1, ...quizzesPart2];

// Assign IDs to quizzes and stringify options
let quizId = maxQuizId + 1;
const quizzesWithIds = allNewQuizzes.map(entry => ({
  id: quizId++,
  lesson_id: entry.lesson_id,
  question_type: entry.question_type,
  question: entry.question,
  options: Array.isArray(entry.options) ? JSON.stringify(entry.options) : entry.options,
  correct_answer: entry.correct_answer,
  explanation: entry.explanation,
  xp_reward: entry.xp_reward || 5
}));

// Append to existing data
vocabulary.push(...vocabWithIds);
quizzes.push(...quizzesWithIds);
lessons.push(...newLessons);

// Write updated files
writeFileSync(join(dataDir, 'vocabulary.json'), JSON.stringify(vocabulary, null, 2) + '\n');
writeFileSync(join(dataDir, 'quizzes.json'), JSON.stringify(quizzes, null, 2) + '\n');
writeFileSync(join(dataDir, 'lessons.json'), JSON.stringify(lessons, null, 2) + '\n');

console.log(`\nExpansion complete!`);
console.log(`  Added ${vocabWithIds.length} vocabulary entries (IDs ${maxVocabId + 1}-${vocabId - 1})`);
console.log(`  Added ${quizzesWithIds.length} quiz questions (IDs ${maxQuizId + 1}-${quizId - 1})`);
console.log(`  Added ${newLessons.length} new lessons`);
console.log(`\nTotals: ${vocabulary.length} vocab, ${quizzes.length} quizzes, ${lessons.length} lessons`);
console.log(`\nNext steps:`);
console.log(`  1. Run: GOOGLE_APPLICATION_CREDENTIALS=./amharic-class-website-*.json node server/scripts/generate-audio.js`);
console.log(`  2. Run: node server/scripts/add-step-words.js`);
console.log(`  3. Run: npm run seed -w server`);
