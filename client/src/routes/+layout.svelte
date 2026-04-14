<script>
  import NavBar from '$lib/components/NavBar.svelte';
  import LevelUpModal from '$lib/components/LevelUpModal.svelte';
  import AchievementToast from '$lib/components/AchievementToast.svelte';
  import ProfileSelector from '$lib/components/ProfileSelector.svelte';
  import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
  import { loadProgress, checkStreak } from '$lib/stores/progress.js';
  import { profiles, activeProfileId, activeProfile, showProfileSelector } from '$lib/stores/profile.js';
  import { loadTheme } from '$lib/stores/theme.js';
  import { getUsers } from '$lib/api.js';
  import { onMount } from 'svelte';

  let { children } = $props();
  let initialized = $state(false);

  let needsProfileSelection = $derived(
    initialized && (!$activeProfileId || !$activeProfile)
  );
  let selectorVisible = $derived(needsProfileSelection || $showProfileSelector);

  onMount(async () => {
    const allUsers = await getUsers();
    profiles.set(allUsers);

    const storedId = $activeProfileId;
    const profileExists = allUsers.some(u => u.id === storedId);

    if (storedId && profileExists) {
      loadTheme(storedId);
      await loadProgress();
      await checkStreak();
    } else {
      activeProfileId.set(null);
    }

    initialized = true;
  });
</script>

<div class="app">
  {#if !initialized}
    <div class="loading-screen">
      <p>Loading...</p>
    </div>
  {:else if selectorVisible}
    <ProfileSelector />
  {:else}
    <NavBar />
    <main>
      {@render children()}
    </main>
    <LevelUpModal />
    <AchievementToast />
    <KeyboardShortcuts />
  {/if}
</div>

<style>
  :global(:root) {
    --color-bg-body: #0f0f23;
    --color-bg-surface: #16213e;
    --color-bg-elevated: #1a1a2e;
    --color-border: #2a2a4a;
    --color-border-hover: #3a3a5a;
    --color-text-primary: #e0e0e0;
    --color-text-heading: #fff;
    --color-text-secondary: #a8a8b3;
    --color-text-muted: #666;
    --color-accent-primary: #e94560;
    --color-accent-primary-hover: #d63851;
    --color-accent-orange: #f5a623;
    --color-accent-green: #4caf50;
    --color-accent-blue: #2196f3;
    --color-accent-red: #f44336;
  }

  :global([data-theme="light"]) {
    --color-bg-body: #f5f5f8;
    --color-bg-surface: #ffffff;
    --color-bg-elevated: #eef0f4;
    --color-border: #d0d0d8;
    --color-border-hover: #b8b8c4;
    --color-text-primary: #2c2c3a;
    --color-text-heading: #1a1a2e;
    --color-text-secondary: #666680;
    --color-text-muted: #999;
    --color-accent-primary: #d63851;
    --color-accent-primary-hover: #c02d44;
    --color-accent-orange: #e09520;
    --color-accent-green: #3d9140;
    --color-accent-blue: #1a7fd4;
    --color-accent-red: #d43a2f;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--color-bg-body);
    color: var(--color-text-primary);
    min-height: 100vh;
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .loading-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  @media (max-width: 480px) {
    main {
      padding: 1rem 0.75rem;
    }
  }
</style>
