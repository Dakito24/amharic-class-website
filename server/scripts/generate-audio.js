import textToSpeech from '@google-cloud/text-to-speech';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const audioDir = join(__dirname, '..', '..', 'client', 'static', 'audio', 'vocab');

// Ensure audio directory exists
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const client = new textToSpeech.TextToSpeechClient();
const vocabulary = JSON.parse(readFileSync(join(dataDir, 'vocabulary.json'), 'utf-8'));

console.log(`Generating audio for ${vocabulary.length} vocabulary entries...`);
console.log(`Output directory: ${audioDir}\n`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const word of vocabulary) {
  const filename = `vocab-${word.id}.mp3`;
  const filepath = join(audioDir, filename);

  // Skip if audio already exists
  if (existsSync(filepath)) {
    skipped++;
    continue;
  }

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: word.amharic },
      voice: { languageCode: 'am-ET', ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    writeFileSync(filepath, response.audioContent, 'binary');
    generated++;

    if (generated % 25 === 0) {
      console.log(`  Generated ${generated} files...`);
    }
  } catch (err) {
    console.error(`  FAILED: vocab ${word.id} (${word.english}): ${err.message}`);
    failed++;
  }
}

console.log(`\nAudio generation complete!`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped (already exist): ${skipped}`);
if (failed > 0) console.log(`  Failed: ${failed}`);

// Update vocabulary.json with audio_url paths
console.log('\nUpdating vocabulary.json with audio_url paths...');
const updated = vocabulary.map(word => ({
  ...word,
  audio_url: `/audio/vocab/vocab-${word.id}.mp3`
}));

writeFileSync(join(dataDir, 'vocabulary.json'), JSON.stringify(updated, null, 2) + '\n');
console.log('Done! Run "npm run seed -w server" to sync audio_url to the database.');
