import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'amharic.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('=== Database Cleanup Script ===\n');

// ==========================================
// TASK 1: Find and remove duplicate vocabulary entries
// ==========================================

console.log('TASK 1: Checking for duplicate vocabulary entries...');

// Find all duplicate vocabulary entries (same english/amharic/romanized but different IDs)
const duplicateVocabQuery = db.prepare(`
  SELECT english, amharic, romanized,
         GROUP_CONCAT(id) as ids,
         COUNT(*) as count
  FROM vocabulary
  GROUP BY english, amharic, romanized
  HAVING count > 1
  ORDER BY english
`);

const duplicateVocab = duplicateVocabQuery.all();

console.log(`Found ${duplicateVocab.length} duplicate vocabulary sets\n`);

if (duplicateVocab.length > 0) {
  console.log('Sample duplicates:');
  duplicateVocab.slice(0, 5).forEach(dup => {
    console.log(`  - "${dup.english}" (${dup.romanized}): IDs [${dup.ids}]`);
  });
  console.log('');

  // For each duplicate set, keep the lowest ID and update references
  let totalVocabDeleted = 0;
  let totalFlashcardsUpdated = 0;

  db.transaction(() => {
    for (const dup of duplicateVocab) {
      const ids = dup.ids.split(',').map(id => parseInt(id));
      const keepId = Math.min(...ids);
      const deleteIds = ids.filter(id => id !== keepId);

      console.log(`Processing "${dup.english}": keeping ID ${keepId}, removing ${deleteIds.join(', ')}`);

      // Update flashcard_reviews to point to the kept ID
      for (const deleteId of deleteIds) {
        // Check if there are any flashcard reviews for this vocab_id
        const flashcardCount = db.prepare(`
          SELECT COUNT(*) as count FROM flashcard_reviews WHERE vocab_id = ?
        `).get(deleteId);

        if (flashcardCount.count > 0) {
          // Try to update to the kept ID
          // If there's a conflict (user_id, vocab_id already exists), delete the duplicate
          try {
            db.prepare(`
              UPDATE flashcard_reviews
              SET vocab_id = ?
              WHERE vocab_id = ?
            `).run(keepId, deleteId);
            totalFlashcardsUpdated += flashcardCount.count;
          } catch (err) {
            // Constraint violation - delete the duplicate flashcard review
            db.prepare(`DELETE FROM flashcard_reviews WHERE vocab_id = ?`).run(deleteId);
            console.log(`  - Removed duplicate flashcard review for vocab_id ${deleteId}`);
          }
        }

        // Delete the duplicate vocabulary entry
        db.prepare(`DELETE FROM vocabulary WHERE id = ?`).run(deleteId);
        totalVocabDeleted++;
      }
    }
  })();

  console.log(`\n✓ Removed ${totalVocabDeleted} duplicate vocabulary entries`);
  console.log(`✓ Updated ${totalFlashcardsUpdated} flashcard review references\n`);
} else {
  console.log('✓ No duplicate vocabulary entries found\n');
}

// ==========================================
// TASK 2: Find and remove duplicate flashcard reviews
// ==========================================

console.log('TASK 2: Checking for duplicate flashcard reviews...');

// Check for true duplicates (same user_id, vocab_id, review data)
// Note: UNIQUE constraint on (user_id, vocab_id) should prevent most duplicates
const duplicateFlashcardsQuery = db.prepare(`
  SELECT user_id, vocab_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
  FROM flashcard_reviews
  GROUP BY user_id, vocab_id
  HAVING count > 1
`);

const duplicateFlashcards = duplicateFlashcardsQuery.all();

console.log(`Found ${duplicateFlashcards.length} duplicate flashcard review sets\n`);

if (duplicateFlashcards.length > 0) {
  let totalFlashcardsDeleted = 0;

  db.transaction(() => {
    for (const dup of duplicateFlashcards) {
      const ids = dup.ids.split(',').map(id => parseInt(id));

      // Get all reviews for this user_id/vocab_id pair
      const reviews = db.prepare(`
        SELECT * FROM flashcard_reviews WHERE user_id = ? AND vocab_id = ? ORDER BY id
      `).all(dup.user_id, dup.vocab_id);

      // Keep the one with the most recent last_review date
      let keepReview = reviews[0];
      for (const review of reviews) {
        if (review.last_review && (!keepReview.last_review || review.last_review > keepReview.last_review)) {
          keepReview = review;
        }
      }

      // Delete all others
      const deleteIds = ids.filter(id => id !== keepReview.id);
      for (const deleteId of deleteIds) {
        db.prepare(`DELETE FROM flashcard_reviews WHERE id = ?`).run(deleteId);
        totalFlashcardsDeleted++;
      }

      console.log(`  - Kept review ID ${keepReview.id} for user ${dup.user_id}, vocab ${dup.vocab_id}`);
    }
  })();

  console.log(`\n✓ Removed ${totalFlashcardsDeleted} duplicate flashcard reviews\n`);
} else {
  console.log('✓ No duplicate flashcard reviews found\n');
}

