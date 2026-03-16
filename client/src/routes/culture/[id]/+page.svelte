<script>
  import { page } from '$app/stores';
  import { getCultureArticle } from '$lib/api.js';
  import { onMount } from 'svelte';

  let article = $state(null);
  let loading = $state(true);

  let articleId = $derived(Number($page.params.id));

  onMount(async () => {
    article = await getCultureArticle(articleId);
    loading = false;
  });
</script>

<div class="article-page">
  {#if loading}
    <div class="loading">Loading article...</div>
  {:else if !article}
    <div class="empty">
      <h2>Article not found</h2>
      <a href="/culture" class="btn btn-secondary">Back to Cultural Notes</a>
    </div>
  {:else}
    <a href="/culture" class="back">&larr; Cultural Notes</a>

    <div class="article-header">
      <span class="article-emoji">{article.image_emoji}</span>
      <h1>{article.title}</h1>
      <p class="description">{article.description}</p>
    </div>

    <div class="article-body">
      {#each article.sections as section}
        <div class="section">
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </div>
      {/each}
    </div>

    {#if article.vocab_highlights?.length > 0}
      <div class="vocab-section">
        <h2>Key Vocabulary</h2>
        <div class="vocab-list">
          {#each article.vocab_highlights as v}
            <div class="vocab-item">
              <div class="vocab-amharic">{v.amharic}</div>
              <div class="vocab-romanized">{v.romanized}</div>
              <div class="vocab-english">{v.english}</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if article.related_lessons?.length > 0}
      <div class="related">
        <h3>Related Lessons</h3>
        <div class="related-links">
          {#each article.related_lessons as lessonId}
            <a href="/lessons/{lessonId}" class="related-link">Lesson {lessonId} &rarr;</a>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .article-page {
    max-width: 700px;
    margin: 0 auto;
  }

  .loading, .empty {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .empty {
    background: var(--color-bg-surface);
    border-radius: 16px;
    border: 1px solid var(--color-border);
  }

  .empty h2 {
    color: var(--color-text-heading);
    margin-bottom: 1rem;
  }

  .back {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover {
    color: var(--color-text-heading);
  }

  .article-header {
    margin: 1rem 0 2rem;
  }

  .article-emoji {
    font-size: 3rem;
  }

  .article-header h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin: 0.5rem 0 0.3rem;
  }

  .description {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    line-height: 1.5;
  }

  .article-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .section {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .section h2 {
    color: var(--color-text-heading);
    font-size: 1.15rem;
    margin-bottom: 0.75rem;
  }

  .section p {
    color: var(--color-text-primary);
    line-height: 1.7;
    font-size: 0.95rem;
  }

  .vocab-section {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .vocab-section h2 {
    color: var(--color-accent-primary);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }

  .vocab-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .vocab-item {
    display: grid;
    grid-template-columns: 1fr 1fr 1.2fr;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border);
    align-items: center;
  }

  .vocab-item:last-child {
    border-bottom: none;
  }

  .vocab-amharic {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
  }

  .vocab-romanized {
    color: var(--color-accent-primary);
    font-weight: 600;
  }

  .vocab-english {
    color: var(--color-text-heading);
  }

  .related {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .related h3 {
    color: var(--color-text-heading);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
  }

  .related-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .related-link {
    padding: 0.4rem 0.8rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-accent-primary);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .related-link:hover {
    border-color: var(--color-accent-primary);
  }

  .btn-secondary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--color-border);
    color: var(--color-text-heading);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
  }
</style>
