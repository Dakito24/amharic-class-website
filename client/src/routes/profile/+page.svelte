<script>
  import { userProgress } from '$lib/stores/progress.js';
  import { activeProfile, activeProfileId, profiles } from '$lib/stores/profile.js';
  import { logout, changePassword } from '$lib/stores/auth.js';
  import { updateUser, deleteUser } from '$lib/api.js';

  let progress = $derived($userProgress);
  let profile = $derived($activeProfile);
  let xpPercent = $derived(progress ? (progress.xp_in_current_level / 100) * 100 : 0);
  let lessonPercent = $derived(progress ? (progress.lessons_completed / progress.total_lessons) * 100 : 0);

  let editingName = $state(false);
  let editNameValue = $state('');
  let showDeleteConfirm = $state(false);

  // Change password state
  let showChangePassword = $state(false);
  let currentPw = $state('');
  let newPw = $state('');
  let confirmNewPw = $state('');
  let pwError = $state('');
  let pwSuccess = $state('');
  let pwLoading = $state(false);

  async function handleChangePassword() {
    pwError = '';
    pwSuccess = '';
    if (!currentPw || !newPw || !confirmNewPw) {
      pwError = 'All fields are required';
      return;
    }
    if (newPw.length < 6) {
      pwError = 'New password must be at least 6 characters';
      return;
    }
    if (newPw !== confirmNewPw) {
      pwError = 'New passwords do not match';
      return;
    }
    pwLoading = true;
    try {
      await changePassword(currentPw, newPw, confirmNewPw);
      pwSuccess = 'Password changed successfully';
      currentPw = '';
      newPw = '';
      confirmNewPw = '';
    } catch (err) {
      pwError = err.message;
    } finally {
      pwLoading = false;
    }
  }

  function cancelChangePassword() {
    showChangePassword = false;
    currentPw = '';
    newPw = '';
    confirmNewPw = '';
    pwError = '';
    pwSuccess = '';
  }

  function startEditName() {
    editNameValue = profile?.name || '';
    editingName = true;
  }

  async function saveName() {
    if (!editNameValue.trim() || !profile) return;
    const updated = await updateUser(profile.id, { name: editNameValue.trim() });
    profiles.set([updated]);
    editingName = false;
  }

  async function confirmDelete() {
    if (!profile) return;
    await deleteUser(profile.id);
    showDeleteConfirm = false;
    logout();
  }

  function handleEditKeydown(e) {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') editingName = false;
  }
</script>

