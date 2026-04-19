#!/usr/bin/env node

/**
 * Integration Script for New Vocabulary
 *
 * This script:
 * 1. Loads all new vocabulary files (food, jobs, activities, emotions, biblical)
 * 2. Checks for duplicates against existing vocabulary.json
 * 3. Merges non-duplicate entries into vocabulary.json
 * 4. Generates a report of what was added/skipped
 * 5. Prepares list for audio generation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');

console.log('🔄 Starting vocabulary integration...\n');

// Load existing vocabulary
const existingVocabPath = join(dataDir, 'vocabulary.json');
const existingVocab = JSON.parse(readFileSync(existingVocabPath, 'utf-8'));
console.log(`✓ Loaded ${existingVocab.length} existing vocabulary entries`);

// Create lookup maps for duplicate detection
const existingByEnglish = new Map();
const existingByRomanized = new Map();
const existingByAmharic = new Map();

existingVocab.forEach(entry => {
  const englishKey = entry.english.toLowerCase().trim();
  const romanizedKey = entry.romanized.toLowerCase().trim();
  const amharicKey = entry.amharic.trim();

  if (!existingByEnglish.has(englishKey)) {
    existingByEnglish.set(englishKey, []);
  }
  existingByEnglish.get(englishKey).push(entry);

  if (!existingByRomanized.has(romanizedKey)) {
    existingByRomanized.set(romanizedKey, []);
  }
  existingByRomanized.get(romanizedKey).push(entry);

  if (!existingByAmharic.has(amharicKey)) {
    existingByAmharic.set(amharicKey, []);
  }
  existingByAmharic.get(amharicKey).push(entry);
});

// Load new vocabulary files
const newVocabFiles = [
  'new-vocab-food.json',
  'new-vocab-jobs.json',
  'new-vocab-activities.json',
  'new-vocab-emotions.json',
  'new-vocab-biblical.json'
];

let allNewEntries = [];
const fileStats = {};

for (const filename of newVocabFiles) {
  const filepath = join(dataDir, filename);
  if (existsSync(filepath)) {
    const entries = JSON.parse(readFileSync(filepath, 'utf-8'));
    allNewEntries = allNewEntries.concat(entries);
    fileStats[filename] = entries.length;
    console.log(`✓ Loaded ${entries.length} entries from ${filename}`);
  } else {
    console.log(`⚠️  File not found: ${filename}`);
    fileStats[filename] = 0;
  }
}

console.log(`\n📊 Total new entries to process: ${allNewEntries.length}\n`);

// Check for duplicates and filter
const toAdd = [];
const duplicates = [];
const report = {
  totalProcessed: allNewEntries.length,
  added: 0,
  duplicates: 0,
  byCategory: {}
};

allNewEntries.forEach(entry => {
  const englishKey = entry.english.toLowerCase().trim();
  const romanizedKey = entry.romanized.toLowerCase().trim();
  const amharicKey = entry.amharic.trim();

  // Check for duplicates
  let isDuplicate = false;
  let duplicateReason = '';

  if (existingByEnglish.has(englishKey)) {
    const matches = existingByEnglish.get(englishKey);
    // Check if romanized also matches (same word)
    const exactMatch = matches.find(m =>
      m.romanized.toLowerCase().trim() === romanizedKey
    );
    if (exactMatch) {
      isDuplicate = true;
      duplicateReason = `Duplicate English/Romanized: "${entry.english}" exists as ID ${exactMatch.id}`;
    }
  }

  if (!isDuplicate && existingByAmharic.has(amharicKey)) {
    const matches = existingByAmharic.get(amharicKey);
    // Check if English also matches
    const exactMatch = matches.find(m =>
      m.english.toLowerCase().trim() === englishKey
    );
    if (exactMatch) {
      isDuplicate = true;
      duplicateReason = `Duplicate Amharic/English: "${entry.amharic}" exists as ID ${exactMatch.id}`;
    }
  }

  if (isDuplicate) {
    duplicates.push({
      ...entry,
      reason: duplicateReason
    });
    report.duplicates++;
  } else {
    toAdd.push(entry);
    report.added++;

    // Update category stats
    if (!report.byCategory[entry.category]) {
      report.byCategory[entry.category] = 0;
    }
    report.byCategory[entry.category]++;

    // Add to lookup maps to catch duplicates within new entries
    if (!existingByEnglish.has(englishKey)) {
      existingByEnglish.set(englishKey, []);
    }
    existingByEnglish.get(englishKey).push(entry);

    if (!existingByRomanized.has(romanizedKey)) {
      existingByRomanized.set(romanizedKey, []);
    }
    existingByRomanized.get(romanizedKey).push(entry);

    if (!existingByAmharic.has(amharicKey)) {
      existingByAmharic.set(amharicKey, []);
    }
    existingByAmharic.get(amharicKey).push(entry);
  }
});

console.log('📈 Processing Results:');
console.log(`   ✓ ${report.added} entries will be added`);
console.log(`   ⚠️  ${report.duplicates} duplicates skipped\n`);

if (duplicates.length > 0) {
  console.log('⚠️  Duplicate entries found:');
  duplicates.forEach(dup => {
    console.log(`   - ID ${dup.id}: ${dup.english} - ${dup.reason}`);
  });
  console.log('');
}

// Merge and save
if (toAdd.length > 0) {
  const mergedVocab = [...existingVocab, ...toAdd];

  // Sort by ID
  mergedVocab.sort((a, b) => a.id - b.id);

  // Create backup
  const backupPath = join(dataDir, `vocabulary.json.backup-${Date.now()}`);
  writeFileSync(backupPath, JSON.stringify(existingVocab, null, 2));
  console.log(`✓ Created backup: ${backupPath}`);

  // Write merged vocabulary
  writeFileSync(existingVocabPath, JSON.stringify(mergedVocab, null, 2));
  console.log(`✓ Updated vocabulary.json (${existingVocab.length} → ${mergedVocab.length} entries)\n`);

  // Generate audio list
  const audioList = toAdd.map(entry => ({
    id: entry.id,
    english: entry.english,
    amharic: entry.amharic,
    romanized: entry.romanized,
    audio_url: entry.audio_url
  }));

  const audioListPath = join(dataDir, 'audio-needed.json');
  writeFileSync(audioListPath, JSON.stringify(audioList, null, 2));
  console.log(`✓ Generated audio list: ${audioListPath}`);
  console.log(`   ${audioList.length} audio files needed\n`);

  // Generate report
  const reportPath = join(dataDir, 'integration-report.json');
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...report,
    fileStats,
    duplicates: duplicates.map(d => ({
      id: d.id,
      english: d.english,
      reason: d.reason
    }))
  }, null, 2));
  console.log(`✓ Generated report: ${reportPath}\n`);

  // Summary
  console.log('📊 Summary by Category:');
  Object.entries(report.byCategory).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} entries`);
  });

  console.log('\n✅ Integration complete!');
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review duplicates (if any) in integration-report.json`);
  console.log(`   2. Run audio generation: node generate-audio.js`);
  console.log(`   3. Test the app with new vocabulary`);

} else {
  console.log('⚠️  No new entries to add (all were duplicates)');
}

console.log('\n✨ Done!\n');
