#!/usr/bin/env node

/**
 * Audio Generation Script using Google Cloud Text-to-Speech
 *
 * Prerequisites:
 * 1. Install: npm install @google-cloud/text-to-speech
 * 2. Set up Google Cloud project and enable Text-to-Speech API
 * 3. Download service account key JSON
 * 4. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
 *
 * Usage:
 *   node generate-audio.js                 # Generate all missing audio
 *   node generate-audio.js --force         # Regenerate all audio
 *   node generate-audio.js --start 994     # Start from specific ID
 *   node generate-audio.js --limit 10      # Generate only 10 files
 */

import textToSpeech from '@google-cloud/text-to-speech';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const audioDir = join(__dirname, '..', 'client', 'static', 'audio', 'vocab');

// Parse command line arguments
const args = process.argv.slice(2);
const forceRegenerate = args.includes('--force');
const startId = args.includes('--start') ? parseInt(args[args.indexOf('--start') + 1]) : null;
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

console.log('🎤 Audio Generation Script\n');
console.log('Options:');
console.log(`   Force regenerate: ${forceRegenerate}`);
console.log(`   Start from ID: ${startId || 'beginning'}`);
console.log(`   Limit: ${limit || 'unlimited'}\n`);

// Create audio directory if it doesn't exist
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
  console.log(`✓ Created audio directory: ${audioDir}\n`);
}

// Initialize Google Cloud TTS client
let client;
try {
  client = new textToSpeech.TextToSpeechClient();
  console.log('✓ Connected to Google Cloud Text-to-Speech API\n');
} catch (error) {
  console.error('❌ Failed to initialize Google Cloud TTS client');
  console.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS environment variable is set');
  console.error(`   Error: ${error.message}\n`);
  process.exit(1);
}

// Load vocabulary (either audio-needed.json or vocabulary.json)
let vocabToProcess = [];
const audioNeededPath = join(dataDir, 'audio-needed.json');
const vocabPath = join(dataDir, 'vocabulary.json');

if (existsSync(audioNeededPath)) {
  vocabToProcess = JSON.parse(readFileSync(audioNeededPath, 'utf-8'));
  console.log(`✓ Loaded ${vocabToProcess.length} entries from audio-needed.json\n`);
} else if (existsSync(vocabPath)) {
  const allVocab = JSON.parse(readFileSync(vocabPath, 'utf-8'));
  vocabToProcess = allVocab.filter(v => v.audio_url);
  console.log(`✓ Loaded ${vocabToProcess.length} entries from vocabulary.json\n`);
} else {
  console.error('❌ No vocabulary file found');
  process.exit(1);
}

// Filter based on options
if (startId) {
  vocabToProcess = vocabToProcess.filter(v => v.id >= startId);
  console.log(`   Filtered to ${vocabToProcess.length} entries (ID >= ${startId})`);
}

if (!forceRegenerate) {
  const originalCount = vocabToProcess.length;
  vocabToProcess = vocabToProcess.filter(v => {
    const audioPath = join(__dirname, '..', 'client', 'static', v.audio_url);
    return !existsSync(audioPath);
  });
  console.log(`   Skipped ${originalCount - vocabToProcess.length} existing files`);
}

if (limit) {
  vocabToProcess = vocabToProcess.slice(0, limit);
  console.log(`   Limited to ${vocabToProcess.length} entries\n`);
}

if (vocabToProcess.length === 0) {
  console.log('✅ No audio files to generate!\n');
  process.exit(0);
}

console.log(`\n🎵 Generating ${vocabToProcess.length} audio files...\n`);

// Generate audio for each entry
let successCount = 0;
let errorCount = 0;
const errors = [];

for (let i = 0; i < vocabToProcess.length; i++) {
  const entry = vocabToProcess[i];
  const progress = `[${i + 1}/${vocabToProcess.length}]`;

  try {
    // Use romanized text for TTS (Amharic Ge'ez script may not be supported well)
    // Google TTS supports Amharic but quality varies
    const textToSpeak = entry.romanized || entry.amharic;

    // Request configuration for Amharic
    const request = {
      input: { text: textToSpeak },
      voice: {
        languageCode: 'am-ET', // Amharic (Ethiopia)
        ssmlGender: 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.9, // Slightly slower for clarity
        pitch: 0
      }
    };

    // Call Google TTS API
    const [response] = await client.synthesizeSpeech(request);

    // Save audio file
    const audioPath = join(__dirname, '..', 'client', 'static', entry.audio_url);
    writeFileSync(audioPath, response.audioContent, 'binary');

    successCount++;
    console.log(`${progress} ✓ Generated audio for ID ${entry.id}: "${entry.english}"`);

    // Rate limiting: wait 100ms between requests to avoid hitting API limits
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    errorCount++;
    errors.push({
      id: entry.id,
      english: entry.english,
      error: error.message
    });
    console.log(`${progress} ❌ Failed for ID ${entry.id}: ${error.message}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Generation Summary:');
console.log(`   ✓ Success: ${successCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);
console.log('='.repeat(60) + '\n');

if (errors.length > 0) {
  const errorLogPath = join(dataDir, 'audio-generation-errors.json');
  writeFileSync(errorLogPath, JSON.stringify(errors, null, 2));
  console.log(`⚠️  Error details saved to: ${errorLogPath}\n`);
  console.log('Failed entries:');
  errors.forEach(err => {
    console.log(`   - ID ${err.id}: ${err.english} - ${err.error}`);
  });
  console.log('');
}

if (successCount > 0) {
  console.log('✅ Audio generation complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Test audio playback in the app');
  console.log('   2. If quality is poor, consider professional recording');
  console.log('   3. Check audio-generation-errors.json for any failures');
  console.log('   4. Commit new audio files to version control\n');

  // Estimate cost (Google TTS: ~$4 per 1 million characters)
  const totalChars = vocabToProcess.reduce((sum, v) => sum + (v.romanized || v.amharic).length, 0);
  const estimatedCost = (totalChars / 1000000) * 4;
  console.log(`💰 Estimated Google TTS cost: $${estimatedCost.toFixed(4)}\n`);
}

console.log('✨ Done!\n');
