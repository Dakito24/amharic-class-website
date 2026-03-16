import express from 'express';
import cors from 'cors';
import { initDatabase } from './db.js';
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

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Extract user ID from header for all requests
app.use((req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.userId = Number(userId);
  }
  next();
});

initDatabase();

app.get('/health', (req, res) => res.sendStatus(200));

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

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Amharic API server running on http://${HOST}:${PORT}`);
});
