import { get } from 'svelte/store';
import { authToken, logout } from './stores/auth.js';

const BASE = '/api';

async function request(path, options = {}) {
  const token = get(authToken);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// User/Profile endpoints
export function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export function deleteUser(id) {
  return request(`/users/${id}`, {
    method: 'DELETE'
  });
}

// Lesson endpoints
export function getLessons() {
  return request('/lessons');
}

export function getLesson(id) {
  return request(`/lessons/${id}`);
}

export function completeLesson(id) {
  return request(`/lessons/${id}/complete`, { method: 'POST' });
}

// Vocabulary endpoints
export function getVocabulary(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/vocabulary${query ? '?' + query : ''}`);
}

export function searchVocabulary(q) {
  return request(`/vocabulary/search?q=${encodeURIComponent(q)}`);
}

// Quiz endpoints
export function getQuiz(lessonId) {
  return request(`/quizzes/${lessonId}`);
}

export function submitQuiz(lessonId, answers) {
  return request('/quizzes/submit', {
    method: 'POST',
    body: JSON.stringify({ lesson_id: lessonId, answers })
  });
}

// Progress endpoints
export function getDueFlashcards() {
  return request('/progress/flashcards/due');
}

export function reviewFlashcard(vocabId, quality) {
  return request('/progress/flashcards/review', {
    method: 'POST',
    body: JSON.stringify({ vocab_id: vocabId, quality })
  });
}

export function getProgress() {
  return request('/progress');
}

export function updateStreak() {
  return request('/progress/streak', { method: 'POST' });
}

// Culture endpoints
export function getCultureArticles() {
  return request('/culture');
}

export function getCultureArticle(id) {
  return request(`/culture/${id}`);
}

// Review endpoints
export function getWeakWords(lessonId) {
  const query = lessonId ? `?lesson_id=${lessonId}` : '';
  return request(`/review/weak-words${query}`);
}

export function getVocabMastery(lessonId) {
  const query = lessonId ? `?lesson_id=${lessonId}` : '';
  return request(`/review/vocab-mastery${query}`);
}

export function getReviewQuiz() {
  return request('/review/quiz');
}

export function submitReviewQuiz(answers) {
  return request('/review/submit', {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
}

// Listening endpoints
export function getListeningQuiz(lessonId) {
  const query = lessonId ? `?lesson_id=${lessonId}` : '';
  return request(`/listening/quiz${query}`);
}

export function submitListeningQuiz(answers) {
  return request('/listening/submit', {
    method: 'POST',
    body: JSON.stringify({ answers })
  });
}

// Conversation endpoints
export function getConversations() {
  return request('/conversations');
}

export function getConversation(id) {
  return request(`/conversations/${id}`);
}

export function completeConversation(id) {
  return request(`/conversations/${id}/complete`, { method: 'POST' });
}

// Timed challenge endpoints
export function startTimedChallenge(difficulty) {
  return request(`/timed/start?difficulty=${difficulty}`);
}

export function submitTimedChallenge(difficulty, answers, timeRemainingMs) {
  return request('/timed/submit', {
    method: 'POST',
    body: JSON.stringify({ difficulty, answers, time_remaining_ms: timeRemainingMs })
  });
}

export function getTimedLeaderboard(difficulty) {
  return request(`/timed/leaderboard?difficulty=${difficulty}`);
}

// Daily Challenge endpoints
export function getDailyChallenge() {
  return request('/games/daily-challenge');
}

export function completeDailyChallenge(score, timeTakenMs) {
  return request('/games/daily-challenge/complete', {
    method: 'POST',
    body: JSON.stringify({ score, time_taken_ms: timeTakenMs })
  });
}

// Game endpoints
export function submitGameScore(gameType, score, timeTakenMs, metadata = {}) {
  return request('/games/score', {
    method: 'POST',
    body: JSON.stringify({ game_type: gameType, score, time_taken_ms: timeTakenMs, metadata })
  });
}

export function getGameHighScores(gameType) {
  return request(`/games/high-scores/${gameType}`);
}

// Picture Match endpoints
export function getPictureMatchCategories() {
  return request('/games/picture-match/categories');
}

export function getPictureMatchData(category) {
  return request(`/games/picture-match/data?category=${category}`);
}

// Story Adventure endpoints
export function getStoryChapters() {
  return request('/games/story-adventure/chapters');
}

export function getStoryChapter(id) {
  return request(`/games/story-adventure/${id}`);
}

export function completeStoryChapter(id, choices) {
  return request(`/games/story-adventure/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ choices })
  });
}
