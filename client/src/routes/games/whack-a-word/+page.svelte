<script>
  import { onMount, onDestroy } from 'svelte';
  import { getVocabulary, submitGameScore, getGameHighScores } from '$lib/api.js';
  import AudioButton from '$lib/components/AudioButton.svelte';

  const GAME_DURATION = 60000; // 60 seconds
  const INITIAL_WORD_LIFETIME = 3000; // 3 seconds initially
  const MIN_WORD_LIFETIME = 1000; // Speed up to 1 second
  const GRID_SIZE = 4; // 4 fixed positions for words

  // Game state
  let gameState = $state('start'); // 'start', 'playing', 'gameover'
  let difficulty = $state('easy');
  let vocabulary = $state([]);
  let score = $state(0);
  let combo = $state(0);
  let maxCombo = $state(0);
  let correctCount = $state(0);
  let incorrectCount = $state(0);
  let timeRemaining = $state(GAME_DURATION);
  let currentAudio = $state(null);
  let currentWord = $state(null);
  let visibleWords = $state([]);
  let gameStartTime = $state(0);
  let leaderboard = $state([]);
  let personalBest = $state(0);
  let gameInterval = null;
  let spawnInterval = null;
  let wordLifetime = $state(INITIAL_WORD_LIFETIME);
  let errorMessage = $state('');
  let feedbackAnimation = $state(null); // 'correct' or 'incorrect'

  // Difficulty settings
  const DIFFICULTY_SETTINGS = {
    easy: { vocabCount: 20, initialSpawnRate: 2000, options: 4 },
    medium: { vocabCount: 40, initialSpawnRate: 1500, options: 4 },
    hard: { vocabCount: 60, initialSpawnRate: 1000, options: 4 }
  };

  onMount(async () => {
    await loadLeaderboard();
  });

  onDestroy(() => {
    // Clean up intervals
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
    if (spawnInterval) {
      clearInterval(spawnInterval);
      spawnInterval = null;
    }

    // Stop any playing audio
    if (window.__amharicAudio) {
      window.__amharicAudio.pause();
      window.__amharicAudio.currentTime = 0;
      window.__amharicAudio = null;
    }
  });

  async function loadLeaderboard() {
    try {
      const data = await getGameHighScores('whack-a-word');
      leaderboard = data.leaderboard || [];
      personalBest = data.user_best_score || 0;
      errorMessage = '';
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      errorMessage = 'Failed to load leaderboard. Please try again.';
    }
  }

  async function startGame() {
    gameState = 'playing';
    score = 0;
    combo = 0;
    maxCombo = 0;
    correctCount = 0;
    incorrectCount = 0;
    timeRemaining = GAME_DURATION;
    visibleWords = [];
    gameStartTime = Date.now();
    wordLifetime = INITIAL_WORD_LIFETIME;
    errorMessage = '';

    // Load vocabulary
    try {
      const settings = DIFFICULTY_SETTINGS[difficulty];
      const data = await getVocabulary({ limit: settings.vocabCount });
      vocabulary = data.filter(v => v.audio_url); // Only words with audio

      if (vocabulary.length < 10) {
        errorMessage = 'Not enough vocabulary with audio available!';
        gameState = 'start';
        return;
      }

      // Start game loop
      gameInterval = setInterval(updateGame, 100);

      // Spawn first word immediately
      spawnWord();
    } catch (err) {
      console.error('Failed to start game:', err);
      errorMessage = 'Failed to load vocabulary. Please try again.';
      gameState = 'start';
    }
  }

  function updateGame() {
    timeRemaining = Math.max(0, GAME_DURATION - (Date.now() - gameStartTime));

    if (timeRemaining <= 0) {
      endGame();
      return;
    }

    // Speed up as score increases
    const speedFactor = Math.min(score / 500, 0.7); // Max 70% faster
    wordLifetime = INITIAL_WORD_LIFETIME - (INITIAL_WORD_LIFETIME - MIN_WORD_LIFETIME) * speedFactor;

    // Check if current round has expired (check oldest word in the round)
    if (visibleWords.length > 0) {
      const oldestWord = visibleWords[0];
      const now = Date.now();

      if (now - oldestWord.spawnTime > wordLifetime) {
        // Entire round expired - missed it, reset combo and clear all
        combo = 0;
        visibleWords = [];

        // Spawn new round immediately
        if (gameState === 'playing') {
          setTimeout(() => spawnWord(), 100);
        }
      }
    } else if (gameState === 'playing') {
      // No words visible and game is playing - spawn new round
      spawnWord();
    }
  }

  function spawnWord() {
    if (gameState !== 'playing') return;

    // Clear any existing words before spawning new round
    visibleWords = [];

    // Pick a random target word
    const target = vocabulary[Math.floor(Math.random() * vocabulary.length)];

    // Pick 3 random distractor words
    const distractors = [];
    const used = new Set([target.id]);

    while (distractors.length < 3) {
      const word = vocabulary[Math.floor(Math.random() * vocabulary.length)];
      if (!used.has(word.id)) {
        distractors.push(word);
        used.add(word.id);
      }
    }

    // Shuffle all options
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    // Assign fixed positions 0-3 (always use all 4 boxes)
    const newWords = options.map((word, i) => ({
      ...word,
      position: i, // Fixed positions 0, 1, 2, 3
      spawnTime: Date.now(),
      isTarget: word.id === target.id,
      roundId: Date.now() // Group words from same round
    }));

    visibleWords = [...visibleWords, ...newWords];
    currentWord = target;
    currentAudio = target.audio_url;

    // Play audio
    playAudio(target.audio_url);
  }

  function playAudio(audioUrl) {
    if (window.__amharicAudio) {
      window.__amharicAudio.pause();
      window.__amharicAudio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    window.__amharicAudio = audio;
    audio.play().catch(err => console.error('Audio play failed:', err));
  }

  function clickWord(word) {
    if (gameState !== 'playing') return;

    // Show feedback animation
    feedbackAnimation = word.isTarget ? 'correct' : 'incorrect';

    // Remove all words from this round
    const roundId = word.roundId;
    visibleWords = visibleWords.filter(w => w.roundId !== roundId);

    if (word.isTarget) {
      // Correct!
      correctCount++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);

      // Score: 10 base + combo multiplier
      const comboMultiplier = Math.min(1 + (combo - 1) * 0.1, 3); // Max 3x
      const points = Math.round(10 * comboMultiplier);
      score += points;
    } else {
      // Incorrect
      incorrectCount++;
      combo = 0;
      score = Math.max(0, score - 5); // Lose 5 points
    }

    // Clear feedback and spawn next word after delay
    setTimeout(() => {
      feedbackAnimation = null;
      if (gameState === 'playing') {
        spawnWord();
      }
    }, 600);
  }

  function endGame() {
    gameState = 'gameover';

    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
    if (spawnInterval) {
      clearInterval(spawnInterval);
      spawnInterval = null;
    }

    // Stop any playing audio
    if (window.__amharicAudio) {
      window.__amharicAudio.pause();
      window.__amharicAudio.currentTime = 0;
    }

    // Submit score
    submitScore();
  }

  async function submitScore() {
    try {
      const timeTaken = GAME_DURATION - timeRemaining;
      const accuracy = correctCount + incorrectCount > 0
        ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
        : 0;

      await submitGameScore('whack-a-word', score, timeTaken, {
        correct_count: correctCount,
        total_questions: correctCount + incorrectCount,
        max_combo: maxCombo,
        accuracy,
        difficulty
      });

      await loadLeaderboard();
    } catch (err) {
      console.error('Failed to submit score:', err);
      errorMessage = 'Failed to submit score. Your progress was not saved.';
    }
  }

  function resetGame() {
    gameState = 'start';
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
    if (spawnInterval) {
      clearInterval(spawnInterval);
      spawnInterval = null;
    }
    if (window.__amharicAudio) {
      window.__amharicAudio.pause();
      window.__amharicAudio.currentTime = 0;
    }
  }

  function getGridPosition(position) {
    const cols = 2; // Always 2x2 grid
    const row = Math.floor(position / cols);
    const col = position % cols;
    return { row, col };
  }
