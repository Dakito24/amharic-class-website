import { get } from 'svelte/store';
import { activeProfileId } from './stores/profile.js';

const BASE = '/api';

async function request(path, options = {}) {
  const userId = get(activeProfileId);
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': String(userId) } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// User/Profile endpoints
export function getUsers() {
  return request('/users');
}

export function createUser(name, avatar_color) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify({ name, avatar_color })
  });
}

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
