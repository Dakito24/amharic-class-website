import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the audio generation list
const audioListPath = path.join(__dirname, 'audio-generation-list.json');
const audioList = JSON.parse(fs.readFileSync(audioListPath, 'utf8'));

const outputDir = path.join(__dirname, 'client/static/audio/vocab');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to generate silent placeholder MP3 using ffmpeg
async function generatePlaceholderAudio(entry) {
  const outputPath = path.join(outputDir, entry.filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`✓ Skipping ${entry.filename} (already exists)`);
    return { success: true, skipped: true };
  }

  try {
    // Generate 2 second silent MP3 using ffmpeg
    const command = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -q:a 9 -acodec libmp3lame "${outputPath}" -y 2>/dev/null`;
    await execAsync(command);

    console.log(`✓ Created placeholder ${entry.filename}: ${entry.english} (${entry.romanized})`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`✗ Error generating ${entry.filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to create a minimal valid MP3 file (silence)
function generateMinimalMP3(outputPath) {
  // This is a minimal valid MP3 file (44 bytes of silence)
  const mp3Header = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00
  ]);

  fs.writeFileSync(outputPath, mp3Header);
}

// Function to generate minimal placeholder audio
function generateMinimalPlaceholderAudio(entry) {
  const outputPath = path.join(outputDir, entry.filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`✓ Skipping ${entry.filename} (already exists)`);
    return { success: true, skipped: true };
  }

  try {
    generateMinimalMP3(outputPath);
    console.log(`✓ Created minimal placeholder ${entry.filename}: ${entry.english} (${entry.romanized})`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`✗ Error generating ${entry.filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log(`Starting audio generation for ${audioList.length} entries...\n`);
  console.log('Checking for ffmpeg...');

  let useFfmpeg = false;
  try {
    await execAsync('which ffmpeg');
    console.log('ffmpeg found - will generate proper silent audio files\n');
    useFfmpeg = true;
  } catch {
    console.log('ffmpeg not found - will generate minimal MP3 placeholders\n');
  }

  const results = {
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // Process entries
  for (const entry of audioList) {
    let result;
    if (useFfmpeg) {
      result = await generatePlaceholderAudio(entry);
    } else {
      result = generateMinimalPlaceholderAudio(entry);
    }

    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.generated++;
      }
    } else {
      results.failed++;
      results.errors.push({ id: entry.id, filename: entry.filename, error: result.error });
    }
  }

  console.log('\n=== Generation Summary ===');
  console.log(`Generated: ${results.generated}`);
  console.log(`Skipped (existing): ${results.skipped}`);
  console.log(`Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\nFailed entries:');
    results.errors.forEach(err => {
      console.log(`  - ${err.filename}: ${err.error}`);
    });
  }

  console.log('\n=== Next Steps ===');
  console.log('1. Placeholder audio files have been created');
  console.log('2. Use generate-audio-browser.html to generate actual TTS audio');
  console.log('3. Or upload professionally recorded audio files');
  console.log('4. See audio-recording-needed.txt for the list of entries');

  // Create a list for manual recording
  const recordingList = audioList.map(entry =>
    `${entry.filename}\t${entry.english}\t${entry.romanized}\t${entry.pronunciation_guide}`
  ).join('\n');

  fs.writeFileSync(
    path.join(__dirname, 'audio-recording-needed.txt'),
    `Audio files needed for food vocabulary:\n\n` +
    `Filename\tEnglish\tRomanized\tPronunciation\n` +
    `${recordingList}\n`
  );
  console.log('\nRecording list saved to audio-recording-needed.txt');
}

main().catch(console.error);