</script>

<div class="whack-a-word-page">
  {#if errorMessage}
    <div class="error-banner" role="alert">
      {errorMessage}
      <button class="close-error" onclick={() => errorMessage = ''} aria-label="Close error message">×</button>
    </div>
  {/if}

  {#if gameState === 'start'}
    <div class="start-screen">
      <h1>Whack-a-Word</h1>
      <p class="subtitle">Click the correct English translation as fast as you can!</p>

      <div class="difficulty-selector">
        <h3>Select Difficulty</h3>
        <div class="difficulty-options">
          <button
            class="difficulty-btn"
            class:active={difficulty === 'easy'}
            onclick={() => difficulty = 'easy'}
            aria-pressed={difficulty === 'easy'}
            aria-label="Select easy difficulty"
          >
            <div class="diff-label">Easy</div>
            <div class="diff-desc">Slower pace, common words</div>
          </button>
          <button
            class="difficulty-btn"
            class:active={difficulty === 'medium'}
            onclick={() => difficulty = 'medium'}
            aria-pressed={difficulty === 'medium'}
            aria-label="Select medium difficulty"
          >
            <div class="diff-label">Medium</div>
            <div class="diff-desc">Normal speed, mixed vocab</div>
          </button>
          <button
            class="difficulty-btn"
            class:active={difficulty === 'hard'}
            onclick={() => difficulty = 'hard'}
            aria-pressed={difficulty === 'hard'}
            aria-label="Select hard difficulty"
          >
            <div class="diff-label">Hard</div>
            <div class="diff-desc">Fast pace, all vocabulary</div>
          </button>
        </div>
      </div>

      <button class="start-btn" onclick={startGame}>
        Start Game
      </button>

      {#if personalBest > 0}
        <div class="personal-best">
          Your Best: {personalBest} points
        </div>
      {/if}

      {#if leaderboard.length > 0}
        <div class="leaderboard-preview">
          <h3>Top Scores</h3>
          <div class="leaderboard-list">
            {#each leaderboard.slice(0, 5) as entry, i}
              <div class="leaderboard-entry">
                <span class="rank">#{i + 1}</span>
                <span class="player-name">{entry.username || 'Player'}</span>
                <span class="score">{entry.score} pts</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else if gameState === 'playing'}
    <div class="game-screen">
      <div class="game-header">
        <div class="score-display">
          <div class="score-value">{score}</div>
          <div class="score-label">Score</div>
        </div>

        <div class="timer-display">
          <div class="timer-value" aria-label="Time remaining: {Math.ceil(timeRemaining / 1000)} seconds">{Math.ceil(timeRemaining / 1000)}s</div>
          <div class="timer-bar" role="progressbar" aria-valuenow={Math.ceil((timeRemaining / GAME_DURATION) * 100)} aria-valuemin="0" aria-valuemax="100" aria-label="Time remaining progress">
            <div class="timer-fill" style="width: {(timeRemaining / GAME_DURATION) * 100}%" aria-hidden="true"></div>
          </div>
        </div>

        <div class="combo-display">
          {#if combo > 1}
            <div class="combo-value" class:mega={combo >= 5}>{combo}x</div>
            <div class="combo-label">Combo!</div>
          {:else}
            <div class="combo-label dim">No Combo</div>
          {/if}
        </div>
      </div>

      <div class="audio-prompt">
        <div class="prompt-text">Listen and click the translation:</div>
        {#if currentWord}
          <div class="current-word">
            <div class="word-display">
              <span class="amharic-text">{currentWord.amharic}</span>
              <span class="romanized-text">({currentWord.romanized})</span>
            </div>
            <div class="audio-button-wrapper">
              <AudioButton src={currentWord.audio_url} />
              <span class="audio-label">Replay</span>
            </div>
          </div>
        {/if}
      </div>

      <div class="game-grid">
        {#each visibleWords as word (word.id + '-' + word.spawnTime)}
          {@const pos = getGridPosition(word.position)}
          <button
            class="word-tile"
            class:target={word.isTarget}
            style="grid-row: {pos.row + 1}; grid-column: {pos.col + 1};"
            onclick={() => clickWord(word)}
            aria-label="Select {word.english} as translation"
          >
            <span class="word-text">{word.english}</span>
            <div class="word-timer" style="animation-duration: {wordLifetime}ms;" aria-hidden="true"></div>
          </button>
        {/each}
      </div>

      <div class="stats-bar">
        <span class="stat correct">✓ {correctCount}</span>
        <span class="stat incorrect">✗ {incorrectCount}</span>
        <span class="stat">Max Combo: {maxCombo}x</span>
      </div>

      <!-- Feedback Overlay -->
      {#if feedbackAnimation}
        <div class="feedback-overlay" class:correct={feedbackAnimation === 'correct'} class:incorrect={feedbackAnimation === 'incorrect'}>
          <div class="feedback-content">
            {#if feedbackAnimation === 'correct'}
              <div class="feedback-icon">✓</div>
              <div class="feedback-text">Correct!</div>
            {:else}
              <div class="feedback-icon">✗</div>
              <div class="feedback-text">Wrong!</div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {:else if gameState === 'gameover'}
    <div class="gameover-screen">
      <h1>Game Over!</h1>

      <div class="final-score">
        <div class="score-big">{score}</div>
        <div class="score-label">Final Score</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{correctCount}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{incorrectCount}</div>
          <div class="stat-label">Incorrect</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">
            {correctCount + incorrectCount > 0
              ? Math.round((correctCount / (correctCount + incorrectCount)) * 100)
              : 0}%
          </div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{maxCombo}x</div>
          <div class="stat-label">Max Combo</div>
        </div>
      </div>

      {#if score >= personalBest && score > 0}
        <div class="new-record">
          New Personal Best!
        </div>
      {/if}

      <div class="buttons">
        <button class="play-again-btn" onclick={() => { resetGame(); startGame(); }}>
          Play Again
        </button>
        <button class="menu-btn" onclick={resetGame}>
          Back to Menu
        </button>
      </div>

      {#if leaderboard.length > 0}
        <div class="leaderboard-full">
          <h3>Leaderboard</h3>
          <div class="leaderboard-list">
            {#each leaderboard as entry, i}
              <div class="leaderboard-entry">
                <span class="rank">#{i + 1}</span>
                <span class="player-name">{entry.username || 'Player'}</span>
                <span class="score">{entry.score} pts</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .whack-a-word-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    min-height: calc(100vh - 140px);
  }

  .error-banner {
    position: relative;
    background: rgba(233, 69, 96, 0.1);
    border: 2px solid var(--color-accent-primary);
    border-radius: 12px;
    padding: 1rem 3rem 1rem 1.5rem;
    margin-bottom: 2rem;
    color: var(--color-accent-primary);
    font-weight: 600;
  }

  .close-error {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-accent-primary);
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .close-error:hover {
    background: rgba(233, 69, 96, 0.2);
  }

  /* Start Screen */
  .start-screen {
    text-align: center;
    max-width: 700px;
    margin: 0 auto;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.2rem;
    margin-bottom: 3rem;
  }

  .difficulty-selector {
    margin-bottom: 2rem;
  }

  .difficulty-selector h3 {
    color: var(--color-text-heading);
    margin-bottom: 1rem;
  }

  .difficulty-options {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .difficulty-btn {
    flex: 1;
    max-width: 200px;
    padding: 1.5rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-bg-surface);
    cursor: pointer;
    transition: all 0.2s;
  }

  .difficulty-btn:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-2px);
  }

  .difficulty-btn.active {
    border-color: var(--color-accent-primary);
    background: rgba(233, 69, 96, 0.1);
  }

  .diff-label {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .diff-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .start-btn {
    padding: 1rem 3rem;
    font-size: 1.3rem;
    font-weight: 600;
    background: var(--color-accent-primary);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 2rem;
  }

  .start-btn:hover {
    background: var(--color-accent-orange);
    transform: scale(1.05);
  }

  .personal-best {
    font-size: 1.1rem;
    color: var(--color-accent-orange);
    font-weight: 600;
    margin-bottom: 2rem;
  }

  /* Game Screen */
  .game-screen {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
  }

  .score-display, .combo-display {
    text-align: center;
  }

  .score-value, .combo-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-accent-primary);
  }

  .combo-value.mega {
    color: var(--color-accent-orange);
    animation: pulse-glow 0.5s infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .score-label, .combo-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    font-weight: 600;
  }

  .combo-label.dim {
    opacity: 0.5;
  }

  .timer-display {
    flex: 1;
    text-align: center;
  }

  .timer-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .timer-bar {
    height: 12px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    overflow: hidden;
  }

  .timer-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    transition: width 0.1s linear;
  }

  .audio-prompt {
    text-align: center;
    padding: 1.5rem;
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
  }

  .prompt-text {
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
  }

  .current-word {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .word-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .amharic-text {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-text-heading);
  }

  .romanized-text {
    font-size: 1.3rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .audio-button-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .audio-button-wrapper :global(.audio-btn) {
    width: 50px;
    height: 50px;
  }

  .audio-button-wrapper :global(.audio-btn svg) {
    width: 24px;
    height: 24px;
  }

  .audio-label {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    font-weight: 600;
    text-transform: uppercase;
  }

  .game-grid {
    display: grid;
    grid-template-columns: 280px 280px;
    grid-template-rows: 120px 120px;
    gap: 1rem;
    width: 592px;
    height: 252px;
    margin: 0 auto;
    padding: 1rem;
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
    align-items: stretch;
    justify-items: stretch;
  }

  .word-tile {
    position: relative;
    padding: 0;
    margin: 0;
    border: 2px solid var(--color-border);
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .word-tile:hover {
    border-color: var(--color-accent-primary);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  .word-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #1a1a1a;
    position: relative;
    z-index: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    width: 100%;
    text-align: center;
    padding: 1.5rem 1rem;
  }

  .word-timer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--color-accent-primary);
    animation: shrink linear forwards;
  }

  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }

  .stats-bar {
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 1rem;
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
  }

  .stat {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .stat.correct {
    color: var(--color-accent-green);
  }

  .stat.incorrect {
    color: var(--color-accent-primary);
  }

  /* Feedback Overlay */
  .feedback-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    animation: fadeInOut 0.6s ease-in-out;
  }

  .feedback-overlay.correct {
    background: rgba(16, 185, 129, 0.2);
  }

  .feedback-overlay.incorrect {
    background: rgba(233, 69, 96, 0.2);
  }

  .feedback-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    animation: scaleIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .feedback-icon {
    font-size: 8rem;
    font-weight: 700;
    line-height: 1;
  }

  .feedback-overlay.correct .feedback-icon {
    color: var(--color-accent-green);
  }

  .feedback-overlay.incorrect .feedback-icon {
    color: var(--color-accent-primary);
  }

  .feedback-text {
    font-size: 3rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .feedback-overlay.correct .feedback-text {
    color: var(--color-accent-green);
  }

  .feedback-overlay.incorrect .feedback-text {
    color: var(--color-accent-primary);
  }

  @keyframes fadeInOut {
    0% {
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes scaleIn {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(10deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  /* Game Over Screen */
  .gameover-screen {
    text-align: center;
    max-width: 700px;
    margin: 0 auto;
  }

  .final-score {
    margin: 2rem 0;
  }

  .score-big {
    font-size: 4rem;
    font-weight: 700;
    color: var(--color-accent-primary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin: 2rem 0;
  }

  .stat-card {
    padding: 1.5rem;
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
  }

  .stat-card .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .stat-card .stat-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  .new-record {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-accent-orange);
    margin: 1.5rem 0;
    animation: pulse-glow 1s infinite;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
  }

  .play-again-btn, .menu-btn {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .play-again-btn {
    background: var(--color-accent-primary);
    color: white;
  }

  .play-again-btn:hover {
    background: var(--color-accent-orange);
    transform: scale(1.05);
  }

  .menu-btn {
    background: var(--color-bg-surface);
    color: var(--color-text-heading);
    border: 2px solid var(--color-border);
  }

  .menu-btn:hover {
    border-color: var(--color-accent-primary);
  }

  /* Leaderboard */
  .leaderboard-preview, .leaderboard-full {
    margin-top: 3rem;
  }

  .leaderboard-preview h3, .leaderboard-full h3 {
    color: var(--color-text-heading);
    margin-bottom: 1rem;
  }

  .leaderboard-list {
    background: var(--color-bg-surface);
    border-radius: 12px;
    border: 2px solid var(--color-border);
    overflow: hidden;
  }

  .leaderboard-entry {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .leaderboard-entry:last-child {
    border-bottom: none;
  }

  .rank {
    font-weight: 700;
    color: var(--color-accent-primary);
    min-width: 50px;
  }

  .player-name {
    flex: 1;
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .score {
    color: var(--color-accent-orange);
    font-weight: 700;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .difficulty-options {
      flex-direction: column;
    }

    .difficulty-btn {
      max-width: none;
    }

    .game-grid {
      grid-template-columns: 240px 240px;
      grid-template-rows: 110px 110px;
      width: 512px;
      height: 232px;
      gap: 1rem;
      padding: 1rem;
    }

    .word-text {
      font-size: 1rem;
      line-height: 1.3;
      padding: 1rem 0.75rem;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .game-header {
      flex-wrap: wrap;
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .whack-a-word-page {
      padding: 1rem 0.75rem;
    }

    .game-screen {
      gap: 1rem;
    }

    .game-grid {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 100px 100px;
      width: 100%;
      max-width: 380px;
      height: auto;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .word-text {
      font-size: 0.85rem;
      line-height: 1.3;
      padding: 0.75rem 0.5rem;
    }

    .feedback-icon {
      font-size: 5rem;
    }

    .feedback-text {
      font-size: 2rem;
    }

    .amharic-text {
      font-size: 2rem;
    }

    .romanized-text {
      font-size: 1.1rem;
    }

    .audio-prompt {
      padding: 1rem 0.75rem;
    }

    .game-header {
      padding: 0.75rem;
      gap: 0.5rem;
    }

    .stats-bar {
      padding: 0.75rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .game-header {
      padding: 1rem;
      gap: 1rem;
    }

    .score-value, .combo-value {
      font-size: 2rem;
    }

    .timer-value {
      font-size: 1.5rem;
    }
  }

  /* Extra small phones - for very long sentences */
  @media (max-width: 360px) {
    .whack-a-word-page {
      padding: 0.75rem 0.5rem;
    }

    .game-grid {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 90px 90px;
      width: 100%;
      max-width: 340px;
      height: auto;
      gap: 0.4rem;
      padding: 0.4rem;
    }

    .word-text {
      font-size: 0.75rem;
      line-height: 1.2;
      padding: 0.5rem 0.3rem;
    }

    .feedback-icon {
      font-size: 4rem;
    }

    .feedback-text {
      font-size: 1.5rem;
    }
  }
</style>
