import textToSpeech from '@google-cloud/text-to-speech';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const audioDir = join(__dirname, '..', '..', 'client', 'static', 'audio', 'conversations');

if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const client = new textToSpeech.TextToSpeechClient();
const conversations = JSON.parse(readFileSync(join(dataDir, 'conversations.json'), 'utf-8'));

// Collect all user option turns that need audio
const userOptions = [];
for (const convo of conversations) {
  for (let ti = 0; ti < convo.turns.length; ti++) {
    const turn = convo.turns[ti];
    if (turn.type === 'user') {
      for (let oi = 0; oi < turn.options.length; oi++) {
        const option = turn.options[oi];
        const filename = `convo-${convo.id}-user-${ti}-${oi}.mp3`;
        const audioUrl = `/audio/conversations/${filename}`;
        userOptions.push({
          convoId: convo.id,
          turnIndex: ti,
          optionIndex: oi,
          amharic: option.amharic,
          romanized: option.romanized,
          filename,
          audioUrl
        });
        // Set audio_url on the option in-place
        option.audio_url = audioUrl;
      }
    }
  }
}

console.log(`Generating audio for ${userOptions.length} user response options...`);
console.log(`Output directory: ${audioDir}\n`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const opt of userOptions) {
  const filepath = join(audioDir, opt.filename);

  if (existsSync(filepath)) {
    skipped++;
    continue;
  }

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: opt.amharic },
      voice: { languageCode: 'am-ET', ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    writeFileSync(filepath, response.audioContent, 'binary');
    generated++;
    console.log(`  Generated: ${opt.filename} (${opt.romanized})`);
  } catch (err) {
    console.error(`  FAILED: ${opt.filename} (${opt.romanized}): ${err.message}`);
    failed++;
  }
}

// Write updated conversations.json with audio_url on user options
writeFileSync(join(dataDir, 'conversations.json'), JSON.stringify(conversations, null, 2) + '\n');

console.log(`\nUser response audio generation complete!`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped (already exist): ${skipped}`);
if (failed > 0) console.log(`  Failed: ${failed}`);
console.log(`\nUpdated conversations.json with audio_url on all user options.`);
