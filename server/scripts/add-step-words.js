/**
 * Adds structured `words` arrays to lesson steps by matching
 * vocabulary entries to words mentioned in step body text.
 * This enables AudioButton to appear next to each word in lesson steps.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const lessons = JSON.parse(readFileSync(join(dataDir, 'lessons.json'), 'utf-8'));
const vocabulary = JSON.parse(readFileSync(join(dataDir, 'vocabulary.json'), 'utf-8'));

// Build lookup: romanized (lowercase) -> vocab entry
const vocabByRomanized = {};
for (const v of vocabulary) {
  vocabByRomanized[v.romanized.toLowerCase()] = v;
}

// Build lookup: lesson_id -> vocab entries
const vocabByLesson = {};
for (const v of vocabulary) {
  if (!vocabByLesson[v.lesson_id]) vocabByLesson[v.lesson_id] = [];
  vocabByLesson[v.lesson_id].push(v);
}

/**
 * Given a step body, extract romanized words that appear before parentheses
 * Pattern: word (amharic - meaning) or word (amharic)
 */
function extractWordsFromBody(body, lessonVocab) {
  const words = [];
  const seen = new Set();

  // Pattern: romanized (amharic - english) or romanized (amharic)
  // e.g.: "and (አንድ - 1)" or "selam (ሰላም)"
  const regex = /(\b[\w'ə]+(?:\s[\w'ə]+)?)\s*\(([^)]+)\)/g;
  let match;

  while ((match = regex.exec(body)) !== null) {
    const romanized = match[1].trim();
    const parenContent = match[2].trim();

    // Skip if already seen
    if (seen.has(romanized.toLowerCase())) continue;

    // Try to find in vocabulary
    const vocabMatch = lessonVocab.find(v =>
      v.romanized.toLowerCase() === romanized.toLowerCase()
    );

    // Parse amharic and english from parentheses content
    let amharic = '';
    let english = '';

    if (parenContent.includes(' - ')) {
      const parts = parenContent.split(' - ');
      amharic = parts[0].trim();
      english = parts.slice(1).join(' - ').trim();
    } else {
      amharic = parenContent;
    }

    // Build word entry
    const word = {
      romanized: romanized,
      amharic: amharic,
      english: english || (vocabMatch ? vocabMatch.english : ''),
    };

    // Add pronunciation guide if available from vocab
    if (vocabMatch && vocabMatch.pronunciation_guide) {
      word.pronunciation_guide = vocabMatch.pronunciation_guide;
    }

    words.push(word);
    seen.add(romanized.toLowerCase());
  }

  return words;
}

let stepsModified = 0;

for (const lesson of lessons) {
  const lessonVocab = vocabByLesson[lesson.id] || [];

  for (const step of lesson.content.steps) {
    // Skip steps that already have words
    if (step.words && step.words.length > 0) continue;

    const words = extractWordsFromBody(step.body, lessonVocab);

    if (words.length > 0) {
      step.words = words;
      stepsModified++;
    }
  }
}

writeFileSync(join(dataDir, 'lessons.json'), JSON.stringify(lessons, null, 2) + '\n');
console.log(`Modified ${stepsModified} steps with words arrays.`);
console.log('Run the app to see AudioButton next to each word in lesson steps.');
