# Vocabulary Expansion System - 400 New Entries

## 📊 Current Status

### ✅ Completed
- **Food Category**: 80 entries created (IDs 994-1073)
  - File: `data/new-vocab-food.json`
  - Includes: vegetables, fruits, grains, dairy, beverages, meals, adjectives, phrases, sentences

### 🔧 Scripts Created
1. **integrate-new-vocab.js** - Merges new vocabulary, checks duplicates
2. **generate-audio.js** - Generates audio files using Google Cloud TTS
3. **generate-remaining-vocab.js** - Template for remaining categories

### ⏳ Remaining Work
- **Jobs**: 80 entries (IDs 1074-1153) - Partially created
- **Activities**: 80 entries (IDs 1154-1233) - Template ready
- **Emotions**: 80 entries (IDs 1314-1233) - Template ready
- **Biblical**: 80 entries (IDs 1314-1393) - Template ready

---

## 🚀 Quick Start - Integration Steps

### Step 1: Complete Remaining Vocabulary

You have two options:

**Option A: Generate Programmatically** (Recommended)
```bash
cd server
node generate-remaining-vocab.js
```

This will create:
- `data/new-vocab-jobs.json` (80 entries)
- `data/new-vocab-activities.json` (80 entries)
- `data/new-vocab-emotions.json` (80 entries)
- `data/new-vocab-biblical.json` (80 entries)

**Option B: Manual Creation**
- Copy `data/new-vocab-food.json` as a template
- Edit each file with appropriate translations
- Follow the same ID sequence

### Step 2: Integrate All New Vocabulary

```bash
cd server
node integrate-new-vocab.js
```

This will:
- ✅ Check for duplicates against existing vocabulary
- ✅ Merge non-duplicate entries into `vocabulary.json`
- ✅ Create backup of original file
- ✅ Generate `data/audio-needed.json` (list of entries needing audio)
- ✅ Create `data/integration-report.json` (detailed stats)

**Expected Output:**
```
✓ Loaded 963 existing vocabulary entries
✓ Loaded 80 entries from new-vocab-food.json
✓ Loaded 80 entries from new-vocab-jobs.json
✓ Loaded 80 entries from new-vocab-activities.json
✓ Loaded 80 entries from new-vocab-emotions.json
✓ Loaded 80 entries from new-vocab-biblical.json

📊 Total new entries to process: 400

📈 Processing Results:
   ✓ 395 entries will be added
   ⚠️  5 duplicates skipped

✓ Updated vocabulary.json (963 → 1358 entries)
✓ Generated audio list: data/audio-needed.json
   395 audio files needed

✅ Integration complete!
```

### Step 3: Generate Audio Files

#### Prerequisites
1. Install Google Cloud TTS library:
```bash
npm install @google-cloud/text-to-speech
```