// ==========================================
// TASK 3: Check vocab references in lessons
// ==========================================

console.log('TASK 3: Checking for duplicate vocab references in lesson content...');

const lessons = db.prepare(`SELECT id, title, content FROM lessons`).all();

let lessonsWithDuplicates = 0;
let totalDuplicatesFixed = 0;

for (const lesson of lessons) {
  try {
    const content = JSON.parse(lesson.content);
    let modified = false;

    // Function to check and deduplicate vocab IDs in arrays
    function deduplicateIds(arr) {
      if (!Array.isArray(arr)) return arr;
      const seen = new Set();
      const deduped = arr.filter(item => {
        // If it's a number (vocab ID)
        if (typeof item === 'number') {
          if (seen.has(item)) return false;
          seen.add(item);
          return true;
        }
        // If it's an object, check if it has a vocab_id
        if (item && typeof item === 'object' && item.vocab_id) {
          if (seen.has(item.vocab_id)) return false;
          seen.add(item.vocab_id);
          return true;
        }
        return true;
      });
      return deduped.length !== arr.length ? { modified: true, data: deduped } : { modified: false, data: arr };
    }

    // Check common fields that might contain vocab IDs
    if (content.vocabulary_ids) {
      const result = deduplicateIds(content.vocabulary_ids);
      if (result.modified) {
        content.vocabulary_ids = result.data;
        modified = true;
        totalDuplicatesFixed++;
        console.log(`  - Lesson ${lesson.id} "${lesson.title}": removed ${content.vocabulary_ids.length - result.data.length} duplicate vocab_ids from vocabulary_ids`);
      }
    }

    // Check steps that might contain words with vocab references
    if (content.steps && Array.isArray(content.steps)) {
      for (const step of content.steps) {
        if (step.words && Array.isArray(step.words)) {
          const result = deduplicateIds(step.words);
          if (result.modified) {
            step.words = result.data;
            modified = true;
            totalDuplicatesFixed++;
            console.log(`  - Lesson ${lesson.id} "${lesson.title}": removed duplicates from step "${step.title}"`);
          }
        }
      }
    }

    // Check examples
    if (content.examples) {
      const result = deduplicateIds(content.examples);
      if (result.modified) {
        content.examples = result.data;
        modified = true;
        totalDuplicatesFixed++;
        console.log(`  - Lesson ${lesson.id} "${lesson.title}": removed duplicates from examples`);
      }
    }

    // If content was modified, update the lesson
    if (modified) {
      db.prepare(`UPDATE lessons SET content = ? WHERE id = ?`).run(JSON.stringify(content), lesson.id);
      lessonsWithDuplicates++;
    }
  } catch (err) {
    console.log(`  ⚠ Warning: Could not parse content for lesson ${lesson.id}: ${err.message}`);
  }
}

if (lessonsWithDuplicates > 0) {
  console.log(`\n✓ Fixed ${totalDuplicatesFixed} duplicate references in ${lessonsWithDuplicates} lessons\n`);
} else {
  console.log('✓ No duplicate vocab references found in lesson content\n');
}

// ==========================================
// VERIFICATION: Show final statistics
// ==========================================

console.log('=== Final Statistics ===');

const totalVocab = db.prepare(`SELECT COUNT(*) as count FROM vocabulary`).get();
const totalFlashcards = db.prepare(`SELECT COUNT(*) as count FROM flashcard_reviews`).get();
const totalQuizAttempts = db.prepare(`SELECT COUNT(*) as count FROM quiz_attempts`).get();

console.log(`Total vocabulary entries: ${totalVocab.count}`);
console.log(`Total flashcard reviews: ${totalFlashcards.count}`);
console.log(`Total quiz attempts: ${totalQuizAttempts.count}`);

// Verify no duplicates remain
const remainingDuplicates = db.prepare(`
  SELECT COUNT(*) as count FROM (
    SELECT english, amharic, romanized, COUNT(*) as cnt
    FROM vocabulary
    GROUP BY english, amharic, romanized
    HAVING cnt > 1
  )
`).get();

console.log(`Remaining duplicate vocabulary sets: ${remainingDuplicates.count}`);

if (remainingDuplicates.count === 0) {
  console.log('\n✓ SUCCESS: All duplicates have been cleaned up!\n');
} else {
  console.log('\n⚠ Warning: Some duplicates still remain. Manual review may be needed.\n');
}

db.close();
