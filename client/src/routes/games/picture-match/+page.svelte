<script>
  import { onMount } from 'svelte';
  import { getPictureMatchCategories, getPictureMatchData, submitGameScore } from '$lib/api.js';
  import { loadProgress } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';

  // Game states
  const SCREEN_CATEGORY = 'category';
  const SCREEN_MODE = 'mode';
  const SCREEN_PLAYING = 'playing';
  const SCREEN_COMPLETE = 'complete';

  let screen = $state(SCREEN_CATEGORY);
  let categories = $state([]);
  let selectedCategory = $state(null);
  let selectedMode = $state(null);
  let gameData = $state(null);
  let loading = $state(false);
  let error = $state(null);

  // Game state
  let items = $state([]);
  let currentIndex = $state(0);
  let score = $state(0);
  let streak = $state(0);
  let bestStreak = $state(0);
  let correctAnswers = $state(0);
  let wrongAnswers = $state(0);
  let startTime = $state(0);
  let elapsedTime = $state(0);
  let timerInterval = $state(null);

  // Match mode state
  let draggedWord = $state(null);
  let selectedWordForTouch = $state(null); // For mobile tap-to-select
  let matchedItems = $state([]);
  let shuffledWords = $state([]);

  // Quiz mode state
  let selectedAnswer = $state(null);
  let showFeedback = $state(false);
  let isCorrect = $state(false);

  // Audio
  let audio = $state(null);

  // Computed
  let currentItem = $derived(items[currentIndex]);
  let progress = $derived((matchedItems.length / items.length) * 100);
  let timeDisplay = $derived(formatTime(elapsedTime));

  onMount(async () => {
    try {
      loading = true;
      error = null;
      const data = await getPictureMatchCategories();
      categories = data;
    } catch (err) {
      console.error('Failed to load categories:', err);
      error = 'Unable to load game categories. Please check your connection and try again.';
    } finally {
      loading = false;
    }
  });

  function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async function selectCategory(category) {
    if (!category.available) return;
    selectedCategory = category;
    screen = SCREEN_MODE;
  }

  async function selectMode(mode) {
    selectedMode = mode;
    try {
      loading = true;
      error = null;
      const data = await getPictureMatchData(selectedCategory.id);

      if (!data || !data.vocabulary || data.vocabulary.length === 0) {
        throw new Error('No vocabulary data available for this category');
      }

      gameData = data;
      items = data.vocabulary;

      if (mode === 'match') {
        setupMatchMode();
      } else {
        setupQuizMode();
      }

      startTime = Date.now();
      timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
      }, 100);

      screen = SCREEN_PLAYING;
    } catch (err) {
      console.error('Failed to load game data:', err);
      error = 'Unable to load game data. Please try a different category or refresh the page.';
      screen = SCREEN_MODE;
    } finally {
      loading = false;
    }
  }

  function setupMatchMode() {
    matchedItems = [];
    shuffledWords = [...items]
      .map(item => ({
        id: item.id,
        romanized: item.romanized,
        amharic: item.amharic,
        audio_url: item.audio_url
      }))
      .sort(() => Math.random() - 0.5);
  }

  function setupQuizMode() {
    currentIndex = 0;
    // Shuffle items for quiz mode
    items = [...items].sort(() => Math.random() - 0.5);
  }

  function handleDragStart(event, word) {
    draggedWord = word;
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event, targetItem) {
    event.preventDefault();
    if (!draggedWord || matchedItems.includes(targetItem.id)) return;

    if (draggedWord.id === targetItem.id) {
      // Correct match
      matchedItems = [...matchedItems, targetItem.id];
      score += 100 + (streak * 10);
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      correctAnswers++;
      playAudio(targetItem.audio_url);

      // Remove matched word from shuffled words
      shuffledWords = shuffledWords.filter(w => w.id !== draggedWord.id);

      if (matchedItems.length === items.length) {
        completeGame();
      }
    } else {
      // Wrong match
      score = Math.max(0, score - 20);
      streak = 0;
      wrongAnswers++;
    }

    draggedWord = null;
  }

  // Touch/click handlers for mobile
  function handleWordChipClick(word) {
    if (selectedWordForTouch?.id === word.id) {
      selectedWordForTouch = null; // Deselect if clicking same word
    } else {
      selectedWordForTouch = word; // Select this word
    }
  }

  function handleItemCardClick(targetItem) {
    if (!selectedWordForTouch || matchedItems.includes(targetItem.id)) return;

    if (selectedWordForTouch.id === targetItem.id) {
      // Correct match
      matchedItems = [...matchedItems, targetItem.id];
      score += 100 + (streak * 10);
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      correctAnswers++;
      playAudio(targetItem.audio_url);

      // Remove matched word from shuffled words
      shuffledWords = shuffledWords.filter(w => w.id !== selectedWordForTouch.id);

      if (matchedItems.length === items.length) {
        completeGame();
      }
    } else {
      // Wrong match
      score = Math.max(0, score - 20);
      streak = 0;
      wrongAnswers++;
    }

    selectedWordForTouch = null; // Clear selection after attempt
  }

  function playAudio(audioUrl) {
    if (!audioUrl) {
      console.warn('No audio URL available for this word');
      return;
    }
    try {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      audio = new Audio(audioUrl);
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
      });
    } catch (err) {
      console.error('Error creating audio:', err);
    }
  }

  function selectQuizAnswer(item) {
    if (showFeedback) return;
    selectedAnswer = item;
  }

  function submitQuizAnswer() {
    if (!selectedAnswer || showFeedback) return;

    isCorrect = selectedAnswer.id === currentItem.id;
    showFeedback = true;

    if (isCorrect) {
      score += 100 + (streak * 10);
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      correctAnswers++;
      playAudio(currentItem.audio_url);
    } else {
      score = Math.max(0, score - 20);
      streak = 0;
      wrongAnswers++;
    }

    setTimeout(() => {
      showFeedback = false;
      selectedAnswer = null;

      if (currentIndex < items.length - 1) {
        currentIndex++;
      } else {
        completeGame();
      }
    }, 1500);
  }

  async function completeGame() {
    clearInterval(timerInterval);

    try {
      const result = await submitGameScore(
        'picture-match',
        score,
        elapsedTime,
        {
          category: selectedCategory.id,
          mode: selectedMode,
          correct: correctAnswers,
          wrong: wrongAnswers,
          best_streak: bestStreak
        }
      );

      if (result.leveled_up) {
        await loadProgress();
      }

      screen = SCREEN_COMPLETE;
    } catch (err) {
      console.error('Failed to save score:', err);
      // Still show completion screen even if score save fails
      screen = SCREEN_COMPLETE;
      // Show a non-blocking notification
      console.warn('Your score could not be saved, but you can still see your results');
    }
  }

  function resetGame() {
    screen = SCREEN_CATEGORY;
    selectedCategory = null;
    selectedMode = null;
    gameData = null;
    items = [];
    currentIndex = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    elapsedTime = 0;
    clearInterval(timerInterval);
  }

  function playAgain() {
    score = 0;
    streak = 0;
    bestStreak = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    elapsedTime = 0;

    if (selectedMode === 'match') {
      setupMatchMode();
    } else {
      setupQuizMode();
    }

    startTime = Date.now();
    timerInterval = setInterval(() => {
      elapsedTime = Date.now() - startTime;
    }, 100);

    screen = SCREEN_PLAYING;
  }
