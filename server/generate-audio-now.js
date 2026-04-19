#!/usr/bin/env node

/**
 * Generate real audio using Google Translate TTS (free, no API key needed)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabPath = join(__dirname, 'data', 'vocabulary.json');
const audioDir = join(__dirname, '..', 'client', 'static', 'audio', 'vocab');

console.log('🎤 Generating audio for new vocabulary (IDs 1074-1153)...\n');

// Load vocabulary
const vocab = JSON.parse(readFileSync(vocabPath, 'utf-8'));
const newEntries = vocab.filter(v => v.id >= 1074 && v.id <= 1153);

console.log(`Found ${newEntries.length} entries to generate audio for\n`);

let completed = 0;
let errors = 0;

// Function to download TTS audio from Google Translate
function downloadTTS(text, filename) {
  return new Promise((resolve, reject) => {
    // Use romanized Amharic for better pronunciation
    const textToSpeak = encodeURIComponent(text);
    // Google Translate TTS endpoint (free, no key needed)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=am&client=tw-ob&q=${textToSpeak}`;

    const file = writeFileSync(filename, ''); // Create empty file

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 200) {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          writeFileSync(filename, Buffer.concat(chunks));
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

// Generate audio for each entry with delay to avoid rate limiting
async function generateAll() {
  for (const entry of newEntries) {
    const audioPath = join(audioDir, `vocab-${entry.id}.mp3`);
    const progress = `[${completed + 1}/${newEntries.length}]`;

    try {
      // Use romanized text for TTS
      const textToSpeak = entry.romanized || entry.english;
      await downloadTTS(textToSpeak, audioPath);
      completed++;
      console.log(`${progress} ✓ ID ${entry.id}: "${entry.english}" (${textToSpeak})`);

      // Wait 500ms between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      errors++;
      console.log(`${progress} ❌ ID ${entry.id}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Complete! Generated ${completed}/${newEntries.length} audio files`);
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors`);
  }
  console.log('='.repeat(60) + '\n');
}

generateAll().catch(console.error);
