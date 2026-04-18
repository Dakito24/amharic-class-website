<script>
  import { userProgress } from '../stores/progress.js';
  import { activeProfile, activeProfileId } from '../stores/profile.js';
  import { currentUser, logout } from '../stores/auth.js';
  import { theme, toggleTheme } from '../stores/theme.js';

  let progress = $derived($userProgress);
  let profile = $derived($activeProfile);
  let xpPercent = $derived(progress ? (progress.xp_in_current_level / 100) * 100 : 0);
  let dropdownOpen = $state(false);
  let menuOpen = $state(false);

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  function handleLogout() {
    dropdownOpen = false;
    logout();
  }
</script>

<svelte:window onclick={() => { dropdownOpen = false; }} />

<nav class="navbar">
  <button class="menu-toggle" onclick={toggleMenu} aria-label="Toggle menu">
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
    <span class="hamburger-line"></span>
  </button>

  {#if menuOpen}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="menu-backdrop" onclick={closeMenu}></div>
  {/if}

  <div class="nav-links" class:open={menuOpen}>
    <a href="/" onclick={closeMenu}>Home</a>
    <a href="/lessons" onclick={closeMenu}>Lessons</a>
    <a href="/flashcards" onclick={closeMenu}>Flashcards</a>
    <a href="/quiz" onclick={closeMenu}>Quiz</a>
    <a href="/practice" onclick={closeMenu}>Practice</a>
    <a href="/games" onclick={closeMenu}>Games</a>
  </div>

  <div class="nav-right">
    <button class="theme-toggle" onclick={() => profile && toggleTheme(profile.id)} title="Toggle theme">
      {$theme === 'dark' ? '\u2600' : '\u263D'}
    </button>

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
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="profile-dropdown" onclick={(e) => e.stopPropagation()}>
            <a href="/profile" class="dropdown-item" onclick={() => dropdownOpen = false}>
              <span>My Profile</span>
            </a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout" onclick={handleLogout}>
              Log Out
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
    justify-content: center;
    padding: 0.75rem 1.5rem;
    background: var(--color-bg-elevated);
    border-bottom: 2px solid var(--color-bg-surface);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  /* Hamburger button - hidden on desktop */
  .menu-toggle {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    flex-direction: column;
    gap: 4px;
    z-index: 10;
  }

  .hamburger-line {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--color-text-secondary);
    border-radius: 1px;
    transition: all 0.2s;
  }

  /* Backdrop - hidden on desktop */
  .menu-backdrop {
    display: none;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: var(--color-text-heading);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: absolute;
    right: 1.5rem;
  }

  .theme-toggle {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all 0.2s;
  }

  .theme-toggle:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-orange);
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
    border: 1px solid var(--color-border);
    border-radius: 20px;
    padding: 0.3rem 0.6rem 0.3rem 0.3rem;
    cursor: pointer;
    color: var(--color-text-heading);
    transition: border-color 0.2s;
  }

  .profile-btn:hover {
    border-color: var(--color-accent-primary);
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
    color: var(--color-text-secondary);
  }

  .profile-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0.4rem;
    min-width: 160px;
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
    color: var(--color-text-secondary);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s;
    text-decoration: none;
  }

  .dropdown-item:hover {
    background: var(--color-bg-elevated);
    color: var(--color-text-heading);
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.25rem 0;
  }

  .dropdown-item.logout {
    color: var(--color-accent-red);
    font-size: 0.85rem;
  }

  .dropdown-item.logout:hover {
    color: var(--color-accent-red);
    background: var(--color-bg-elevated);
  }

  /* Existing styles */
  .streak {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--color-accent-orange);
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
    color: var(--color-text-heading);
  }

  .level-badge {
    background: var(--color-accent-primary);
    color: #fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .xp-bar-container {
    width: 80px;
    height: 8px;
    background: var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .xp-text {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  /* ===== Mobile: Hamburger + Drawer ===== */
  @media (max-width: 768px) {
    .navbar {
      justify-content: space-between;
      padding: 0.6rem 1rem;
    }

    .menu-toggle {
      display: flex;
    }

    .nav-links {
      position: fixed;
      top: 0;
      left: -280px;
      width: 280px;
      height: 100vh;
      height: 100dvh;
      background: var(--color-bg-elevated);
      flex-direction: column;
      padding: 4rem 1.5rem 1.5rem;
      gap: 0.25rem;
      z-index: 250;
      transition: left 0.3s ease;
      border-right: 1px solid var(--color-border);
      overflow-y: auto;
    }

    .nav-links.open {
      left: 0;
    }

    .nav-links a {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 1rem;
    }

    .nav-links a:hover {
      background: var(--color-bg-surface);
    }

    .menu-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
    }

    .nav-right {
      position: static;
      gap: 0.6rem;
    }

    .profile-name-nav {
      display: none;
    }

    .xp-bar-container {
      display: none;
    }

    .xp-text {
      display: none;
    }
  }

  /* ===== Small phones ===== */
  @media (max-width: 480px) {
    .navbar {
      padding: 0.5rem 0.75rem;
    }

    .nav-right {
      gap: 0.4rem;
    }

    .streak-count {
      display: none;
    }

    .dropdown-arrow {
      display: none;
    }

    .profile-btn {
      padding: 0.2rem;
      border: none;
    }

    .theme-toggle {
      width: 30px;
      height: 30px;
      font-size: 1rem;
    }

    .level-badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
    }

    .streak-icon {
      font-size: 1rem;
    }
  }
</style>
