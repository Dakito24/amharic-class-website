import { writable } from 'svelte/store';
import { getProgress, updateStreak } from '../api.js';

export const userProgress = writable(null);
export const showLevelUp = writable(false);
export const newAchievements = writable([]);

export async function loadProgress() {
  const data = await getProgress();
  userProgress.set(data);
  return data;
}

export async function checkStreak() {
  const data = await updateStreak();
  if (data.new_achievements?.length > 0) {
    newAchievements.set(data.new_achievements);
  }
  await loadProgress();
  return data;
}

export function triggerLevelUp() {
  showLevelUp.set(true);
  setTimeout(() => showLevelUp.set(false), 3000);
}