</script>

{#if loading}
  <div class="loading" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p>Loading...</p>
  </div>
{:else if error}
  <div class="error" role="alert">
    <h2>Oops!</h2>
    <p>{error}</p>
    <button onclick={resetGame} aria-label="Return to category selection">Back to Categories</button>
  </div>
{:else if screen === SCREEN_CATEGORY}
  <main class="category-screen">
    <header class="header">
      <h1>Picture Match</h1>
      <p class="subtitle">Match images to Amharic words</p>
    </header>

    <section class="categories-grid" aria-label="Game categories">
      {#each categories as category}
        <button
          class="category-card"
          class:disabled={!category.available}
          onclick={() => selectCategory(category)}
          disabled={!category.available}
          aria-label={`${category.name} category, ${category.word_count} words${!category.available ? ', coming soon' : ''}`}
        >
          <div class="category-icon" aria-hidden="true">
            {#if category.id === 'animals'}
              🐘
            {:else if category.id === 'food'}
              🍞
            {:else if category.id === 'body_parts'}
              ✋
            {:else if category.id === 'colors'}
              🌈
            {:else if category.id === 'clothing'}
              👕
            {:else if category.id === 'household'}
              🏠
            {/if}
          </div>
          <h3>{category.name}</h3>
          <p class="word-count">{category.word_count} words</p>
          {#if !category.available}
            <span class="unavailable">Coming Soon</span>
          {/if}
        </button>
      {/each}
    </section>
  </main>
{:else if screen === SCREEN_MODE}
  <main class="mode-screen">
    <header class="header">
      <h1>Choose Game Mode</h1>
      <p class="subtitle">{selectedCategory.name}</p>
    </header>

    <section class="modes-grid" aria-label="Game modes">
      <button class="mode-card" onclick={() => selectMode('match')} aria-label="Match Mode: Tap or drag Amharic words to match the pictures">
        <div class="mode-icon" aria-hidden="true">🎯</div>
        <h2>Match Mode</h2>
        <p>Tap or drag Amharic words to match the pictures</p>
        <div class="difficulty">Relaxed • No Timer Pressure</div>
      </button>

      <button class="mode-card" onclick={() => selectMode('quiz')} aria-label="Quiz Mode: Click the correct picture for each Amharic word">
        <div class="mode-icon" aria-hidden="true">⚡</div>
        <h2>Quiz Mode</h2>
        <p>Click the correct picture for each Amharic word</p>
        <div class="difficulty">Fast-Paced • Audio Support</div>
      </button>
    </section>

    <button class="back-btn" onclick={() => { screen = SCREEN_CATEGORY; }} aria-label="Back to categories">
      ← Back to Categories
    </button>
  </main>
{:else if screen === SCREEN_PLAYING}
  <main class="game-screen">
    <div class="game-header">
      <div class="stat">
        <span class="label">Score</span>
        <span class="value">{score}</span>
      </div>
      <div class="stat">
        <span class="label">Streak</span>
        <span class="value">{streak}🔥</span>
      </div>
      <div class="stat">
        <span class="label">Time</span>
        <span class="value">{timeDisplay}</span>
      </div>
    </div>

    {#if selectedMode === 'match'}
      <div class="match-mode">
        <div class="progress-bar" role="progressbar" aria-valuenow={matchedItems.length} aria-valuemin="0" aria-valuemax={items.length} aria-label="Match progress">
          <div class="progress-fill" style="width: {progress}%"></div>
          <span class="progress-text">{matchedItems.length} / {items.length}</span>
        </div>

        <div class="match-container">
          <div class="items-grid">
            {#each items as item (item.id)}
              <div
                class="item-card"
                class:matched={matchedItems.includes(item.id)}
                class:clickable={selectedWordForTouch && !matchedItems.includes(item.id)}
                ondragover={handleDragOver}
                ondrop={(e) => handleDrop(e, item)}
                onclick={() => handleItemCardClick(item)}
                role="region"
                aria-label={`Drop zone for ${item.romanized}${matchedItems.includes(item.id) ? ', matched' : ''}`}
              >
                <div class="item-icon" aria-hidden="true">{item.icon}</div>
                {#if matchedItems.includes(item.id)}
                  <div class="item-label">
                    <div class="amharic">{item.amharic}</div>
                    <div class="romanized">{item.romanized}</div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="words-pool">
            <h3>Tap or drag words to match:</h3>
            <div class="words-grid">
              {#each shuffledWords as word (word.id)}
                {@const fullWord = items.find(item => item.id === word.id)}
                <div
                  class="word-chip"
                  class:selected={selectedWordForTouch?.id === word.id}
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, word)}
                  onclick={() => handleWordChipClick(word)}
                  role="button"
                  tabindex="0"
                  aria-label={`Drag or tap ${word.romanized} to match with picture`}
                >
                  <div class="word-chip-content">
                    <div class="word-text">
                      <div class="amharic">{word.amharic}</div>
                      <div class="romanized">{word.romanized}</div>
                    </div>
                    <AudioButton src={fullWord?.audio_url} />
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {:else if selectedMode === 'quiz'}
      <div class="quiz-mode">
        <div class="progress-bar" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin="0" aria-valuemax={items.length} aria-label="Quiz progress">
          <div class="progress-fill" style="width: {((currentIndex + 1) / items.length) * 100}%"></div>
          <span class="progress-text">{currentIndex + 1} / {items.length}</span>
        </div>

        <div class="question-section">
          <h2>Find this word:</h2>
          <div class="word-display">
            <div class="word-with-audio">
              <div class="word-text-quiz">
                <div class="amharic-large">{currentItem.amharic}</div>
                <div class="romanized-large">{currentItem.romanized}</div>
              </div>
              <div class="audio-button-large">
                <AudioButton src={currentItem?.audio_url} />
              </div>
            </div>
          </div>
        </div>

        <div class="quiz-grid">
          {#each items.slice(0, 4) as item (item.id)}
            {@const isSelected = selectedAnswer?.id === item.id}
            {@const isCurrentItem = item.id === currentItem.id}
            <button
              class="quiz-option"
              class:selected={isSelected}
              class:correct={showFeedback && isSelected && isCorrect}
              class:incorrect={showFeedback && isSelected && !isCorrect}
              class:reveal-correct={showFeedback && !isSelected && isCurrentItem}
              onclick={() => selectQuizAnswer(item)}
              disabled={showFeedback}
              aria-label={`Option: ${item.romanized}`}
              aria-pressed={isSelected}
            >
              <div class="option-icon" aria-hidden="true">{item.icon}</div>
              {#if showFeedback}
                <div class="option-label">
                  <div class="romanized-small">{item.romanized}</div>
                </div>
              {/if}
            </button>
          {/each}
        </div>

        {#if !showFeedback}
          <button
            class="submit-btn"
            onclick={submitQuizAnswer}
            disabled={!selectedAnswer}
            aria-label="Submit your answer"
          >
            Submit Answer
          </button>
        {/if}
      </div>
    {/if}
  </main>
{:else if screen === SCREEN_COMPLETE}
  <main class="complete-screen">
    <div class="celebration">
      <div class="trophy">🏆</div>
      <h1>Great Job!</h1>
      <p class="subtitle">You completed {selectedCategory.name}!</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">{score}</div>
        <div class="stat-label">Final Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">{correctAnswers}</div>
        <div class="stat-label">Correct</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-value">{wrongAnswers}</div>
        <div class="stat-label">Incorrect</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-value">{bestStreak}</div>
        <div class="stat-label">Best Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-value">{timeDisplay}</div>
        <div class="stat-label">Time</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💯</div>
        <div class="stat-value">{Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100)}%</div>
        <div class="stat-label">Accuracy</div>
      </div>
    </div>

    <div class="action-buttons">
      <button class="primary-btn" onclick={playAgain} aria-label="Play the same category again">Play Again</button>
      <button class="secondary-btn" onclick={resetGame} aria-label="Go back and choose a new category">Choose New Category</button>
    </div>
  </main>
{/if}

<style>
  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error {
    color: var(--color-accent-red);
  }

  .error h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-accent-red);
  }

  .error p {
    color: var(--color-text-primary);
    margin-bottom: 1rem;
  }

  .error button {
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-accent-primary);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  /* Category Screen */
  .category-screen, .mode-screen, .complete-screen {
    max-width: 1000px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .category-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem 1.5rem;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    text-align: center;
  }

  .category-card:not(.disabled):hover {
    transform: translateY(-4px);
    border-color: var(--color-accent-primary);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.2);
  }

  .category-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .category-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .category-card h3 {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
  }

  .word-count {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .unavailable {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: var(--color-accent-orange);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* Mode Screen */
  .modes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .mode-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    cursor: pointer;
    transition: all 0.3s;
    text-align: center;
  }

  .mode-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent-primary);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.2);
  }

  .mode-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .mode-card h2 {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .mode-card p {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .difficulty {
    color: var(--color-accent-orange);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .back-btn {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .back-btn:hover {
    border-color: var(--color-accent-primary);
  }

  /* Game Screen */
  .game-screen {
    max-width: 1200px;
    margin: 0 auto;
  }

  .game-header {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat .label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat .value {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .progress-bar {
    position: relative;
    height: 40px;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    transition: width 0.3s ease;
  }

  .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-text-heading);
    font-weight: 700;
    font-size: 1rem;
  }

  /* Match Mode */
  .match-container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }

  .item-card {
    aspect-ratio: 1;
    background: var(--color-bg-surface);
    border: 3px dashed var(--color-border);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    transition: all 0.3s;
  }

  .item-card.matched {
    border-style: solid;
    border-color: var(--color-accent-green);
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.2));
    animation: match-pulse 0.5s ease;
  }

  .item-card.clickable {
    cursor: pointer;
    border-color: var(--color-accent-orange);
    border-style: solid;
  }

  .item-card.clickable:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
  }

  @keyframes match-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .item-icon {
    font-size: 3.5rem;
  }

  .item-label {
    text-align: center;
  }

  .amharic {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin-bottom: 0.25rem;
  }

  .romanized {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .words-pool {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 1.5rem;
  }

  .words-pool h3 {
    color: var(--color-text-heading);
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .words-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .word-chip {
    background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-orange));
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    cursor: grab;
    transition: all 0.2s;
  }

  .word-chip:active {
    cursor: grabbing;
    opacity: 0.7;
  }

  .word-chip.selected {
    outline: 4px solid #FFD700;
    outline-offset: 2px;
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(255, 215, 0, 0.5);
  }

  .word-chip-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .word-text {
    flex: 1;
    text-align: left;
  }

  .word-chip .amharic {
    color: white;
    font-size: 1.1rem;
  }

  .word-chip .romanized {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.8rem;
  }

  /* Quiz Mode */
  .question-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .question-section h2 {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .word-display {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
  }

  .word-with-audio {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
  }

  .word-text-quiz {
    text-align: center;
  }

  .amharic-large {
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .romanized-large {
    font-size: 1.5rem;
    color: var(--color-text-secondary);
  }

  .audio-button-large {
    transform: scale(1.5);
  }

  .quiz-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .quiz-option {
    aspect-ratio: 1;
    background: var(--color-bg-surface);
    border: 3px solid var(--color-border);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    cursor: pointer;
    transition: all 0.3s;
  }

  .quiz-option:hover:not(:disabled) {
    border-color: var(--color-accent-primary);
    transform: scale(1.05);
  }

  .quiz-option.selected {
    border-color: var(--color-accent-blue);
    background: rgba(33, 150, 243, 0.1);
  }

  .quiz-option.correct {
    border-color: var(--color-accent-green);
    background: rgba(76, 175, 80, 0.2);
    animation: correct-pulse 0.5s ease;
  }

  .quiz-option.incorrect {
    border-color: var(--color-accent-red);
    background: rgba(244, 67, 54, 0.2);
    animation: shake 0.5s ease;
  }

  .quiz-option.reveal-correct {
    border-color: var(--color-accent-green);
    background: rgba(76, 175, 80, 0.1);
  }

  @keyframes correct-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  .option-icon {
    font-size: 4rem;
  }

  .option-label .romanized-small {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .submit-btn {
    width: 100%;
    background: var(--color-accent-primary);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 700;
    font-size: 1.1rem;
    transition: all 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
    transform: translateY(-2px);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Complete Screen */
  .celebration {
    text-align: center;
    margin-bottom: 3rem;
  }

  .trophy {
    font-size: 6rem;
    animation: bounce 1s ease infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .stat-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 1.5rem;
    text-align: center;
  }

  .stat-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    color: var(--color-text-heading);
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .primary-btn, .secondary-btn {
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn {
    background: var(--color-accent-primary);
    color: white;
    border: none;
  }

  .primary-btn:hover {
    background: var(--color-accent-primary-hover);
    transform: translateY(-2px);
  }

  .secondary-btn {
    background: var(--color-bg-surface);
    color: var(--color-text-primary);
    border: 2px solid var(--color-border);
  }

  .secondary-btn:hover {
    border-color: var(--color-accent-primary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .match-container {
      grid-template-columns: 1fr;
    }

    .words-pool {
      order: -1;
    }

    .items-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }

    .quiz-grid {
      grid-template-columns: 1fr;
    }

    .amharic-large {
      font-size: 2rem;
    }

    .romanized-large {
      font-size: 1.2rem;
    }

    .action-buttons {
      flex-direction: column;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
