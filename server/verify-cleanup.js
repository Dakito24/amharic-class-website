import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'amharic.db');
const db = new Database(dbPath);

console.log('=== Database Cleanup Verification Script ===\n');

// Check for duplicate vocabulary entries
const duplicateVocabCheck = db.prepare(`
  SELECT COUNT(*) as count FROM (
    SELECT english, amharic, romanized, COUNT(*) as cnt
    FROM vocabulary
    GROUP BY english, amharic, romanized
    HAVING cnt > 1
  )
`).get();

console.log('Duplicate Vocabulary Check:');
console.log(`  Duplicate sets found: ${duplicateVocabCheck.count}`);
console.log(`  Status: ${duplicateVocabCheck.count === 0 ? '✓ PASS' : '✗ FAIL'}\n`);

// Check for duplicate flashcard reviews
const duplicateFlashcardsCheck = db.prepare(`
  SELECT COUNT(*) as count FROM (
    SELECT user_id, vocab_id, COUNT(*) as cnt
    FROM flashcard_reviews
    GROUP BY user_id, vocab_id
    HAVING cnt > 1
  )
`).get();

console.log('Duplicate Flashcard Reviews Check:');
console.log(`  Duplicate sets found: ${duplicateFlashcardsCheck.count}`);
console.log(`  Status: ${duplicateFlashcardsCheck.count === 0 ? '✓ PASS' : '✗ FAIL'}\n`);

// Check foreign key integrity
const foreignKeyCheck = db.pragma('foreign_key_check');

console.log('Foreign Key Integrity Check:');
console.log(`  Violations found: ${foreignKeyCheck.length}`);
console.log(`  Status: ${foreignKeyCheck.length === 0 ? '✓ PASS' : '✗ FAIL'}\n`);

// Check database integrity
const integrityCheck = db.pragma('integrity_check');

console.log('Database Integrity Check:');
console.log(`  Result: ${integrityCheck[0].integrity_check}`);
console.log(`  Status: ${integrityCheck[0].integrity_check === 'ok' ? '✓ PASS' : '✗ FAIL'}\n`);

// Get statistics
const stats = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM vocabulary) as vocab_count,
    (SELECT COUNT(*) FROM lessons) as lessons_count,
    (SELECT COUNT(*) FROM quiz_questions) as quiz_questions_count,
    (SELECT COUNT(*) FROM flashcard_reviews) as flashcard_reviews_count,
    (SELECT COUNT(*) FROM quiz_attempts) as quiz_attempts_count,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM user_progress) as user_progress_count
`).get();

console.log('Database Statistics:');
console.log(`  Vocabulary entries: ${stats.vocab_count}`);
console.log(`  Lessons: ${stats.lessons_count}`);
console.log(`  Quiz questions: ${stats.quiz_questions_count}`);
console.log(`  Flashcard reviews: ${stats.flashcard_reviews_count}`);
console.log(`  Quiz attempts: ${stats.quiz_attempts_count}`);
console.log(`  Users: ${stats.users_count}`);
console.log(`  User progress records: ${stats.user_progress_count}\n`);

// Test JOIN queries to ensure references are valid
let joinTests = 0;
let joinPassed = 0;

// Test 1: Vocabulary -> Lessons
try {
  const vocabLessonsJoin = db.prepare(`
    SELECT COUNT(*) as count
    FROM vocabulary v
    LEFT JOIN lessons l ON v.lesson_id = l.id
  `).get();
  joinTests++;
  joinPassed++;
  console.log('JOIN Test 1 (vocabulary -> lessons): ✓ PASS');
} catch (err) {
  joinTests++;
  console.log(`JOIN Test 1 (vocabulary -> lessons): ✗ FAIL - ${err.message}`);
}

// Test 2: Flashcard Reviews -> Users & Vocabulary
try {
  const flashcardsJoin = db.prepare(`
    SELECT COUNT(*) as count
    FROM flashcard_reviews fr
    JOIN users u ON fr.user_id = u.id
    JOIN vocabulary v ON fr.vocab_id = v.id
  `).get();
  joinTests++;
  joinPassed++;
  console.log('JOIN Test 2 (flashcard_reviews -> users & vocabulary): ✓ PASS');
} catch (err) {
  joinTests++;
  console.log(`JOIN Test 2 (flashcard_reviews -> users & vocabulary): ✗ FAIL - ${err.message}`);
}

// Test 3: Quiz Attempts -> Users & Questions
try {
  const quizJoin = db.prepare(`
    SELECT COUNT(*) as count
    FROM quiz_attempts qa
    JOIN users u ON qa.user_id = u.id
    JOIN quiz_questions qq ON qa.question_id = qq.id
  `).get();
  joinTests++;
  joinPassed++;
  console.log('JOIN Test 3 (quiz_attempts -> users & questions): ✓ PASS');
} catch (err) {
  joinTests++;
  console.log(`JOIN Test 3 (quiz_attempts -> users & questions): ✗ FAIL - ${err.message}`);
}

console.log(`\nJOIN Tests: ${joinPassed}/${joinTests} passed\n`);

// Overall result
const allChecksPassed = (
  duplicateVocabCheck.count === 0 &&
  duplicateFlashcardsCheck.count === 0 &&
  foreignKeyCheck.length === 0 &&
  integrityCheck[0].integrity_check === 'ok' &&
  joinPassed === joinTests
);

if (allChecksPassed) {
  console.log('=== ✓ ALL CHECKS PASSED ===');
  console.log('The database cleanup was successful and the database is in good health.\n');
} else {
  console.log('=== ✗ SOME CHECKS FAILED ===');
  console.log('Please review the issues above.\n');
}

db.close();
