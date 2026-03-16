<script>
  import { getCultureArticles } from '$lib/api.js';
  import { onMount } from 'svelte';

  let articles = $state([]);
  let loading = $state(true);

  onMount(async () => {
    articles = await getCultureArticles();
    loading = false;
  });
</script>

<div class="culture-page">
  <h1>Cultural Notes</h1>
  <p class="subtitle">Understand the culture behind the language. These articles give context to the words you're learning.</p>

  {#if loading}
    <div class="loading">Loading articles...</div>
  {:else}
    <div class="article-grid">
      {#each articles as article}
        <a href="/culture/{article.id}" class="article-card">
          <div class="article-emoji">{article.image_emoji}</div>
          <div class="article-info">
            <h3>{article.title}</h3>
            <p>{article.description}</p>
            <span class="article-difficulty" class:intermediate={article.difficulty === 'intermediate'}>
              {article.difficulty}
            </span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .culture-page {
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

  .article-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .article-card {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
    padding: 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .article-card:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-1px);
  }

  .article-emoji {
    font-size: 2.5rem;
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-elevated);
    border-radius: 12px;
  }

  .article-info {
    flex: 1;
    min-width: 0;
  }

  .article-info h3 {
    color: var(--color-text-heading);
    font-size: 1.1rem;
    margin-bottom: 0.3rem;
  }

  .article-info p {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .article-difficulty {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(76, 175, 80, 0.15);
    color: var(--color-accent-green);
  }

  .article-difficulty.intermediate {
    background: rgba(245, 166, 35, 0.15);
    color: var(--color-accent-orange);
  }
</style>
