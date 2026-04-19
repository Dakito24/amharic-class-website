# Quick Start: Generate Real Audio Files

## Current Status
✅ 80 food vocabulary entries added to vocabulary.json (IDs 1074-1153)
✅ 80 placeholder MP3 files created (44 bytes each - silent audio)
⚠️ Real TTS audio needs to be generated

## Generate Audio NOW (Choose One Method)

### Method 1: Python + gTTS (Easiest, Best Quality)

```bash
# Install gTTS (one-time)
pip install gtts

# Generate all 80 audio files
python3 generate-audio-tts.py
```

**Pros**:
- Best quality
- Requires internet
- Free
- Automatic batch processing

**Output**: Real MP3 files with speech

---

### Method 2: Browser TTS (Preview/Test Only)

```bash
# Start dev server
npm run dev

# Open browser tool
open http://localhost:5173/generate-audio-browser.html
```

**Pros**:
- No dependencies
- Test different voices
- Preview audio quality

**Cons**:
- Cannot export files directly
- Need audio recording software to capture

---

### Method 3: Google Cloud TTS (Production Quality)

```bash
# Set credentials (one-time)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"

# Generate audio
node generate-audio.js
```

**Pros**:
- Highest quality
- Professional voices
- Best pronunciation

**Cons**:
- Requires Google Cloud account
- Requires API credentials
- May have costs

---

## Verify Everything Works

```bash
# Check vocabulary was merged
node -e "console.log(require('./server/data/vocabulary.json').length)"
# Expected: 1153

# Count placeholder audio files
ls client/static/audio/vocab/vocab-{1074..1153}.mp3 2>/dev/null | wc -l
# Expected: 80

# Test the app
npm run dev
# Visit http://localhost:5173
```

---

## File Locations

```
Vocabulary Data:
  server/data/vocabulary.json (1153 entries)

Audio Files:
  client/static/audio/vocab/vocab-1074.mp3 → vocab-1153.mp3

Generation Scripts:
  generate-audio-tts.py        (Python - Recommended)
  generate-audio.js            (Google Cloud TTS)
  generate-audio-browser.html  (Browser preview)

Reference Files:
  audio-generation-list.json   (Full list with romanized text)
  audio-recording-needed.txt   (Tab-separated for spreadsheet)
```

---

## Recommended: Use Python gTTS

This is the fastest path to working audio:

```bash
# 1. Install gTTS
pip install gtts

# 2. Generate audio (takes ~2-3 minutes)
python3 generate-audio-tts.py

# 3. Verify files were created
ls -lh client/static/audio/vocab/vocab-1074.mp3
# Should show file size > 10KB (not 44 bytes)

# 4. Test in app
npm run dev
```

---

## What Each Vocabulary Entry Looks Like

```json
{
  "id": 1074,
  "english": "tomato",
  "amharic": "ቲማቲም",
  "romanized": "timatim",
  "pronunciation_guide": "tee-mah-TEEM",
  "category": "noun",
  "gender": null,
  "lesson_id": 8,
  "audio_url": "/audio/vocab/vocab-1074.mp3"
}
```

The `romanized` field is used for TTS generation.

---

## Troubleshooting

**Q: Audio files exist but no sound plays?**
- Current files are 44-byte placeholders
- Run `python3 generate-audio-tts.py` to generate real audio

**Q: Python script fails?**
```bash
pip install --upgrade gtts
python3 --version  # Ensure Python 3.x
```

**Q: Want to test one file first?**
```python
from gtts import gTTS
tts = gTTS('timatim', lang='en', slow=True)
tts.save('test.mp3')
```

**Q: Files generated but quality is poor?**
- Use Google Cloud TTS for better quality
- Or record with native Amharic speaker

---

## Next Steps After Audio Generation

1. Test vocabulary in the app (Lesson 8 - Food)
2. Create quiz questions for the new vocabulary
3. Add food vocabulary to flashcard system
4. Update lesson content to include new words
5. Consider adding food-themed conversation scenarios

---

## Support

See full documentation: `AUDIO_GENERATION_README.md`
