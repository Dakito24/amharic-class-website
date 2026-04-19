# Audio Generation for Food Vocabulary

## Summary

Successfully integrated 80 new food vocabulary entries and created placeholder audio files.

## What Was Done

### 1. Vocabulary Integration
- **Input**: `server/data/new-vocab-food.json` (80 food entries, IDs 994-1073)
- **Conflict Resolution**: Existing vocabulary already had IDs 994-1073 (emotion vocabulary)
- **Solution**: Renumbered new food vocabulary to IDs 1074-1153
- **Output**: Updated `server/data/vocabulary.json` with 1153 total entries (was 1073)
- **Duplicates Found**: 19 entries that already existed in different contexts

### 2. Audio Files Created
- **Location**: `client/static/audio/vocab/`
- **Files Created**: 80 placeholder MP3 files (vocab-1074.mp3 through vocab-1153.mp3)
- **Format**: Minimal valid MP3 files (44 bytes each)
- **Purpose**: Prevent app errors while awaiting actual audio generation

### 3. Generated Files

#### Configuration & Data Files
- `audio-generation-list.json` - List of all 80 entries needing audio
- `audio-recording-needed.txt` - Tab-separated list for manual recording

#### Audio Generation Scripts
1. **generate-audio.js** - Google Cloud TTS (requires credentials)
2. **generate-audio-fallback.js** - Creates placeholder MP3 files ✓ (completed)
3. **generate-audio-tts.py** - Python TTS using gTTS or pyttsx3
4. **generate-audio-browser.html** - Browser-based TTS generator

## Food Vocabulary Added (IDs 1074-1153)

### Vegetables (7 entries)
- tomato, onion, potato, carrot, cabbage, garlic, pepper, lettuce

### Fruits (8 entries)
- banana, orange, apple, mango, papaya, avocado, lemon, grape

### Grains (4 entries)
- teff, wheat, barley, rice

### Dairy (3 entries)
- cheese, butter, yogurt

### Beverages (5 entries)
- tea, juice, beer, wine

### Condiments & Ingredients (5 entries)
- honey, sugar, salt, oil, spice

### Meals (4 entries)
- breakfast, lunch, dinner, snack

### Adjectives (7 entries)
- hot, cold, spicy, sweet, sour, fresh, delicious

### Phrases (47 entries)
- Hunger/thirst expressions
- Food preferences
- Dietary restrictions
- Restaurant phrases
- Meal etiquette

## Next Steps: Generate Actual Audio

You have three options for generating actual TTS audio:

### Option 1: Python TTS (Recommended)
```bash
# Install Python TTS library
pip install gtts

# Generate audio files
python3 generate-audio-tts.py
```

This will:
- Use Google's Text-to-Speech service (requires internet)
- Replace the 44-byte placeholder files with actual audio
- Skip files that already exist with proper audio

### Option 2: Browser-Based TTS
```bash
# Start your development server
cd /Users/sharmaleycarter/Documents/DakitoDasho/projects/amharic-class-website
npm run dev

# Open in browser
open http://localhost:5173/generate-audio-browser.html
```

Note: Browser TTS cannot export files directly, but you can:
- Use audio recording software to capture the output
- Test different voices for quality
- Use as a preview tool

### Option 3: Google Cloud TTS (Best Quality)
```bash
# Set up Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials.json"

# Run the generator
node generate-audio.js
```

### Option 4: Professional Recording
Use `audio-recording-needed.txt` for reference and record with:
- Native Amharic speaker
- Professional recording equipment
- Consistent audio quality

## File Structure

```
/Users/sharmaleycarter/Documents/DakitoDasho/projects/amharic-class-website/
├── server/data/
│   ├── vocabulary.json              # Updated with 1153 entries
│   └── new-vocab-food.json          # Original food vocab data
├── client/static/audio/vocab/
│   ├── vocab-1074.mp3               # Placeholder files
│   ├── vocab-1075.mp3
│   └── ... (80 files total)
├── audio-generation-list.json       # JSON list for scripts
├── audio-recording-needed.txt       # Tab-separated list
├── merge-vocab.js                   # Vocabulary merger script
├── generate-audio.js                # Google Cloud TTS
├── generate-audio-fallback.js       # Placeholder generator ✓
├── generate-audio-tts.py            # Python TTS generator
└── generate-audio-browser.html      # Browser TTS tool
```

## Testing

To test that everything works:

```bash
# Verify vocabulary was merged
node -e "console.log(require('./server/data/vocabulary.json').length)"
# Should output: 1153

# Check audio files exist
ls client/static/audio/vocab/vocab-11{74..53}.mp3 | wc -l
# Should output: 80

# Test the app
cd client
npm run dev
# Navigate to a food vocabulary lesson
```

## Duplicate Entries Found

The following 19 entries already existed in the vocabulary:
- tomato, onion, potato, garlic
- banana, orange, lemon
- rice, cheese, butter
- tea, juice, honey, sugar, salt, oil
- "I am hungry", "I am fasting", "I am full"

These were still added with new IDs to maintain consistency with the new-vocab-food.json file.

## Important Notes

1. **Placeholder Audio**: Current files are 44-byte placeholders that won't play audio
2. **No Errors**: The app won't crash - it will just play silent audio
3. **Progressive Enhancement**: You can replace files one at a time
4. **File Naming**: Maintain the format `vocab-{id}.mp3`
5. **Audio Quality**: For production, consider professional Amharic voice recording

## Verification Commands

```bash
# Count new audio files
ls client/static/audio/vocab/vocab-{1074..1153}.mp3 2>/dev/null | wc -l

# Check file sizes (should be 44 bytes for placeholders)
ls -lh client/static/audio/vocab/vocab-1074.mp3

# Verify vocabulary merge
grep -c '"id"' server/data/vocabulary.json

# List all food vocabulary IDs
jq '.[].id' audio-generation-list.json
```

## Troubleshooting

### If audio doesn't play:
1. Check browser console for 404 errors
2. Verify file exists: `ls client/static/audio/vocab/vocab-{id}.mp3`
3. Check audio URL in vocabulary.json matches file name

### If TTS generation fails:
1. Check internet connection (for gTTS)
2. Verify Python/Node.js is installed
3. Install required packages: `pip install gtts` or `npm install`
4. Check file permissions in audio directory

### If vocabulary doesn't show:
1. Restart the server
2. Clear browser cache
3. Check vocabulary.json is valid JSON: `node -e "require('./server/data/vocabulary.json')"`

## Credits

- Vocabulary compilation: Original food vocabulary dataset
- Audio placeholders: Minimal MP3 format (44 bytes)
- TTS options: gTTS, pyttsx3, Google Cloud TTS, Web Speech API