<div class="profile-page">
  <h1>Your Progress</h1>

  {#if progress}
    <!-- Account Settings -->
    <div class="account-card">
      <h2 class="account-title">Account</h2>

      <!-- Display Name -->
      <div class="account-field">
        <div class="field-left">
          <span class="field-icon">&#9998;</span>
          <div class="field-info">
            <span class="field-label">Display Name</span>
            {#if !editingName}
              <span class="field-value">{profile?.name}</span>
            {/if}
          </div>
        </div>
        {#if editingName}
          <div class="field-edit-area">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              type="text"
              class="field-input"
              bind:value={editNameValue}
              onkeydown={handleEditKeydown}
              autofocus
              maxlength="20"
              placeholder="Enter display name"
            />
            <div class="field-edit-actions">
              <button class="action-pill save" onclick={saveName}>Save</button>
              <button class="action-pill cancel" onclick={() => editingName = false}>Cancel</button>
            </div>
          </div>
        {:else}
          <button class="action-pill" onclick={startEditName}>Edit</button>
        {/if}
      </div>

      <!-- Password -->
      <div class="account-field">
        <div class="field-left">
          <span class="field-icon">&#128274;</span>
          <div class="field-info">
            <span class="field-label">Password</span>
            {#if !showChangePassword}
              <span class="field-value masked">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span>
            {/if}
          </div>
        </div>
        {#if showChangePassword}
          <div class="field-edit-area">
            <input
              type="password"
              class="field-input"
              bind:value={currentPw}
              placeholder="Current password"
              autocomplete="current-password"
            />
            <input
              type="password"
              class="field-input"
              bind:value={newPw}
              placeholder="New password (min 6 chars)"
              autocomplete="new-password"
            />
            <input
              type="password"
              class="field-input"
              bind:value={confirmNewPw}
              placeholder="Confirm new password"
              autocomplete="new-password"
            />
            {#if pwError}
              <p class="pw-msg error">{pwError}</p>
            {/if}
            {#if pwSuccess}
              <p class="pw-msg success">{pwSuccess}</p>
            {/if}
            <div class="field-edit-actions">
              <button
                class="action-pill save"
                onclick={handleChangePassword}
                disabled={pwLoading || !currentPw || !newPw || !confirmNewPw}
              >
                {pwLoading ? 'Saving...' : 'Update'}
              </button>
              <button class="action-pill cancel" onclick={cancelChangePassword}>Cancel</button>
            </div>
          </div>
        {:else}
          <button class="action-pill" onclick={() => showChangePassword = true}>Change</button>
        {/if}
      </div>

      <!-- Avatar -->
      {#if profile}
        <div class="account-field no-border">
          <div class="field-left">
            <span class="field-icon">&#127912;</span>
            <div class="field-info">
              <span class="field-label">Avatar</span>
            </div>
          </div>
          <div class="settings-avatar" style="background: {profile.avatar_color}">
            {profile.name[0].toUpperCase()}
          </div>
        </div>
      {/if}
    </div>

    <div class="level-section">
      <div class="level-circle">
        <div class="level-num">{progress.level}</div>
        <div class="level-label">{progress.level_title}</div>
      </div>
      <div class="level-details">
        <div class="xp-total">{progress.total_xp} Total XP</div>
        <div class="xp-bar-big">
          <div class="xp-bar-fill" style="width: {xpPercent}%"></div>
        </div>
        <div class="xp-progress">{progress.xp_in_current_level}/100 XP to Level {progress.level + 1}</div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-num streak">{progress.current_streak}</div>
        <div class="stat-text">Day Streak</div>
        <div class="stat-sub">Best: {progress.longest_streak}</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">{progress.lessons_completed}</div>
        <div class="stat-text">Lessons Done</div>
        <div class="mini-bar">
          <div class="mini-fill" style="width: {lessonPercent}%"></div>
        </div>
        <div class="stat-sub">{progress.total_lessons} total</div>
      </div>
      <div class="stat-box">
        <div class="stat-num">{progress.vocab_mastered}</div>
        <div class="stat-text">Words Mastered</div>
        <div class="stat-sub">{progress.total_vocab} total</div>
      </div>
    </div>

    <section class="achievements-section">
      <h2>Achievements</h2>
      <div class="achievements-grid">
        {#each progress.achievements as achievement}
          <div class="achievement" class:locked={!achievement.unlocked}>
            <div class="achievement-icon">
              {#if achievement.unlocked}
                &#9733;
              {:else}
                ?
              {/if}
            </div>
            <div class="achievement-info">
              <h3>{achievement.title}</h3>
              <p>{achievement.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="actions-section">
      <a href="/lessons" class="action-link">Continue Learning &rarr;</a>
      <a href="/flashcards" class="action-link">Review Flashcards &rarr;</a>
      <a href="/quiz" class="action-link">Take a Quiz &rarr;</a>
    </section>

    <!-- Danger Zone -->
    <section class="danger-zone">
      <h2>Danger Zone</h2>
      <p>Deleting your profile will permanently remove all your progress, flashcard history, and achievements.</p>
      <button class="btn btn-danger" onclick={() => showDeleteConfirm = true}>
        Delete Profile
      </button>
    </section>

    <!-- Delete Confirmation Modal -->
    {#if showDeleteConfirm}
      <div class="confirm-backdrop" onclick={() => showDeleteConfirm = false}>
        <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="dialog">
          <h3>Delete Profile?</h3>
          <p>This will permanently delete all progress for "<strong>{profile?.name}</strong>". This action cannot be undone.</p>
          <div class="confirm-actions">
            <button class="btn btn-danger" onclick={confirmDelete}>Delete</button>
            <button class="btn btn-secondary" onclick={() => showDeleteConfirm = false}>Cancel</button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <div class="loading">Loading progress...</div>
  {/if}
</div>

<style>
  .profile-page {
    max-width: 700px;
    margin: 0 auto;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
  }

  /* Account Card */
  .account-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 0.25rem 0;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }

  .account-title {
    color: var(--color-text-heading);
    font-size: 0.9rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1rem 1.25rem 0.5rem;
    margin: 0;
  }

  .account-field {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.15s;
  }

  .account-field:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .account-field.no-border {
    border-bottom: none;
  }

  .field-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .field-icon {
    font-size: 1.1rem;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .field-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .field-label {
    color: var(--color-text-primary);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .field-value {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .field-value.masked {
    letter-spacing: 2px;
    color: var(--color-text-muted);
  }

  .action-pill {
    padding: 0.35rem 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 20px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
    align-self: center;
  }

  .action-pill:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
  }

  .action-pill.save {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #fff;
  }

  .action-pill.save:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
    border-color: var(--color-accent-primary-hover);
  }

  .action-pill.cancel {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-text-secondary);
  }

  .action-pill:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .field-edit-area {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    max-width: 300px;
  }

  .field-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text-heading);
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .field-input:focus {
    border-color: var(--color-accent-primary);
  }

  .field-input::placeholder {
    color: var(--color-text-muted);
  }

  .field-edit-actions {
    display: flex;
    gap: 0.4rem;
  }

  .pw-msg {
    font-size: 0.8rem;
    margin: 0;
  }

  .pw-msg.error {
    color: var(--color-accent-red);
  }

  .pw-msg.success {
    color: var(--color-accent-green);
  }

  .settings-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    align-self: center;
  }

  /* Level section */
  .level-section {
    display: flex;
    align-items: center;
    gap: 2rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1.5rem;
  }

  .level-circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-orange));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .level-num {
    font-size: 2rem;
    font-weight: 800;
    color: #fff;
    line-height: 1;
  }

  .level-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .level-details {
    flex: 1;
  }

  .xp-total {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin-bottom: 0.75rem;
  }

  .xp-bar-big {
    height: 12px;
    background: var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    border-radius: 6px;
    transition: width 0.5s;
  }

  .xp-progress {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-box {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
  }

  .stat-num {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
  }

  .stat-num.streak {
    color: var(--color-accent-orange);
  }

  .stat-text {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin-top: 0.15rem;
  }

  .stat-sub {
    color: var(--color-text-muted);
    font-size: 0.75rem;
    margin-top: 0.15rem;
  }

  .mini-bar {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    margin-top: 0.5rem;
    overflow: hidden;
  }

  .mini-fill {
    height: 100%;
    background: var(--color-accent-green);
    border-radius: 2px;
  }

  .achievements-section {
    margin-bottom: 2rem;
  }

  .achievements-section h2 {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  .achievements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .achievement {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .achievement.locked {
    opacity: 0.45;
  }

  .achievement:not(.locked) {
    border-color: var(--color-accent-orange);
  }

  .achievement-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .achievement:not(.locked) .achievement-icon {
    background: linear-gradient(135deg, var(--color-accent-orange), var(--color-accent-primary));
    color: #fff;
  }

  .achievement.locked .achievement-icon {
    background: var(--color-border);
    color: var(--color-text-muted);
  }

  .achievement-info h3 {
    color: var(--color-text-heading);
    font-size: 0.95rem;
    margin: 0;
  }

  .achievement-info p {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    margin: 0.1rem 0 0;
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .action-link {
    display: block;
    padding: 1rem 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-accent-primary);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
  }

  .action-link:hover {
    border-color: var(--color-accent-primary);
    background: rgba(233, 69, 96, 0.05);
  }

  /* Danger Zone */
  .danger-zone {
    border: 1px solid #4a1a1a;
    border-radius: 12px;
    padding: 1.25rem;
    margin-top: 1rem;
  }

  .danger-zone h2 {
    color: var(--color-accent-primary);
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .danger-zone p {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .btn {
    padding: 0.6rem 1.25rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-danger {
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-danger:hover {
    background: #c0392b;
  }

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-border-hover);
  }

  /* Delete confirmation modal */
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .confirm-modal {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 380px;
    width: 90%;
    text-align: center;
  }

  .confirm-modal h3 {
    color: var(--color-text-heading);
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
  }

  .confirm-modal p {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  @media (max-width: 600px) {
    .level-section {
      flex-direction: column;
      text-align: center;
    }
    .stats-row {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.4rem;
      margin-bottom: 1rem;
    }

    .account-field {
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-edit-area {
      max-width: 100%;
      width: 100%;
    }

    .action-pill {
      align-self: flex-start;
    }

    .level-section {
      padding: 1.25rem;
      gap: 1rem;
    }

    .level-circle {
      width: 80px;
      height: 80px;
    }

    .level-num {
      font-size: 1.5rem;
    }

    .xp-total {
      font-size: 1.1rem;
    }

    .stat-box {
      padding: 0.85rem;
    }

    .stat-num {
      font-size: 1.5rem;
    }

    .achievements-grid {
      grid-template-columns: 1fr;
    }

    .achievement {
      padding: 0.75rem;
    }

    .achievement-icon {
      width: 36px;
      height: 36px;
      font-size: 1.1rem;
    }
  }
</style>
