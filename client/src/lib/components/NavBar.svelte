<script>
  import { userProgress } from '../stores/progress.js';
  import { activeProfile, profiles, activeProfileId, showProfileSelector } from '../stores/profile.js';
  import { loadProgress, checkStreak } from '../stores/progress.js';

  let progress = $derived($userProgress);
  let profile = $derived($activeProfile);
  let allProfiles = $derived($profiles);
  let xpPercent = $derived(progress ? (progress.xp_in_current_level / 100) * 100 : 0);
  let dropdownOpen = $state(false);

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  async function switchProfile(id) {
    activeProfileId.set(id);
    dropdownOpen = false;
    await loadProgress();
    await checkStreak();
  }

  function openProfileManager() {
    dropdownOpen = false;
    showProfileSelector.set(true);
  }
</script>

<svelte:window onclick={() => dropdownOpen = false} />

<nav class="navbar">
  <a href="/" class="logo">
    <span class="logo-text">Amharic</span>
    <span class="logo-sub">speak it</span>
  </a>

  <div class="nav-links">
    <a href="/lessons">Lessons</a>
    <a href="/flashcards">Flashcards</a>
    <a href="/quiz">Quiz</a>
    <a href="/practice">Practice</a>
  </div>

  <div class="nav-right">
    {#if profile}
      <div class="profile-switcher">
        <button class="profile-btn" onclick={(e) => { e.stopPropagation(); toggleDropdown(); }}>
          <div class="profile-mini-avatar" style="background: {profile.avatar_color}">
            {profile.name[0].toUpperCase()}
          </div>
          <span class="profile-name-nav">{profile.name}</span>
          <span class="dropdown-arrow">{dropdownOpen ? '\u25B2' : '\u25BC'}</span>
        </button>

        {#if dropdownOpen}
          <div class="profile-dropdown" onclick={(e) => e.stopPropagation()}>
            {#each allProfiles as p}
              <button
                class="dropdown-item"
                class:active={p.id === profile.id}
                onclick={() => switchProfile(p.id)}
              >
                <div class="dropdown-avatar" style="background: {p.avatar_color}">
                  {p.name[0].toUpperCase()}
                </div>
                <span>{p.name}</span>
                {#if p.id === profile.id}
                  <span class="check-mark">&#10003;</span>
                {/if}
              </button>
            {/each}
            <div class="dropdown-divider"></div>
            <button class="dropdown-item manage" onclick={openProfileManager}>
              Manage Profiles
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if progress}
      <div class="streak" title="Daily streak">
        <span class="streak-icon">*</span>
        <span class="streak-count">{progress.current_streak}</span>
      </div>
      <a href="/profile" class="xp-display">
        <div class="level-badge">Lv {progress.level}</div>
        <div class="xp-bar-container">
          <div class="xp-bar-fill" style="width: {xpPercent}%"></div>
        </div>
        <span class="xp-text">{progress.total_xp} XP</span>
      </a>
    {/if}
  </div>
</nav>

<style>
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    border-bottom: 2px solid #16213e;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .logo {
    text-decoration: none;
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .logo-text {
    font-size: 1.3rem;
    font-weight: 700;
    color: #e94560;
  }

  .logo-sub {
    font-size: 0.65rem;
    color: #a8a8b3;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    color: #a8a8b3;
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: #fff;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  /* Profile switcher */
  .profile-switcher {
    position: relative;
  }

  .profile-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: 1px solid #2a2a4a;
    border-radius: 20px;
    padding: 0.3rem 0.6rem 0.3rem 0.3rem;
    cursor: pointer;
    color: #fff;
    transition: border-color 0.2s;
  }

  .profile-btn:hover {
    border-color: #e94560;
  }

  .profile-mini-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }

  .profile-name-nav {
    font-size: 0.8rem;
    font-weight: 500;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    font-size: 0.5rem;
    color: #a8a8b3;
  }

  .profile-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 10px;
    padding: 0.4rem;
    min-width: 180px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 200;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.6rem;
    background: none;
    border: none;
    color: #a8a8b3;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s;
  }

  .dropdown-item:hover {
    background: #1a1a2e;
    color: #fff;
  }

  .dropdown-item.active {
    color: #e94560;
    font-weight: 600;
  }

  .check-mark {
    margin-left: auto;
    font-size: 0.8rem;
  }

  .dropdown-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .dropdown-divider {
    height: 1px;
    background: #2a2a4a;
    margin: 0.25rem 0;
  }

  .dropdown-item.manage {
    color: #a8a8b3;
    font-size: 0.8rem;
  }

  .dropdown-item.manage:hover {
    color: #e94560;
  }

  /* Existing styles */
  .streak {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: #f5a623;
    font-weight: 700;
  }

  .streak-icon {
    font-size: 1.2rem;
  }

  .xp-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #fff;
  }

  .level-badge {
    background: #e94560;
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .xp-bar-container {
    width: 80px;
    height: 8px;
    background: #2a2a4a;
    border-radius: 4px;
    overflow: hidden;
  }

  .xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #e94560, #f5a623);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .xp-text {
    font-size: 0.8rem;
    color: #a8a8b3;
  }

  @media (max-width: 768px) {
    .nav-links {
      gap: 0.75rem;
      font-size: 0.85rem;
    }
    .xp-bar-container {
      display: none;
    }
    .profile-name-nav {
      display: none;
    }
  }
</style>
