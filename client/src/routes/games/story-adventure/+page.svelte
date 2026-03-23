<script>
  import { getStoryChapters } from '$lib/api.js';
  import { onMount } from 'svelte';

  let chapters = $state([]);
  let loading = $state(true);
  let error = $state(null);

  onMount(async () => {
    try {
      chapters = await getStoryChapters();
    } catch (err) {
      console.error('Failed to load story chapters:', err);
      error = err.message || 'Failed to load story chapters';
    } finally {
      loading = false;
    }
  });

  function getDifficultyClass(difficulty) {
    return difficulty?.toLowerCase() || 'beginner';
  }

  function getChapterIcon(index) {
    const icons = ['🌄', '☕', '🏪', '🗺️', '🍽️', '🚕', '📚', '🎭'];
    return icons[index % icons.length];
  }
</script>

<div class="story-adventure-page">
  <header class="header">
    <a href="/games" class="back-link">&larr; Games</a>
    <h1>Story Adventure</h1>
    <p class="subtitle">
      Navigate Ethiopian scenarios by choosing the right Amharic phrases.
      Each choice shapes your journey through interactive cultural experiences.
    </p>
  </header>

  {#if loading}
    <div class="loading">Loading chapters...</div>
  {:else if error}
    <div class="error-state" role="alert">
      <p>Error: {error}</p>
      <button class="btn-secondary" onclick={() => window.location.reload()}>Try Again</button>
    </div>
  {:else}
    <main class="chapters-grid">
      {#each chapters as chapter, i}
        <a href="/games/story-adventure/{chapter.id}" class="chapter-card" aria-label="Play {chapter.title}">
          <div class="chapter-icon">{getChapterIcon(i)}</div>

          <div class="chapter-content">
            <div class="chapter-header">
              <h3>{chapter.title}</h3>
              <span class="difficulty difficulty-{getDifficultyClass(chapter.difficulty)}">
                {chapter.difficulty}
              </span>
            </div>

            <p class="chapter-description">{chapter.description}</p>

            <div class="chapter-meta">
              <div class="meta-item">
                <span class="meta-icon" aria-hidden="true">💬</span>
                <span>{chapter.turn_count} scenes</span>
              </div>
              <div class="meta-item xp-reward">
                <span class="meta-icon" aria-hidden="true">⭐</span>
                <span>+{chapter.xp_reward} XP</span>
              </div>
            </div>
          </div>

          <div class="play-indicator">
            Begin Story →
          </div>
        </a>
      {/each}
    </main>

    {#if chapters.length === 0}
      <div class="empty-state">
        <p>No story chapters available yet.</p>
        <a href="/games" class="btn-secondary">Back to Games</a>
      </div>
    {/if}
  {/if}
</div>

<style>
  .story-adventure-page {
    max-width: 1000px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 2.5rem;
  }

  .back-link {
    display: inline-block;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: var(--color-accent-primary);
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    font-weight: 700;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    line-height: 1.6;
    max-width: 700px;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 4rem 1rem;
    font-size: 1.1rem;
  }

  .chapters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
  }

  .chapter-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 1.5rem;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .chapter-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    opacity: 0;
    transition: opacity 0.3s;
  }

  .chapter-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent-primary);
    box-shadow: 0 12px 32px rgba(233, 69, 96, 0.2);
  }

  .chapter-card:hover::before {
    opacity: 1;
  }

  .chapter-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-align: center;
    filter: grayscale(0.3);
    transition: all 0.3s;
  }

  .chapter-card:hover .chapter-icon {
    filter: grayscale(0);
    transform: scale(1.1);
  }

  .chapter-content {
    flex: 1;
  }

  .chapter-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .chapter-card h3 {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .difficulty {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .difficulty-beginner {
    background: rgba(76, 175, 80, 0.2);
    color: var(--color-accent-green);
  }

  .difficulty-intermediate {
    background: rgba(245, 166, 35, 0.2);
    color: var(--color-accent-orange);
  }

  .difficulty-advanced {
    background: rgba(233, 69, 96, 0.2);
    color: var(--color-accent-primary);
  }

  .chapter-description {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }

  .chapter-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .meta-item.xp-reward {
    color: var(--color-accent-orange);
    font-weight: 600;
  }

  .meta-icon {
    font-size: 1rem;
  }

  .play-indicator {
    background: var(--color-accent-primary);
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s;
  }

  .chapter-card:hover .play-indicator {
    background: var(--color-accent-orange);
    transform: translateX(4px);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .empty-state p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }

  .error-state {
    text-align: center;
    padding: 4rem 2rem;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    color: var(--color-text-secondary);
  }

  .error-state p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    color: var(--color-accent-primary);
  }

  .btn-secondary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 8px;
    color: var(--color-text-heading);
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .chapters-grid {
      grid-template-columns: 1fr;
    }

    .chapter-card {
      padding: 1.25rem;
    }
  }
</style>
