<script>
  import { login, signup } from '../stores/auth.js';
  import { loadProgress, checkStreak } from '../stores/progress.js';
  import { loadTheme } from '../stores/theme.js';

  let mode = $state('login');
  let username = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let displayName = $state('');
  let selectedColor = $state('#e94560');
  let error = $state('');
  let loading = $state(false);

  const AVATAR_COLORS = [
    '#e94560', '#f5a623', '#4caf50', '#2196f3',
    '#9c27b0', '#ff5722', '#00bcd4', '#8bc34a'
  ];

  async function handleLogin() {
    if (!username.trim() || !password) return;
    error = '';
    loading = true;
    try {
      const user = await login(username, password);
      loadTheme(user.id);
      await loadProgress();
      await checkStreak();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function handleSignup() {
    if (!username.trim() || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }
    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }
    error = '';
    loading = true;
    try {
      const user = await signup(
        username,
        password,
        confirmPassword,
        displayName || username,
        selectedColor
      );
      loadTheme(user.id);
      await loadProgress();
      await checkStreak();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function switchMode(newMode) {
    mode = newMode;
    error = '';
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      if (mode === 'login') handleLogin();
      else handleSignup();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="auth-overlay">
  <div class="auth-container">
    <h1>Lememari</h1>
    <p class="subtitle">A fun way to learn to speak Amharic</p>

    <div class="auth-card">
      {#if mode === 'login'}
        <h2>Log In</h2>

        <div class="form-group">
          <label for="login-username">Username</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="login-username"
            type="text"
            bind:value={username}
            placeholder="Enter your username"
            autofocus
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            bind:value={password}
            placeholder="Enter your password"
            autocomplete="current-password"
          />
        </div>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}

        <button
          class="btn btn-primary"
          onclick={handleLogin}
          disabled={loading || !username.trim() || !password}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p class="switch-text">
          Don't have an account?
          <button class="link-btn" onclick={() => switchMode('signup')}>Sign up</button>
        </p>

      {:else}
        <h2>Create Account</h2>

        <div class="form-group">
          <label for="signup-username">Username</label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="signup-username"
            type="text"
            bind:value={username}
            placeholder="Choose a username"
            autofocus
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="signup-name">Display Name <span class="optional">(optional)</span></label>
          <input
            id="signup-name"
            type="text"
            bind:value={displayName}
            placeholder="How should we call you?"
            maxlength="20"
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label for="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            bind:value={password}
            placeholder="At least 6 characters"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="signup-confirm">Confirm Password</label>
          <input
            id="signup-confirm"
            type="password"
            bind:value={confirmPassword}
            placeholder="Re-enter your password"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label>Avatar Color</label>
          <div class="color-options">
            {#each AVATAR_COLORS as color}
              <button
                class="color-swatch"
                class:selected={selectedColor === color}
                style="background: {color}"
                onclick={() => selectedColor = color}
                aria-label="Select color {color}"
              ></button>
            {/each}
          </div>
        </div>

        {#if error}
          <p class="error-msg">{error}</p>
        {/if}

        <button
          class="btn btn-primary"
          onclick={handleSignup}
          disabled={loading || !username.trim() || !password || !confirmPassword}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p class="switch-text">
          Already have an account?
          <button class="link-btn" onclick={() => switchMode('login')}>Log in</button>
        </p>
      {/if}
    </div>
  </div>
</div>

<style>
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-bg-body);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    overflow-y: auto;
    padding: 1rem;
  }

  .auth-container {
    text-align: center;
    width: 100%;
    max-width: 400px;
  }

  h1 {
    font-size: 2.5rem;
    color: var(--color-text-heading);
    margin-bottom: 0.25rem;
    font-weight: 700;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .auth-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 2rem 1.5rem;
    text-align: left;
  }

  .auth-card h2 {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    margin-bottom: 1.25rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.35rem;
  }

  .optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .form-group input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text-heading);
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .form-group input:focus {
    border-color: var(--color-accent-primary);
  }

  .form-group input::placeholder {
    color: var(--color-text-muted);
  }

  .color-options {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .color-swatch:hover {
    transform: scale(1.15);
  }

  .color-swatch.selected {
    border-color: #fff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
  }

  .error-msg {
    color: var(--color-accent-red);
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .btn {
    width: 100%;
    padding: 0.7rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
  }

  .switch-text {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-top: 1.25rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--color-accent-primary);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: underline;
    padding: 0;
  }

  .link-btn:hover {
    color: var(--color-accent-primary-hover);
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.8rem;
    }

    .auth-card {
      padding: 1.5rem 1rem;
    }

    .color-swatch {
      width: 28px;
      height: 28px;
    }
  }
</style>
