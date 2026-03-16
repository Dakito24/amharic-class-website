import textToSpeech from '@google-cloud/text-to-speech';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const audioDir = join(__dirname, '..', '..', 'client', 'static', 'audio', 'conversations');

// Ensure audio directory exists
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const client = new textToSpeech.TextToSpeechClient();
const conversations = JSON.parse(readFileSync(join(dataDir, 'conversations.json'), 'utf-8'));

// Collect all NPC turns that need audio
const npcTurns = [];
for (const convo of conversations) {
  let npcIndex = 0;
  for (const turn of convo.turns) {
    if (turn.type === 'npc') {
      npcTurns.push({
        convoId: convo.id,
        npcIndex,
        amharic: turn.amharic,
        romanized: turn.romanized,
        filename: `convo-${convo.id}-${npcIndex}.mp3`
      });
      npcIndex++;
    }
  }
}

console.log(`Generating audio for ${npcTurns.length} conversation NPC turns...`);
console.log(`Output directory: ${audioDir}\n`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const turn of npcTurns) {
  const filepath = join(audioDir, turn.filename);

  // Skip if audio already exists
  if (existsSync(filepath)) {
    skipped++;
    continue;
  }

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: turn.amharic },
      voice: { languageCode: 'am-ET', ssmlGender: 'MALE' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    writeFileSync(filepath, response.audioContent, 'binary');
    generated++;
    console.log(`  Generated: ${turn.filename} (${turn.romanized})`);
  } catch (err) {
    console.error(`  FAILED: ${turn.filename} (${turn.romanized}): ${err.message}`);
    failed++;
  }
}

console.log(`\nConversation audio generation complete!`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped (already exist): ${skipped}`);
if (failed > 0) console.log(`  Failed: ${failed}`);
