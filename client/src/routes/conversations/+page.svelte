<script>
  import { getConversations } from '$lib/api.js';
  import { onMount } from 'svelte';

  let conversations = $state([]);
  let loading = $state(true);

  onMount(async () => {
    conversations = await getConversations();
    loading = false;
  });
</script>

<div class="conversations-page">
  <h1>Conversation Practice</h1>
  <p class="subtitle">Practice real-world Amharic conversations in common scenarios.</p>

  {#if loading}
    <div class="loading">Loading conversations...</div>
  {:else}
    <div class="convo-grid">
      {#each conversations as convo}
        <a href="/conversations/{convo.id}" class="convo-card">
          <div class="convo-header">
            <h3>{convo.title}</h3>
            <span class="convo-difficulty" class:intermediate={convo.difficulty === 'intermediate'}>
              {convo.difficulty}
            </span>
          </div>
          <p>{convo.description}</p>
          <div class="convo-meta">
            <span>{convo.turn_count} responses</span>
            <span>+{convo.xp_reward} XP</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .conversations-page {
    max-width: 750px;
    margin: 0 auto;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .convo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.75rem;
  }

  .convo-card {
    padding: 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .convo-card:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-1px);
  }

  .convo-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .convo-header h3 {
    color: var(--color-text-heading);
    font-size: 1.05rem;
  }

  .convo-difficulty {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(76, 175, 80, 0.15);
    color: var(--color-accent-green);
    flex-shrink: 0;
  }

  .convo-difficulty.intermediate {
    background: rgba(245, 166, 35, 0.15);
    color: var(--color-accent-orange);
  }

  .convo-card p {
    color: var(--color-text-secondary);
    font-size: 0.88rem;
    line-height: 1.4;
    margin-bottom: 0.75rem;
  }

  .convo-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  .convo-meta span:last-child {
    color: var(--color-accent-orange);
    font-weight: 600;
  }
</style>
