import db, { initDatabase } from './db.js';

console.log('Initializing database...');
initDatabase();

console.log('Wiping ALL data (including user progress)...');
db.exec(`
  DELETE FROM flashcard_reviews;
  DELETE FROM user_progress;
  DELETE FROM users;
  DELETE FROM quiz_questions;
  DELETE FROM vocabulary;
  DELETE FROM lessons;
`);
console.log('All tables cleared.');

// Re-seed with fresh data
console.log('Re-seeding...');
const { execSync } = await import('child_process');
execSync('node src/seed.js', { cwd: process.cwd(), stdio: 'inherit' });
