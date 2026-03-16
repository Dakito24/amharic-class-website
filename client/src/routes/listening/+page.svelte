<script>
  import { getLessons } from '$lib/api.js';
  import { onMount } from 'svelte';

  let lessons = $state([]);
  let loading = $state(true);

  onMount(async () => {
    lessons = await getLessons();
    loading = false;
  });
</script>

<div class="listening-page">
  <h1>Listening Quiz</h1>
  <p class="subtitle">Test your ear! Listen to Amharic words and identify their meaning.</p>

  {#if loading}
    <div class="loading">Loading lessons...</div>
  {:else}
    <a href="/listening/quiz" class="start-card">
      <div class="start-icon">&#127911;</div>
      <div class="start-info">
        <h3>All Vocabulary</h3>
        <p>Random mix from all lessons</p>
      </div>
      <span class="start-arrow">&rarr;</span>
    </a>

    <h2 class="section-title">By Lesson</h2>
    <div class="lesson-grid">
      {#each lessons as lesson}
        <a href="/listening/quiz?lesson_id={lesson.id}" class="lesson-card">
          <span class="lesson-unit">Unit {lesson.unit}</span>
          <h3>{lesson.title}</h3>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .listening-page {
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

  .start-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-primary);
    border-radius: 12px;
    text-decoration: none;
    margin-bottom: 2rem;
    transition: all 0.2s;
  }

  .start-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2);
  }

  .start-icon {
    font-size: 2rem;
  }

  .start-info {
    flex: 1;
  }

  .start-info h3 {
    color: var(--color-text-heading);
    margin-bottom: 0.15rem;
  }

  .start-info p {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .start-arrow {
    color: var(--color-accent-primary);
    font-size: 1.2rem;
    font-weight: 700;
  }

  .section-title {
    color: var(--color-text-heading);
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .lesson-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .lesson-card {
    padding: 0.75rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s;
  }

  .lesson-card:hover {
    border-color: var(--color-accent-primary);
  }

  .lesson-unit {
    color: var(--color-text-secondary);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .lesson-card h3 {
    color: var(--color-text-heading);
    font-size: 0.9rem;
    font-weight: 500;
  }
</style>
