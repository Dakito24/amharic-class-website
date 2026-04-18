import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { initDatabase } from './db.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import lessonsRouter from './routes/lessons.js';
import vocabularyRouter from './routes/vocabulary.js';
import quizzesRouter from './routes/quizzes.js';
import progressRouter from './routes/progress.js';
import cultureRouter from './routes/culture.js';
import reviewRouter from './routes/review.js';
import listeningRouter from './routes/listening.js';
import conversationsRouter from './routes/conversations.js';
import timedRouter from './routes/timed.js';
import gamesRouter from './routes/games.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'amharic-class-dev-secret-change-in-prod';

app.use(cors());
app.use(express.json());

initDatabase();

app.get('/health', (req, res) => res.sendStatus(200));

// Public auth routes (no token required)
app.use('/api/auth', authRouter);

// JWT authentication middleware for all other API routes
app.use('/api', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
});

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

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Amharic API server running on http://${HOST}:${PORT}`);
});
