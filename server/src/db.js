import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'amharic.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Check if we need to migrate from old single-user schema
  const hasUsersTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get();

  if (!hasUsersTable) {
    // Check for existing old-schema data to migrate
    const hasOldProgress = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='user_progress'"
    ).get();

    let oldProgress = null;
    let oldFlashcards = [];

    if (hasOldProgress) {
      try {
        oldProgress = db.prepare('SELECT * FROM user_progress WHERE id = 1').get();
        oldFlashcards = db.prepare('SELECT * FROM flashcard_reviews').all();
      } catch {
        // Tables exist but may have different schema, ignore
      }
      db.exec('DROP TABLE IF EXISTS flashcard_reviews');
      db.exec('DROP TABLE IF EXISTS user_progress');
    }

    // Create new schema with users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        avatar_color TEXT DEFAULT '#e94560',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        total_xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_activity_date TEXT,
        lessons_completed TEXT DEFAULT '[]',
        vocab_mastered TEXT DEFAULT '[]',
        achievements TEXT DEFAULT '[]',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS flashcard_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        vocab_id INTEGER NOT NULL,
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review TEXT,
        last_review TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (vocab_id) REFERENCES vocabulary(id),
        UNIQUE(user_id, vocab_id)
      );
    `);

    // Migrate old data if it existed
    if (oldProgress) {
      db.prepare("INSERT INTO users (name, avatar_color) VALUES (?, ?)").run('Learner', '#e94560');
      db.prepare(`
        INSERT INTO user_progress (user_id, total_xp, level, current_streak, longest_streak, last_activity_date, lessons_completed, vocab_mastered, achievements)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        oldProgress.total_xp, oldProgress.level,
        oldProgress.current_streak, oldProgress.longest_streak,
        oldProgress.last_activity_date, oldProgress.lessons_completed,
        oldProgress.vocab_mastered, oldProgress.achievements
      );

      for (const fr of oldFlashcards) {
        db.prepare(`
          INSERT INTO flashcard_reviews (user_id, vocab_id, ease_factor, interval, repetitions, next_review, last_review)
          VALUES (1, ?, ?, ?, ?, ?, ?)
        `).run(fr.vocab_id, fr.ease_factor, fr.interval, fr.repetitions, fr.next_review, fr.last_review);
      }

      console.log('Migrated existing single-user data to new multi-user schema');
    }
  }

  // Ensure static content tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      order_num INTEGER NOT NULL,
      unit INTEGER NOT NULL,
      unit_title TEXT NOT NULL,
      category TEXT NOT NULL,
      xp_reward INTEGER DEFAULT 20,
      content TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      english TEXT NOT NULL,
      amharic TEXT NOT NULL,
      romanized TEXT NOT NULL,
      pronunciation_guide TEXT,
      category TEXT NOT NULL,
      gender TEXT,
      lesson_id INTEGER,
      audio_url TEXT,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id INTEGER,
      question_type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      xp_reward INTEGER DEFAULT 5,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#e94560',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date TEXT,
      lessons_completed TEXT DEFAULT '[]',
      vocab_mastered TEXT DEFAULT '[]',
      achievements TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vocab_id INTEGER NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 1,
      repetitions INTEGER DEFAULT 0,
      next_review TEXT,
      last_review TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vocab_id) REFERENCES vocabulary(id),
      UNIQUE(user_id, vocab_id)
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      lesson_id INTEGER,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'standard',
      time_taken_ms INTEGER,
      attempted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES quiz_questions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_quiz_attempts_question ON quiz_attempts(user_id, question_id);

    CREATE TABLE IF NOT EXISTS high_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      score INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      time_remaining_ms INTEGER,
      played_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      time_taken_ms INTEGER,
      metadata TEXT,
      played_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      challenge_date TEXT NOT NULL,
      challenge_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      time_taken_ms INTEGER,
      completed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, challenge_date)
    );

    CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id, game_type);
    CREATE INDEX IF NOT EXISTS idx_daily_challenges_user ON daily_challenges(user_id, challenge_date);
  `);
}

export default db;
