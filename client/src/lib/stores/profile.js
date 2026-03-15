import { writable, derived } from 'svelte/store';

// All profiles
export const profiles = writable([]);

// Currently active profile ID (persisted to localStorage)
function createActiveProfileStore() {
  const stored = typeof window !== 'undefined'
    ? localStorage.getItem('activeProfileId')
    : null;

  const store = writable(stored ? Number(stored) : null);

  store.subscribe(value => {
    if (typeof window !== 'undefined') {
      if (value !== null) {
        localStorage.setItem('activeProfileId', String(value));
      } else {
        localStorage.removeItem('activeProfileId');
      }
    }
  });

  return store;
}

export const activeProfileId = createActiveProfileStore();

// Derived: the full profile object of the active user
export const activeProfile = derived(
  [profiles, activeProfileId],
  ([$profiles, $activeProfileId]) => {
    if (!$activeProfileId || !$profiles.length) return null;
    return $profiles.find(p => p.id === $activeProfileId) || null;
  }
);

// Whether to show the profile selector overlay
export const showProfileSelector = writable(false);
