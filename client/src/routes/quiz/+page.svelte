<script>
  import { getLessons } from '$lib/api.js';
  import { onMount } from 'svelte';

  let lessons = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const all = await getLessons();
    lessons = all.filter(l => l.completed);
    loading = false;
  });
</script>

<div class="quiz-select">
  <h1>Take a Quiz</h1>
  <p class="subtitle">Test your knowledge on completed lessons. Get 100% for bonus XP!</p>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if lessons.length === 0}
    <div class="empty">
      <h2>No quizzes available yet</h2>
      <p>Complete a lesson first to unlock its quiz.</p>
      <a href="/lessons" class="btn btn-primary">Go to Lessons</a>
    </div>
  {:else}
    <div class="quiz-grid">
      {#each lessons as lesson}
        <a href="/quiz/{lesson.id}" class="quiz-card">
          <div class="quiz-unit">Unit {lesson.unit}</div>
          <h3>{lesson.title}</h3>
          <span class="quiz-cta">Start Quiz &rarr;</span>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .quiz-select {
    max-width: 700px;
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
    margin-bottom: 0.5rem;
  }

  .empty p {
    margin-bottom: 1.5rem;
  }

  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .quiz-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.25rem;
    text-decoration: none;
    transition: all 0.2s;
  }

  .quiz-card:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-2px);
  }

  .quiz-unit {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
  }

  .quiz-card h3 {
    color: var(--color-text-heading);
    font-size: 1rem;
    margin: 0 0 0.75rem;
  }

  .quiz-cta {
    color: var(--color-accent-primary);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    display: inline-block;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
  }
</style>
