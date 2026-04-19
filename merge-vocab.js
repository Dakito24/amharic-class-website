const fs = require('fs');
const path = require('path');

// Read existing vocabulary
const vocabPath = path.join(__dirname, 'server/data/vocabulary.json');
const newVocabPath = path.join(__dirname, 'server/data/new-vocab-food.json');

const existingVocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
const newVocab = JSON.parse(fs.readFileSync(newVocabPath, 'utf8'));

// Find the highest ID in existing vocabulary
const maxId = Math.max(...existingVocab.map(item => item.id));
console.log(`Highest existing ID: ${maxId}`);
console.log(`Number of new food entries: ${newVocab.length}`);

// Renumber new vocabulary entries starting from maxId + 1
const renumberedNewVocab = newVocab.map((item, index) => {
  const newId = maxId + 1 + index;
  return {
    ...item,
    id: newId,
    audio_url: `/audio/vocab/vocab-${newId}.mp3`
  };
});

// Check for duplicates based on English text
const existingEnglish = new Set(existingVocab.map(item => item.english.toLowerCase()));
const duplicates = renumberedNewVocab.filter(item =>
  existingEnglish.has(item.english.toLowerCase())
);

if (duplicates.length > 0) {
  console.log(`\nFound ${duplicates.length} potential duplicates:`);
  duplicates.forEach(item => {
    console.log(`  - ${item.english} (${item.romanized})`);
  });
}

// Merge vocabularies
const mergedVocab = [...existingVocab, ...renumberedNewVocab];

// Save merged vocabulary
fs.writeFileSync(vocabPath, JSON.stringify(mergedVocab, null, 2));
console.log(`\nMerged vocabulary saved with ${mergedVocab.length} total entries`);
console.log(`New IDs: ${maxId + 1} - ${maxId + newVocab.length}`);

// Create a list of audio files needed
const audioList = renumberedNewVocab.map(item => ({
  id: item.id,
  english: item.english,
  romanized: item.romanized,
  pronunciation_guide: item.pronunciation_guide,
  filename: `vocab-${item.id}.mp3`
}));

fs.writeFileSync(
  path.join(__dirname, 'audio-generation-list.json'),
  JSON.stringify(audioList, null, 2)
);
console.log(`\nAudio generation list saved to audio-generation-list.json`);
