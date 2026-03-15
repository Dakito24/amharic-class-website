6# Amharic Class Website

A gamified web app to learn to **speak** Amharic (Ethiopian language). Built with SvelteKit + Express + SQLite.

## Quick Start

```bash
npm install
npm run seed    # Seed the database with lesson data
npm run dev     # Start both client and server
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Features

- **28 Lessons** across 5 units (Foundations, Essential Words, Grammar, Verbs, Conversation)
- **142 Vocabulary** entries with romanized pronunciation and Ge'ez script
- **166 Quiz Questions** (multiple choice, fill-in-the-blank, match pairs, word order)
- **Flashcards** with SM-2 spaced repetition
- **Gamification**: XP, levels, daily streaks, 10 unlockable achievements
- **Speaking-focused**: Uses romanized Amharic to teach pronunciation

## Tech Stack

- **Frontend**: SvelteKit 5
- **Backend**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **No auth** - single user, local progress tracking
