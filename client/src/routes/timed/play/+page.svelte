<script>
  import { page } from '$app/stores';
  import { startTimedChallenge, submitTimedChallenge } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import { onMount } from 'svelte';

  let questions = $state([]);
  let difficulty = $state('medium');
  let timeLimit = $state(0);
  let xpMultiplier = $state(1);
  let loading = $state(true);
  let currentQ = $state(0);
  let answers = $state([]);
  let result = $state(null);

  // Timer state
  let timeRemaining = $state(0);
  let timerInterval = $state(null);
  let questionStartTime = $state(0);

  let current = $derived(questions[currentQ]);
  let progress = $derived(questions.length > 0 ? (currentQ / questions.length) * 100 : 0);
  let timerPercent = $derived(timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 100);
  let timerLow = $derived(timeRemaining < 10000);
  let timerSeconds = $derived(Math.ceil(timeRemaining / 1000));

  onMount(async () => {
    difficulty = $page.url.searchParams.get('difficulty') || 'medium';
    const data = await startTimedChallenge(difficulty);
    questions = data.questions;
    timeLimit = data.time_limit_ms;
    xpMultiplier = data.xp_multiplier;
    timeRemaining = data.time_limit_ms;
    loading = false;
    questionStartTime = Date.now();

    timerInterval = setInterval(() => {
      timeRemaining = Math.max(0, timeRemaining - 100);
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        autoSubmit();
      }
    }, 100);

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  function selectAnswer(answer) {
    if (result) return;
    const timeTaken = Date.now() - questionStartTime;

    answers.push({
      question_id: current.id,
      user_answer: answer,
      time_taken_ms: timeTaken
    });
    answers = [...answers];

    // Auto-advance for speed
    if (currentQ < questions.length - 1) {
      currentQ++;
      questionStartTime = Date.now();
    } else {
      finishChallenge();
    }
  }

  async function autoSubmit() {
    if (result) return;
    await finishChallenge();
  }

  async function finishChallenge() {
    if (timerInterval) clearInterval(timerInterval);
    result = await submitTimedChallenge(difficulty, answers, timeRemaining);
    if (result.leveled_up) {
      await loadProgress();
      triggerLevelUp();
    } else {
      await loadProgress();
    }
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (loading || result || !current) return;

    const num = parseInt(e.key);
    if (num >= 1 && num <= current.options.length) {
      e.preventDefault();
      e.stopPropagation();
      selectAnswer(current.options[num - 1]);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="timed-play">
  {#if loading}
    <div class="loading">Loading challenge...</div>
  {:else if result}
    <div class="result-card">
      <div class="result-icon">
        {#if result.percentage >= 80}&#9733;{:else if result.percentage >= 50}&#9734;{:else}&#10060;{/if}
      </div>
      <h2>Challenge Complete!</h2>
      <div class="score">{result.score} pts</div>
      {#if result.is_new_best}
        <div class="new-best">New Personal Best!</div>
      {/if}
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-num">{result.correct_count}/{result.total}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat">
          <div class="stat-num">{result.percentage}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat">
          <div class="stat-num">+{result.base_xp}</div>
          <div class="stat-label">Base XP</div>
        </div>
        <div class="stat">
          <div class="stat-num">+{result.speed_bonus}</div>
          <div class="stat-label">Speed Bonus</div>
        </div>
      </div>
      <div class="xp-total">+{result.xp_earned} XP earned</div>

      <div class="result-actions">
        <a href="/timed/play?difficulty={difficulty}" class="btn btn-primary"
          onclick={(e) => { e.preventDefault(); location.reload(); }}>
          Play Again
        </a>
        <a href="/timed" class="btn btn-secondary">Leaderboard</a>
      </div>
    </div>
  {:else}
    <div class="game-header">
      <div class="timer" class:low={timerLow}>
        <div class="timer-bar" style="width: {timerPercent}%"></div>
        <span class="timer-text">{timerSeconds}s</span>
      </div>
      <div class="game-info">
        <span class="difficulty-badge">{difficulty}</span>
        <span class="question-num">{currentQ + 1}/{questions.length}</span>
      </div>
    </div>

    <div class="question-card">
      <h2 class="question-text">{current.question}</h2>
      <div class="options">
        {#each current.options as option, i}
          <button class="option" onclick={() => selectAnswer(option)}>
            <span class="option-num">{i + 1}</span>
            {option}
          </button>
        {/each}
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
  {/if}
</div>

<style>
  .timed-play {
    max-width: 600px;
    margin: 0 auto;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .game-header {
    margin-bottom: 1rem;
  }

  .timer {
    position: relative;
    height: 36px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .timer-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-green), var(--color-accent-orange));
    transition: width 0.1s linear;
    border-radius: 7px;
  }

  .timer.low .timer-bar {
    background: var(--color-accent-red);
  }

  .timer-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1rem;
    color: var(--color-text-heading);
  }

  .timer.low .timer-text {
    color: var(--color-accent-red);
    animation: pulse 0.5s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from { opacity: 1; }
    to { opacity: 0.5; }
  }

  .game-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .difficulty-badge {
    text-transform: uppercase;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--color-accent-primary);
  }

  .question-num {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .question-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .question-text {
    color: var(--color-text-heading);
    font-size: 1.2rem;
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-heading);
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
  }

  .option:hover {
    border-color: var(--color-accent-primary);
    transform: translateX(4px);
  }

  .option-num {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--color-border);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .progress-bar {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent-primary);
    transition: width 0.2s ease;
  }

  .result-card {
    text-align: center;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2.5rem;
  }

  .result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .result-card h2 { color: var(--color-text-heading); margin-bottom: 0.5rem; }
  .score { font-size: 2.5rem; font-weight: 800; color: var(--color-accent-primary); }

  .new-best {
    background: linear-gradient(90deg, var(--color-accent-orange), var(--color-accent-primary));
    color: #fff;
    padding: 0.4rem 1rem;
    border-radius: 20px;
    display: inline-block;
    font-weight: 700;
    font-size: 0.85rem;
    margin: 0.5rem 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin: 1.5rem 0;
  }

  .stat { text-align: center; }
  .stat-num { font-size: 1.2rem; font-weight: 700; color: var(--color-text-heading); }
  .stat-label { font-size: 0.7rem; color: var(--color-text-secondary); text-transform: uppercase; }

  .xp-total {
    color: var(--color-accent-orange);
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .result-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
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
  }

  .btn-primary { background: var(--color-accent-primary); color: #fff; }
  .btn-secondary { background: var(--color-border); color: var(--color-text-heading); }

  @media (max-width: 480px) {
    .question-card {
      padding: 1.25rem;
    }

    .question-text {
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .option {
      padding: 0.75rem;
      font-size: 0.9rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .result-card {
      padding: 1.5rem;
    }

    .score {
      font-size: 2rem;
    }

    .xp-total {
      font-size: 1.1rem;
    }
  }
</style>
