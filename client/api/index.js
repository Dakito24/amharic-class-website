// Vercel serverless function - lives inside client/ so Root Directory = client works
// Imports go UP to the project root then into server/

if (!process.env.TURSO_DATABASE_URL && !process.env.DB_PATH) {
  process.env.DB_PATH = '/tmp/amharic.db';
}

import express from 'express';
import cors from 'cors';

import { initDatabase } from '../../server/src/db.js';
import usersRouter from '../../server/src/routes/users.js';
import lessonsRouter from '../../server/src/routes/lessons.js';
import vocabularyRouter from '../../server/src/routes/vocabulary.js';
import quizzesRouter from '../../server/src/routes/quizzes.js';
import progressRouter from '../../server/src/routes/progress.js';
import cultureRouter from '../../server/src/routes/culture.js';
import reviewRouter from '../../server/src/routes/review.js';
import listeningRouter from '../../server/src/routes/listening.js';
import conversationsRouter from '../../server/src/routes/conversations.js';
import timedRouter from '../../server/src/routes/timed.js';
import gamesRouter from '../../server/src/routes/games.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.userId = Number(userId);
  }
  next();
});

let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
      console.log('Database initialized');
    } catch (error) {
      console.error('Database init error:', error);
      return res.status(500).json({ error: 'Database initialization failed', message: error.message });
    }
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/users', usersRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/culture', cultureRouter);
app.use('/api/review', reviewRouter);
app.use('/api/listening', listeningRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/timed', timedRouter);
app.use('/api/games', gamesRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

export default app;
