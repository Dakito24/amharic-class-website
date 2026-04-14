<script>
  import { onMount } from 'svelte';
  import { profiles, activeProfileId, showProfileSelector } from '../stores/profile.js';
  import { getUsers, createUser, deleteUser, updateUser } from '../api.js';
  import { loadProgress, checkStreak } from '../stores/progress.js';

  let allProfiles = $state([]);
  let loading = $state(true);
  let showAddForm = $state(false);
  let newName = $state('');
  let selectedColor = $state('#e94560');
  let editingId = $state(null);
  let editName = $state('');
  let deletingId = $state(null);
  let deletingName = $state('');

  const AVATAR_COLORS = [
    '#e94560', '#f5a623', '#4caf50', '#2196f3',
    '#9c27b0', '#ff5722', '#00bcd4', '#8bc34a'
  ];

  onMount(async () => {
    await refreshProfiles();
    loading = false;
  });

  async function refreshProfiles() {
    allProfiles = await getUsers();
    profiles.set(allProfiles);
  }

  async function selectProfile(id) {
    activeProfileId.set(id);
    showProfileSelector.set(false);
    await loadProgress();
    await checkStreak();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const user = await createUser(newName.trim(), selectedColor);
    newName = '';
    selectedColor = '#e94560';
    showAddForm = false;
    await refreshProfiles();
    await selectProfile(user.id);
  }

  function startDelete(profile) {
    deletingId = profile.id;
    deletingName = profile.name;
  }

  async function confirmDelete() {
    await deleteUser(deletingId);
    const wasActive = deletingId;
    deletingId = null;
    deletingName = '';
    await refreshProfiles();
    if ($activeProfileId === wasActive) {
      activeProfileId.set(null);
    }
  }

  function startEdit(profile) {
    editingId = profile.id;
    editName = profile.name;
  }

  async function handleEdit() {
    if (!editName.trim()) return;
    await updateUser(editingId, { name: editName.trim() });
    editingId = null;
    editName = '';
    await refreshProfiles();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      if (showAddForm) handleCreate();
      else if (editingId) handleEdit();
    }
    if (e.key === 'Escape') {
      showAddForm = false;
      editingId = null;
      deletingId = null;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="profile-overlay">
  <div class="profile-container">
    <h1>Who's learning?</h1>

    {#if loading}
      <p class="loading-text">Loading profiles...</p>
    {:else}
      <div class="profiles-grid">
        {#each allProfiles as profile}
          <div class="profile-card">
            {#if editingId === profile.id}
              <div class="avatar" style="background: {profile.avatar_color}">
                {profile.name[0].toUpperCase()}
              </div>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                type="text"
                class="edit-input"
                bind:value={editName}
                autofocus
              />
              <div class="edit-actions">
                <button class="btn-sm btn-save" onclick={handleEdit}>Save</button>
                <button class="btn-sm btn-cancel" onclick={() => editingId = null}>Cancel</button>
              </div>
            {:else}
              <button class="profile-btn" onclick={() => selectProfile(profile.id)}>
                <div class="avatar" style="background: {profile.avatar_color}">
                  {profile.name[0].toUpperCase()}
                </div>
                <span class="profile-name">{profile.name}</span>
                <span class="profile-level">Lv {profile.level}</span>
              </button>
              <div class="profile-actions">
                <button
                  class="action-btn edit-btn"
                  onclick={() => startEdit(profile)}
                  title="Edit name"
                >&#9998;</button>
                <button
                  class="action-btn delete-btn"
                  onclick={() => startDelete(profile)}
                  title="Delete profile"
                >&times;</button>
              </div>
            {/if}
          </div>
        {/each}

        <!-- Add profile card -->
        {#if !showAddForm}
          <button class="profile-card add-card" onclick={() => showAddForm = true}>
            <div class="avatar add-avatar">+</div>
            <span class="profile-name">Add Profile</span>
          </button>
        {/if}
      </div>

      <!-- Add profile form -->
      {#if showAddForm}
        <div class="add-form">
          <h2>Create Profile</h2>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            class="name-input"
            placeholder="Enter name"
            bind:value={newName}
            autofocus
            maxlength="20"
          />
          <div class="color-picker">
            <span class="color-label">Pick a color:</span>
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
          <div class="form-actions">
            <button class="btn btn-primary" onclick={handleCreate} disabled={!newName.trim()}>
              Create
            </button>
            <button class="btn btn-secondary" onclick={() => { showAddForm = false; newName = ''; }}>
              Cancel
            </button>
          </div>
        </div>
      {/if}

      <!-- Delete confirmation modal -->
      {#if deletingId}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="confirm-backdrop" onclick={() => deletingId = null}>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="confirm-modal" onclick={(e) => e.stopPropagation()}>
            <h3>Delete Profile?</h3>
            <p>This will permanently delete all progress for "<strong>{deletingName}</strong>". This cannot be undone.</p>
            <div class="confirm-actions">
              <button class="btn btn-danger" onclick={confirmDelete}>Delete</button>
              <button class="btn btn-secondary" onclick={() => deletingId = null}>Cancel</button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .profile-overlay {
    position: fixed;
    inset: 0;
    background: var(--color-bg-body);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .profile-container {
    text-align: center;
    padding: 2rem;
    max-width: 700px;
    width: 100%;
  }

  h1 {
    font-size: 2.5rem;
    color: var(--color-text-heading);
    margin-bottom: 2.5rem;
    font-weight: 700;
  }

  .loading-text {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .profiles-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .profile-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem;
    background: none;
    border: none;
    cursor: default;
    min-width: 120px;
  }

  .profile-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s;
  }

  .profile-btn:hover {
    transform: scale(1.05);
  }

  .profile-btn:hover .avatar {
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.5);
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 800;
    color: #fff;
    transition: box-shadow 0.2s;
  }

  .add-avatar {
    background: var(--color-bg-elevated) !important;
    border: 2px dashed var(--color-border);
    font-size: 2.5rem;
    font-weight: 300;
    color: var(--color-text-secondary);
  }

  .add-card {
    cursor: pointer;
    border: none;
    background: none;
  }

  .add-card:hover .add-avatar {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
  }

  .profile-name {
    color: var(--color-text-primary);
    font-size: 0.95rem;
    font-weight: 500;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-level {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .profile-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .profile-card:hover .profile-actions {
    opacity: 1;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-bg-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .edit-btn:hover {
    border-color: var(--color-accent-blue);
    color: var(--color-accent-blue);
  }

  .delete-btn:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
  }

  .edit-input {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-accent-primary);
    border-radius: 6px;
    color: var(--color-text-heading);
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
    width: 100px;
    text-align: center;
    outline: none;
  }

  .edit-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn-sm {
    padding: 0.2rem 0.5rem;
    border: none;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .btn-save {
    background: var(--color-accent-green);
    color: #fff;
  }

  .btn-cancel {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }

  /* Add profile form */
  .add-form {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 360px;
    margin: 0 auto;
  }

  .add-form h2 {
    color: var(--color-text-heading);
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  .name-input {
    width: 100%;
    padding: 0.65rem 0.75rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text-heading);
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    margin-bottom: 1rem;
  }

  .name-input:focus {
    border-color: var(--color-accent-primary);
  }

  .color-picker {
    margin-bottom: 1.25rem;
  }

  .color-label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .color-options {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
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

  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .btn {
    padding: 0.6rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
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

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-border-hover);
  }

  .btn-danger {
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-danger:hover {
    background: #c0392b;
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

  @media (max-width: 480px) {
    h1 {
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
    }

    .profile-container {
      padding: 1rem;
    }

    .avatar {
      width: 64px;
      height: 64px;
      font-size: 1.5rem;
    }

    .profiles-grid {
      gap: 1rem;
    }

    .profile-card {
      min-width: 100px;
      padding: 0.75rem;
    }

    .profile-actions {
      opacity: 1;
    }

    .color-options {
      flex-wrap: wrap;
    }
  }
</style>
