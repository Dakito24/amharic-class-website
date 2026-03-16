<script>
  import { getWeakWords, getLessons } from '$lib/api.js';
  import { onMount } from 'svelte';

  let weakWords = $state([]);
  let lessons = $state([]);
  let loading = $state(true);
  let selectedLesson = $state(null);

  onMount(async () => {
    const [ww, ls] = await Promise.all([getWeakWords(), getLessons()]);
    weakWords = ww;
    lessons = ls;
    loading = false;
  });

  async function filterByLesson(lessonId) {
    selectedLesson = lessonId;
    loading = true;
    weakWords = await getWeakWords(lessonId);
    loading = false;
  }
</script>

<div class="review-page">
  <h1>Review Weak Words</h1>
  <p class="subtitle">Focus on words you've struggled with. Questions with over 40% error rate appear here.</p>

  <div class="lesson-filters">
    <button class="filter-btn" class:active={!selectedLesson} onclick={() => filterByLesson(null)}>All</button>
    {#each lessons as l}
      <button class="filter-btn" class:active={selectedLesson === l.id} onclick={() => filterByLesson(l.id)}>
        {l.title}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if weakWords.length === 0}
    <div class="empty-state">
      <div class="empty-icon">&#10003;</div>
      <h2>No weak words!</h2>
      <p>{selectedLesson ? 'No trouble spots for this lesson.' : 'Take some quizzes first to track your performance.'}</p>
      <a href="/quiz" class="btn btn-primary">Go to Quizzes</a>
    </div>
  {:else}
    <div class="weak-list">
      {#each weakWords as word}
        <div class="weak-card">
          <div class="weak-info">
            <div class="weak-question">{word.question_text}</div>
            <div class="weak-meta">
              <span class="weak-lesson">{word.lesson_title}</span>
              <span class="weak-answer">Answer: {word.correct_answer}</span>
            </div>
          </div>
          <div class="weak-stats">
            <div class="error-rate" class:high={word.error_rate >= 70} class:medium={word.error_rate >= 50 && word.error_rate < 70}>
              {word.error_rate}% wrong
            </div>
            <div class="attempt-count">{word.total_attempts} attempts</div>
          </div>
        </div>
      {/each}
    </div>

    <a href="/review/quiz" class="btn btn-primary retry-btn">
      Retry Weak Words ({weakWords.length} questions)
    </a>
  {/if}
</div>

<style>
  .review-page {
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
    margin-bottom: 1.5rem;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .lesson-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1.5rem;
    max-height: 80px;
    overflow-y: auto;
  }

  .filter-btn {
    padding: 0.35rem 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .filter-btn:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-text-heading);
  }

  .filter-btn.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #fff;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
  }

  .empty-icon {
    font-size: 3rem;
    color: var(--color-accent-green);
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }

  .weak-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .weak-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
  }

  .weak-info {
    flex: 1;
    min-width: 0;
  }

  .weak-question {
    color: var(--color-text-heading);
    font-weight: 500;
    margin-bottom: 0.3rem;
  }

  .weak-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
  }

  .weak-lesson {
    color: var(--color-text-secondary);
  }

  .weak-answer {
    color: var(--color-accent-green);
  }

  .weak-stats {
    text-align: right;
    flex-shrink: 0;
  }

  .error-rate {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--color-accent-orange);
  }

  .error-rate.high {
    color: var(--color-accent-red);
  }

  .error-rate.medium {
    color: var(--color-accent-orange);
  }

  .attempt-count {
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }

  .retry-btn {
    display: block;
    text-align: center;
    text-decoration: none;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
  }
</style>