2. Set up Google Cloud:
   - Create project at https://console.cloud.google.com
   - Enable Text-to-Speech API
   - Create service account & download JSON key
   - Set environment variable:
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
     ```

#### Generate Audio
```bash
cd server
node generate-audio.js
```

**Options:**
```bash
node generate-audio.js                 # Generate all missing audio
node generate-audio.js --force         # Regenerate all
node generate-audio.js --start 994     # Start from ID 994
node generate-audio.js --limit 10      # Generate only 10 files (for testing)
```

**Output:**
- Audio files saved to: `client/static/audio/vocab/vocab-{id}.mp3`
- Progress shown for each file
- Error log created if any failures

**Cost Estimate:**
- Google TTS: ~$4 per 1 million characters
- 400 entries × ~20 chars = 8,000 chars
- Estimated cost: **$0.03** (very cheap!)

**Alternative if TTS quality is poor:**
- Use a professional recording service
- Record yourself (native speaker recommended)
- Use the generated audio as placeholder

### Step 4: Test in the App

1. **Start the development server:**
```bash
cd ..  # back to root
npm run dev
```

2. **Test new vocabulary:**
   - Visit Practice page - should show ~1,358 words
   - Filter by categories (food, jobs, emotions, etc.)
   - Play audio for new entries
   - Check flashcards include new words
   - Try quizzes with new vocabulary

3. **Verify no duplicates:**
   - Check `data/integration-report.json`
   - Review any skipped entries
   - Confirm total count is correct

### Step 5: Deploy

1. **Commit changes:**
```bash
git add server/data/vocabulary.json
git add client/static/audio/vocab/*.mp3
git commit -m "Add 400 new vocabulary entries (food, jobs, activities, emotions, biblical)"
git push
```

2. **Reseed production database:**
```bash
cd server
node src/seed.js
```

This will update the database with new vocabulary entries.

---

## 📁 File Structure

```
server/
├── data/
│   ├── vocabulary.json                   # Main vocabulary file (UPDATED)
│   ├── vocabulary.json.backup-*          # Backup (auto-created)
│   ├── new-vocab-food.json               # ✅ Created (80 entries)
│   ├── new-vocab-jobs.json               # ⏳ To be generated (80 entries)
│   ├── new-vocab-activities.json         # ⏳ To be generated (80 entries)
│   ├── new-vocab-emotions.json           # ⏳ To be generated (80 entries)
│   ├── new-vocab-biblical.json           # ⏳ To be generated (80 entries)
│   ├── audio-needed.json                 # Auto-generated list
│   ├── integration-report.json           # Auto-generated report
│   └── audio-generation-errors.json      # Auto-generated if errors
├── integrate-new-vocab.js                # Integration script
├── generate-audio.js                     # Audio generation script
└── generate-remaining-vocab.js           # Vocabulary generator script

client/static/audio/vocab/
├── vocab-1.mp3 → vocab-993.mp3          # Existing audio
└── vocab-994.mp3 → vocab-1393.mp3       # NEW audio (400 files)
```

---

## 🎯 Categories Breakdown

### Food (80 entries) - ✅ COMPLETE
- **40 words**: Vegetables (tomato, onion, potato, carrot, cabbage, garlic, pepper, lettuce), Fruits (banana, orange, apple, mango, papaya, avocado, lemon, grape), Grains (teff, wheat, barley, rice), Dairy (cheese, butter, yogurt), Beverages (tea, juice, beer, wine), Condiments (honey, sugar, salt, oil, spice), Meals (breakfast, lunch, dinner, snack)
- **40 adjectives/phrases**: Hot, cold, spicy, sweet, sour, fresh, delicious, "I am hungry", "This is delicious", "Can I have water?", etc.

### Jobs (80 entries) - 🔧 IN PROGRESS
- **40 job titles**: Dentist, pharmacist, veterinarian, professor, judge, waiter, chef, mechanic, electrician, plumber, builder, manager, accountant, banker, shepherd, artist, musician, monk, nun, etc.
- **40 phrases/sentences**: "I am a teacher", "What do you do?", "I work at a hospital", "My father is a driver", "She wants to become a doctor", etc.

### Activities (80 entries) - ⏳ PENDING
- **40 verbs**: Run, walk, jump, dance, swim, climb, listen, think, remember, wash, clean, build, repair, meet, visit, etc.
- **40 phrases/sentences**: "I am running", "Let's play football", "I like to read", "We play every Saturday", etc.

### Emotions (80 entries) - ⏳ PENDING
- **40 emotion words**: Surprised, shocked, confused, bored, proud, jealous, grateful, hopeful, disappointed, frustrated, embarrassed, ashamed, peaceful, calm, stressed, etc.
- **40 phrases/sentences**: "I am surprised", "Don't worry", "I feel proud", "She is disappointed", etc.

### Biblical (80 entries) - ⏳ PENDING (Most Critical Gap!)
- **40 terms**: Jesus, Jesus Christ, Holy Spirit, Mary, angel, devil, Bible, Gospel, Heaven, hell, cross, altar, monastery, faith, sin, salvation, mercy, grace, righteousness, baptism, prayer, worship, blessing, forgiveness, etc.
- **40 phrases/sentences**: "God bless you", "Thank God", "Let us pray", "Jesus loves you", "I go to church every Sunday", "God is good", etc.

---

## 🔍 Duplicate Detection

The integration script checks for duplicates by comparing:
1. **English text** (case-insensitive)
2. **Romanized text** (case-insensitive)
3. **Amharic script** (exact match)

**Duplicate Handling:**
- Exact matches are skipped
- Similar entries with different context are allowed
- Report shows all skipped entries with reasons

---

## 💡 Tips & Best Practices

### For Vocabulary Creation
1. **Use consistent formatting** - Follow the template exactly
2. **Pronunciation guides** - Use CAPS for stressed syllables (e.g., "tee-MAH-teem")
3. **Categories** - Use existing categories: noun, verb, adjective, phrase
4. **Lesson assignment** - Group related words in same lesson (8-15 for new content)
5. **Gender** - Only specify for gendered nouns (masculine/feminine), otherwise null

### For Audio Generation
1. **Test with small batch first** - Use `--limit 10` to test quality
2. **Check API costs** - Monitor your Google Cloud billing
3. **Backup audio files** - Commit to git or backup service
4. **Quality check** - Listen to samples, consider professional recording if needed

### For Integration
1. **Always backup** - Script creates automatic backups
2. **Review report** - Check integration-report.json for issues
3. **Test thoroughly** - Verify in app before deploying
4. **Check database** - Run seed script to update DB

---

## 🐛 Troubleshooting

### "Duplicate entry" warnings
- **Normal behavior** - Integration script prevents duplicates
- Check `integration-report.json` to see which entries were skipped
- Review if the skipped entry is truly a duplicate or should be added

### Audio generation fails
- **Check API key** - Verify GOOGLE_APPLICATION_CREDENTIALS is set
- **Check API quota** - Google Cloud has usage limits
- **Check network** - TTS requires internet connection
- **Try --limit 10** - Test with small batch first

### Vocabulary not showing in app
- **Run seed script** - `node server/src/seed.js`
- **Clear browser cache** - Hard refresh (Cmd+Shift+R)
- **Check vocabulary.json** - Verify entries were added
- **Check console** - Look for API errors in browser dev tools

---

## 📝 Example Entry Format

```json
{
  "id": 994,
  "english": "tomato",
  "amharic": "ቲማቲም",
  "romanized": "timatim",
  "pronunciation_guide": "tee-mah-TEEM",
  "category": "noun",
  "gender": null,
  "lesson_id": 8,
  "audio_url": "/audio/vocab/vocab-994.mp3"
}
```

**Field Requirements:**
- `id`: Unique integer (994-1393 for new entries)
- `english`: English translation (can include context)
- `amharic`: Ge'ez script (required for Ethiopian language)
- `romanized`: Latin alphabet pronunciation
- `pronunciation_guide`: Phonetic guide with CAPS for stress
- `category`: noun, verb, adjective, or phrase
- `gender`: "masculine", "feminine", or null
- `lesson_id`: Which lesson (1-43 existing, use 8-15 for new)
- `audio_url`: Path to audio file

---

## 🎓 Learning Impact

Adding 400 new entries will:
- **Expand vocabulary by 41%** (963 → 1,363 entries)
- **Fill critical gaps** - especially biblical/religious content
- **Improve user experience** - more diverse practice material
- **Enable new features** - category-specific quizzes/games
- **Support Ethiopian culture** - authentic religious terminology

---

## 📞 Need Help?

If you encounter issues:
1. Check this README first
2. Review error logs in `data/` folder
3. Check `integration-report.json` for details
4. Verify file formats match examples above

Happy vocabulary expansion! 🚀
