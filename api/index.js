// CRITICAL: Set environment variables BEFORE importing anything
// For Vercel serverless, we use Turso (set via environment variables)
// For local /tmp testing, set DB_PATH
if (!process.env.TURSO_DATABASE_URL && !process.env.DB_PATH) {
  process.env.DB_PATH = '/tmp/amharic.db';
}

import express from 'express';
import cors from 'cors';

// Import database and initialize
import { initDatabase } from '../server/src/db.js';

// Import routes - they will use the database configured in db.js
import usersRouter from '../server/src/routes/users.js';
import lessonsRouter from '../server/src/routes/lessons.js';
import vocabularyRouter from '../server/src/routes/vocabulary.js';
import quizzesRouter from '../server/src/routes/quizzes.js';
import progressRouter from '../server/src/routes/progress.js';
import cultureRouter from '../server/src/routes/culture.js';
import reviewRouter from '../server/src/routes/review.js';
import listeningRouter from '../server/src/routes/listening.js';
import conversationsRouter from '../server/src/routes/conversations.js';
import timedRouter from '../server/src/routes/timed.js';
import gamesRouter from '../server/src/routes/games.js';

const app = express();

app.use(cors());
app.use(express.json());

// Extract user ID from header
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.userId = Number(userId);
  }
  next();
});

// Initialize database on first request
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      console.log('Initializing database for serverless...');
      await initDatabase();

      // If using Turso, we're done (data is already there)
      // If using /tmp, we need to seed from JSON files
      if (!process.env.TURSO_DATABASE_URL) {
        console.log('⚠️  Using ephemeral /tmp database - data will not persist');
        // Note: For /tmp, you'd need to import and run the seed logic here
        // But for production, you should use Turso
      }

      dbInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      return res.status(500).json({
        error: 'Database initialization failed',
        message: error.message
      });
    }
  }
  next();
});

app.get('/health', (req, res) => res.json({
  status: 'ok',
  database: process.env.TURSO_DATABASE_URL ? 'turso' : 'local'
}));

// Mount routes
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
