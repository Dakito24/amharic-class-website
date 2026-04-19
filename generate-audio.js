import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Initialize the TTS client
const client = new textToSpeech.TextToSpeechClient();

// Function to generate audio for a single entry
async function generateAudio(entry) {
  const outputPath = path.join(outputDir, entry.filename);

  // Skip if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`✓ Skipping ${entry.filename} (already exists)`);
    return { success: true, skipped: true };
  }

  try {
    // Use the romanized text for TTS
    const text = entry.romanized;

    // Construct the request
    const request = {
      input: { text: text },
      // Use a generic voice since Amharic-specific voices may not be available
      voice: {
        languageCode: 'en-US', // Fallback to English voice
        name: 'en-US-Standard-A',
        ssmlGender: 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.85, // Slightly slower for language learning
        pitch: 0,
      },
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);

    // Write the audio file
    fs.writeFileSync(outputPath, response.audioContent, 'binary');

    console.log(`✓ Generated ${entry.filename}: ${entry.english} (${entry.romanized})`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`✗ Error generating ${entry.filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log(`Starting audio generation for ${audioList.length} entries...\n`);

  const results = {
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // Process entries sequentially to avoid rate limits
  for (const entry of audioList) {
    const result = await generateAudio(entry);

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

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
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

  // Save failed entries list
  if (results.failed > 0) {
    fs.writeFileSync(
      path.join(__dirname, 'audio-generation-failures.json'),
      JSON.stringify(results.errors, null, 2)
    );
    console.log('\nFailed entries saved to audio-generation-failures.json');
  }
}

main().catch(console.error);
