<script>
  import { getDueFlashcards, reviewFlashcard } from '$lib/api.js';
  import { loadProgress } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { onMount } from 'svelte';

  let cards = $state([]);
  let currentIndex = $state(0);
  let flipped = $state(false);
  let loading = $state(true);
  let sessionComplete = $state(false);
  let reviewedCount = $state(0);
  let xpEarned = $state(0);

  onMount(async () => {
    cards = await getDueFlashcards();
    loading = false;
  });

  let currentCard = $derived(cards[currentIndex]);
  let remaining = $derived(cards.length - currentIndex);

  function flip() {
    flipped = !flipped;
  }

  async function rate(quality) {
    if (!currentCard) return;
    const result = await reviewFlashcard(currentCard.id, quality);
    xpEarned += result.xp_earned;
    reviewedCount++;

    if (currentIndex < cards.length - 1) {
      currentIndex++;
      flipped = false;
    } else {
      sessionComplete = true;
      await loadProgress();
    }
  }

  async function restart() {
    cards = await getDueFlashcards();
    currentIndex = 0;
    flipped = false;
    sessionComplete = false;
    reviewedCount = 0;
    xpEarned = 0;
  }

  const RATE_MAP = { '1': 1, '2': 3, '3': 4, '4': 5 };

  function handleFlashcardKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (loading || sessionComplete || cards.length === 0) return;

    if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      flip();
      return;
    }

    if (flipped && RATE_MAP[e.key]) {
      e.preventDefault();
      e.stopPropagation();
      rate(RATE_MAP[e.key]);
    }
  }
</script>

<svelte:window onkeydown={handleFlashcardKeydown} />

