import { writable } from 'svelte/store';

export const theme = writable('dark');

export function loadTheme(userId) {
  const stored = localStorage.getItem(`theme_${userId}`);
  const value = stored === 'light' ? 'light' : 'dark';
  theme.set(value);
  applyTheme(value);
}

export function toggleTheme(userId) {
  theme.update(current => {
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(`theme_${userId}`, next);
    applyTheme(next);
    return next;
  });
}

function applyTheme(value) {
  document.documentElement.setAttribute('data-theme', value);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', value === 'light' ? '#f5f5f8' : '#0f0f23');
  }
}
