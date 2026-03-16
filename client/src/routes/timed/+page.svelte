<script>
  import { getTimedLeaderboard } from '$lib/api.js';
  import { onMount } from 'svelte';

  let selectedDifficulty = $state('medium');
  let leaderboard = $state([]);
  let loading = $state(true);

  const DIFFICULTIES = [
    { key: 'easy', label: 'Easy', desc: '10 questions, 2 min', color: 'var(--color-accent-green)' },
    { key: 'medium', label: 'Medium', desc: '15 questions, 90 sec', color: 'var(--color-accent-orange)' },
    { key: 'hard', label: 'Hard', desc: '20 questions, 60 sec', color: 'var(--color-accent-red)' }
  ];

  onMount(async () => {
    await loadLeaderboard();
  });

  async function loadLeaderboard() {
    loading = true;
    leaderboard = await getTimedLeaderboard(selectedDifficulty);
    loading = false;
  }

  async function changeDifficulty(d) {
    selectedDifficulty = d;
    await loadLeaderboard();
  }
</script>

<div class="timed-page">
  <h1>Timed Challenge</h1>
  <p class="subtitle">Race against the clock! Answer as many questions as you can before time runs out.</p>

  <div class="difficulty-selector">
    {#each DIFFICULTIES as d}
      <button
        class="diff-card"
        class:selected={selectedDifficulty === d.key}
        onclick={() => changeDifficulty(d.key)}
      >
        <h3>{d.label}</h3>
        <p>{d.desc}</p>
      </button>
    {/each}
  </div>

  <a href="/timed/play?difficulty={selectedDifficulty}" class="start-btn">
    Start {DIFFICULTIES.find(d => d.key === selectedDifficulty)?.label} Challenge &rarr;
  </a>

  <div class="leaderboard-section">
    <h2>Leaderboard - {DIFFICULTIES.find(d => d.key === selectedDifficulty)?.label}</h2>
    {#if loading}
      <div class="loading">Loading...</div>
    {:else if leaderboard.length === 0}
      <p class="empty-lb">No scores yet. Be the first!</p>
    {:else}
      <div class="leaderboard">
        {#each leaderboard as entry, i}
          <div class="lb-row" class:top3={i < 3}>
            <span class="lb-rank">{i + 1}</span>
            <div class="lb-avatar" style="background: {entry.avatar_color}">{entry.name[0].toUpperCase()}</div>
            <span class="lb-name">{entry.name}</span>
            <span class="lb-score">{entry.score}</span>
            <span class="lb-detail">{entry.correct_count}/{entry.total_questions}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .timed-page {
    max-width: 650px;
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

  .difficulty-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .diff-card {
    padding: 1rem;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
  }

  .diff-card:hover { border-color: var(--color-accent-primary); }

  .diff-card.selected {
    border-color: var(--color-accent-primary);
    background: rgba(233, 69, 96, 0.1);
  }

  .diff-card h3 {
    color: var(--color-text-heading);
    font-size: 1rem;
    margin-bottom: 0.15rem;
  }

  .diff-card p {
    color: var(--color-text-secondary);
    font-size: 0.78rem;
  }

  .start-btn {
    display: block;
    text-align: center;
    padding: 1rem;
    background: var(--color-accent-primary);
    color: #fff;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s;
    margin-bottom: 2rem;
  }

  .start-btn:hover {
    background: var(--color-accent-primary-hover);
    transform: translateY(-1px);
  }

  .leaderboard-section h2 {
    color: var(--color-text-heading);
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .loading, .empty-lb {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 2rem;
  }

  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .lb-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  .lb-row.top3 {
    border-color: var(--color-accent-orange);
  }

  .lb-rank {
    width: 24px;
    text-align: center;
    font-weight: 700;
    color: var(--color-text-secondary);
  }

  .lb-row.top3 .lb-rank {
    color: var(--color-accent-orange);
  }

  .lb-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .lb-name {
    flex: 1;
    color: var(--color-text-heading);
    font-weight: 500;
  }

  .lb-score {
    font-weight: 700;
    color: var(--color-accent-primary);
    font-size: 1.05rem;
  }

  .lb-detail {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    min-width: 40px;
    text-align: right;
  }
</style>