<div class="flashcards-page">
  <h1>Flashcards</h1>
  <p class="subtitle">Review vocabulary using spaced repetition. Cards you struggle with appear more often.</p>

  {#if loading}
    <div class="loading">Loading flashcards...</div>
  {:else if cards.length === 0}
    <div class="empty-state">
      <div class="empty-icon">&#10003;</div>
      <h2>All caught up!</h2>
      <p>No flashcards due for review right now. Complete some lessons to add new vocabulary.</p>
      <a href="/lessons" class="btn btn-primary">Go to Lessons</a>
    </div>
  {:else if sessionComplete}
    <div class="session-complete">
      <div class="complete-icon">&#9733;</div>
      <h2>Session Complete!</h2>
      <div class="session-stats">
        <div class="stat">
          <span class="stat-num">{reviewedCount}</span>
          <span class="stat-label">Cards Reviewed</span>
        </div>
        <div class="stat">
          <span class="stat-num xp">+{xpEarned}</span>
          <span class="stat-label">XP Earned</span>
        </div>
      </div>
      <div class="session-actions">
        <button class="btn btn-primary" onclick={restart}>Review More</button>
        <a href="/" class="btn btn-secondary">Dashboard</a>
      </div>
    </div>
  {:else}
    <div class="progress-info">
      <span>{remaining} cards remaining</span>
      <span>+{xpEarned} XP this session</span>
    </div>

    <button class="flashcard" class:flipped onclick={flip}>
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="card-label">English</div>
          <div class="card-word">{currentCard.english}</div>
          <div class="card-hint">Tap to reveal</div>
        </div>
        <div class="flashcard-back">
          <div class="card-label">Amharic</div>
          <div class="card-romanized-row">
            <div class="card-romanized">{currentCard.romanized}</div>
            <AudioButton src={currentCard.audio_url} />
          </div>
          <div class="card-amharic">{currentCard.amharic}</div>
          {#if currentCard.pronunciation_guide}
            <div class="card-pronunciation">{currentCard.pronunciation_guide}</div>
          {/if}
          {#if currentCard.gender}
            <span class="card-gender">{currentCard.gender}</span>
          {/if}
        </div>
      </div>
    </button>

    {#if flipped}
      <div class="rating-section">
        <p class="rating-prompt">How well did you know this?</p>
        <div class="rating-buttons">
          <button class="rate-btn rate-fail" onclick={() => rate(1)}>
            <span class="rate-emoji">&#10060;</span>
            <span>Didn't know</span>
          </button>
          <button class="rate-btn rate-hard" onclick={() => rate(3)}>
            <span class="rate-emoji">&#128528;</span>
            <span>Hard</span>
          </button>
          <button class="rate-btn rate-good" onclick={() => rate(4)}>
            <span class="rate-emoji">&#128578;</span>
            <span>Good</span>
          </button>
          <button class="rate-btn rate-easy" onclick={() => rate(5)}>
            <span class="rate-emoji">&#128513;</span>
            <span>Easy</span>
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .flashcards-page {
    max-width: 600px;
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

  .empty-state, .session-complete {
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

  .complete-icon {
    font-size: 3rem;
    color: var(--color-accent-orange);
    margin-bottom: 1rem;
  }

  .empty-state h2, .session-complete h2 {
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }

  .session-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 1.5rem 0;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-num {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
  }

  .stat-num.xp {
    color: var(--color-accent-orange);
  }

  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .session-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .flashcard {
    width: 100%;
    height: 280px;
    perspective: 1000px;
    cursor: pointer;
    background: none;
    border: none;
    margin-bottom: 1.5rem;
  }

  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.5s;
    transform-style: preserve-3d;
  }

  .flashcard.flipped .flashcard-inner {
    transform: rotateY(180deg);
  }

  .flashcard-front, .flashcard-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    padding: 2rem;
  }

  .flashcard-front {
    background: linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated));
    border: 2px solid var(--color-border);
  }

  .flashcard-back {
    background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-surface));
    border: 2px solid var(--color-accent-primary);
    transform: rotateY(180deg);
  }

  .card-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }

  .card-word {
    font-size: 1.8rem;
    color: var(--color-text-heading);
    font-weight: 700;
  }

  .card-hint {
    color: var(--color-text-muted);
    font-size: 0.85rem;
    margin-top: 1rem;
  }

  .card-romanized-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .card-romanized {
    font-size: 1.8rem;
    color: var(--color-accent-primary);
    font-weight: 700;
  }

  .card-amharic {
    font-size: 1.3rem;
    color: var(--color-text-secondary);
  }

  .card-pronunciation {
    color: var(--color-accent-orange);
    font-style: italic;
    margin-top: 0.5rem;
  }

  .card-gender {
    margin-top: 0.5rem;
    background: var(--color-border);
    color: var(--color-text-secondary);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }

  .rating-section {
    text-align: center;
  }

  .rating-prompt {
    color: var(--color-text-secondary);
    margin-bottom: 0.75rem;
  }

  .rating-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .rate-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-bg-surface);
    color: var(--color-text-heading);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
    /* Ensure minimum touch target */
    min-height: 70px;
    min-width: 70px;
  }

  .rate-btn:hover {
    transform: translateY(-2px);
  }

  .rate-fail:hover { border-color: var(--color-accent-primary); }
  .rate-hard:hover { border-color: var(--color-accent-orange); }
  .rate-good:hover { border-color: var(--color-accent-green); }
  .rate-easy:hover { border-color: var(--color-accent-blue); }

  .rate-emoji {
    font-size: 1.5rem;
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

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text-heading);
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 1.4rem;
    }

    .flashcard {
      height: 240px;
    }

    .flashcard-front, .flashcard-back {
      padding: 1.25rem;
    }

    .card-word {
      font-size: 1.4rem;
    }

    .card-romanized {
      font-size: 1.4rem;
    }

    .card-amharic {
      font-size: 1.1rem;
    }

    .rating-buttons {
      grid-template-columns: repeat(2, 1fr);
    }

    .rate-btn {
      padding: 0.75rem 0.5rem;
      min-height: 72px;
      min-width: 72px;
      font-size: 0.85rem;
    }

    .rate-emoji {
      font-size: 1.2rem;
    }

    .empty-state, .session-complete {
      padding: 2rem 1.25rem;
    }

    .stat-num {
      font-size: 1.5rem;
    }
  }
</style>
