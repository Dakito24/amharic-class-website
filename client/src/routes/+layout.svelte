<script>
  import NavBar from '$lib/components/NavBar.svelte';
  import LevelUpModal from '$lib/components/LevelUpModal.svelte';
  import AchievementToast from '$lib/components/AchievementToast.svelte';
  import ProfileSelector from '$lib/components/ProfileSelector.svelte';
  import { loadProgress, checkStreak } from '$lib/stores/progress.js';
  import { profiles, activeProfileId, activeProfile, showProfileSelector } from '$lib/stores/profile.js';
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
  {/if}
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f0f23;
    color: #e0e0e0;
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
    color: #a8a8b3;
    font-size: 1.1rem;
  }
</style>
