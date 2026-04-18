<script>
  import { onMount } from 'svelte';
  import { getDailyChallenge, completeDailyChallenge } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';

  let loading = $state(true);
  let challenge = $state(null);
  let completed = $state(false);
  let currentQuestion = $state(0);
  let answers = $state([]);
  let selectedAnswer = $state(null);
  let showFeedback = $state(false);
  let startTime = $state(null);
  let timer = $state(0);
  let timerInterval = $state(null);
  let result = $state(null);
  let showCompletion = $state(false);

  // Memory game state
  let memoryCards = $state([]);
  let flippedIndices = $state([]);
  let matchedPairs = $state([]);
  let memoryMoves = $state(0);

  // Speed typing state
  let typedText = $state('');
  let typingStartTime = $state(null);
  let currentWordIndex = $state(0);

  // Flashcard state
  let flashcardFlipped = $state(false);
  let flashcardIndex = $state(0);
  let error = $state(null);

  onMount(async () => {
    try {
      const data = await getDailyChallenge();
      if (!data) {
        error = 'Failed to load challenge. Please make sure you are logged in.';
        loading = false;
        return;
      }
      challenge = data;
      completed = data.completed;
      loading = false;

      if (!completed && data.challenge_type) {
        startChallenge();
      }
    } catch (err) {
      console.error('Error loading daily challenge:', err);
      error = err.message || 'Failed to load challenge. Please try again later.';
      loading = false;
    }
  });

  function startChallenge() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
      timer = Math.floor((Date.now() - startTime) / 1000);
    }, 1000);

    if (challenge.challenge_type === 'memory') {
      initMemoryGame();
    }
  }

  function initMemoryGame() {
    const pairs = challenge.data.slice(0, 8);
    const cards = [];
    pairs.forEach((item, idx) => {
      cards.push({
        id: idx * 2,
        type: 'romanized',
        text: item.romanized,
        pairId: idx,
        audio_url: item.audio_url,
        amharic: item.amharic
      });
      cards.push({
        id: idx * 2 + 1,
        type: 'english',
        text: item.english,
        pairId: idx
      });
    });
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    memoryCards = cards;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getDayOfMonth(dateStr) {
    return new Date(dateStr).getDate();
  }

  function isToday(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Calendar generation
  let calendarDays = $derived.by(() => {
    if (!challenge) return [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = challenge.calendar?.some(d => d.date === dateStr);
      days.push({ day, date: dateStr, completed: isCompleted, isToday: isToday(dateStr) });
    }
    return days;
  });

  let monthName = $derived.by(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
  });

  // Quiz handlers
  function selectAnswer(answer) {
    if (showFeedback) return;
    selectedAnswer = answer;
    showFeedback = true;
    const current = challenge.data[currentQuestion];
    answers.push({
      question_id: current.id,
      user_answer: answer,
      correct_answer: current.correct_answer
    });
  }

  function nextQuestion() {
    if (currentQuestion < challenge.data.length - 1) {
      currentQuestion++;
      selectedAnswer = null;
      showFeedback = false;
    } else {
      finishChallenge();
    }
  }

  // Flashcard handlers
  function flipFlashcard() {
    flashcardFlipped = !flashcardFlipped;
  }

  function nextFlashcard() {
    if (flashcardIndex < challenge.data.length - 1) {
      flashcardIndex++;
      flashcardFlipped = false;
    } else {
      finishChallenge();
    }
  }

  // Memory game handlers
  function flipMemoryCard(index) {
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    if (matchedPairs.includes(memoryCards[index].pairId)) return;

    flippedIndices = [...flippedIndices, index];

    if (flippedIndices.length === 2) {
      memoryMoves++;
      const [first, second] = flippedIndices;
      const card1 = memoryCards[first];
      const card2 = memoryCards[second];

      if (card1.pairId === card2.pairId) {
        matchedPairs = [...matchedPairs, card1.pairId];
        setTimeout(() => {
          flippedIndices = [];
          if (matchedPairs.length === 8) {
            finishChallenge();
          }
        }, 500);
      } else {
        setTimeout(() => {
          flippedIndices = [];
        }, 1000);
      }
    }
  }

  // Speed typing handlers
  function handleTyping(e) {
    if (!typingStartTime) {
      typingStartTime = Date.now();
    }

    const currentWord = challenge.data[currentWordIndex];
    if (e.target.value === currentWord.romanized) {
      if (currentWordIndex < challenge.data.length - 1) {
        currentWordIndex++;
        typedText = '';
      } else {
        finishChallenge();
      }
    }
  }

  async function finishChallenge() {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const timeTaken = Date.now() - startTime;
    let score = 0;

    if (challenge.challenge_type === 'quiz') {
      score = answers.filter(a => a.user_answer === a.correct_answer).length;
    } else if (challenge.challenge_type === 'flashcard') {
      score = flashcardIndex + 1;
    } else if (challenge.challenge_type === 'listening') {
      score = answers.filter(a => a.user_answer === a.correct_answer).length;
    } else if (challenge.challenge_type === 'speed-typing') {
      score = currentWordIndex + 1;
    } else if (challenge.challenge_type === 'memory') {
      score = matchedPairs.length;
    }

    try {
      const data = await completeDailyChallenge(score, timeTaken);
      result = data;
      showCompletion = true;

      if (data.leveled_up) {
        await loadProgress();
        triggerLevelUp();
      } else {
        await loadProgress();
      }
    } catch (err) {
      console.error('Error completing challenge:', err);
      error = err.message || 'Failed to save your progress. Please try again.';
    }
  }

  /**
   * Share streak functionality using Web Share API
   *
   * What it does:
   * - Uses the native Web Share API (navigator.share) to share the user's streak
   * - Shares a text message with the current streak count and a link to the app
   * - Opens the device's native share sheet (SMS, WhatsApp, Twitter, etc.)
   * - Falls back to clipboard copy if Web Share API is not supported
   *
   * Supported platforms:
   * - Mobile: iOS Safari, Android Chrome (native share sheet)
   * - Desktop: Limited support, most browsers fall back to clipboard
   *
   * Error handling:
   * - User canceling the share dialog is silently ignored (not an error)
   * - Only logs actual errors (not AbortError from user cancellation)
   */
  async function shareStreak() {
    const text = `I've completed ${challenge.current_streak} days in a row on Amharic Class! Join me in learning Amharic!`;

    // Web Share API is available (mobile browsers, some desktop)
    if (navigator.share) {
      try {
        await navigator.share({ text, url: window.location.origin });
        // Share successful (no UI feedback needed)
      } catch (err) {
        // User canceled the share dialog - this is normal behavior, not an error
        // AbortError is thrown when user dismisses the share sheet
        if (err.name !== 'AbortError') {
          // Only log actual errors (not user cancellation)
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback for browsers without Web Share API support
      try {
        await navigator.clipboard.writeText(text);
        alert('Streak message copied to clipboard!');
      } catch (err) {
        console.error('Error copying to clipboard:', err);
        alert('Unable to copy. Please try again.');
      }
    }
  }

  let challengeTitle = $derived.by(() => {
    if (!challenge) return '';
    const types = {
      quiz: 'Quiz Challenge',
      flashcard: 'Flashcard Challenge',
      listening: 'Listening Challenge',
      'speed-typing': 'Speed Typing',
      memory: 'Memory Match'
    };
    return types[challenge.challenge_type] || 'Daily Challenge';
  });

  let currentQuizQuestion = $derived(challenge?.data?.[currentQuestion]);
  let currentFlashcard = $derived(challenge?.data?.[flashcardIndex]);
  let currentTypingWord = $derived(challenge?.data?.[currentWordIndex]);
  let isCorrect = $derived(selectedAnswer === currentQuizQuestion?.correct_answer);
</script>

<div class="daily-challenge">
  {#if loading}
    <div class="loading">Loading today's challenge...</div>
  {:else if error}
    <div class="error-screen">
      <div class="error-icon">⚠️</div>
      <h1>Oops!</h1>
      <p>{error}</p>
      <a href="/games" class="back-btn">Back to Games</a>
    </div>
  {:else if showCompletion && result}
    <div class="completion-screen">
      <div class="completion-icon">
        {#if result.perfect}
          <span class="star-icon">⭐</span>
        {:else}
          <span class="check-icon">✓</span>
        {/if}
      </div>
      <h1>Challenge Complete!</h1>
      <div class="completion-stats">
        <div class="stat">
          <div class="stat-value">{result.score}/{challenge.data.length}</div>
          <div class="stat-label">Score</div>
        </div>
        <div class="stat">
          <div class="stat-value">{formatTime(timer)}</div>
          <div class="stat-label">Time</div>
        </div>
        <div class="stat">
          <div class="stat-value">+{result.xp_earned}</div>
          <div class="stat-label">XP</div>
        </div>
      </div>
      {#if result.perfect}
        <div class="perfect-badge">PERFECT! +10 bonus XP</div>
      {/if}
      <div class="streak-display">
        <span class="fire">🔥</span>
        <span class="streak-number">{result.new_streak}</span>
        <span class="streak-label">day streak!</span>
      </div>
      <button class="share-btn" onclick={shareStreak}>Share Your Streak</button>
      <a href="/games" class="back-btn">Back to Games</a>
    </div>
  {:else if completed}
    <div class="already-completed">
      <div class="check-circle">✓</div>
      <h1>Challenge Complete!</h1>
      <p>You've already completed today's challenge.</p>
      <div class="streak-display">
        <span class="fire">🔥</span>
        <span class="streak-number">{challenge.current_streak}</span>
        <span class="streak-label">day streak</span>
      </div>
      <p class="comeback-msg">Come back tomorrow for a new challenge!</p>
      <button class="share-btn" onclick={shareStreak}>Share Your Streak</button>

      <div class="calendar-section">
        <h2>{monthName} Progress</h2>
        <div class="calendar">
          <div class="calendar-header">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div class="calendar-grid">
            {#each calendarDays as day}
              {#if day === null}
                <div class="calendar-day empty"></div>
              {:else}
                <div class="calendar-day" class:completed={day.completed} class:today={day.isToday}>
                  <span class="day-number">{day.day}</span>
                  {#if day.completed}
                    <span class="check-mark">✓</span>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <a href="/games" class="back-btn">Back to Games</a>
    </div>
  {:else if challenge.challenge_type === 'quiz'}
    <div class="challenge-header">
      <a href="/games" class="back">&larr; Games</a>
      <h1>{challengeTitle}</h1>
      <div class="header-stats">
        <div class="streak-badge">
          <span class="fire">🔥</span> {challenge.current_streak}
        </div>
        <div class="timer">⏱️ {formatTime(timer)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {((currentQuestion + 1) / challenge.data.length) * 100}%"></div>
      </div>
      <span class="progress-text">Question {currentQuestion + 1} of {challenge.data.length}</span>
    </div>

    <div class="question-card">
      <div class="question-header">
        <p class="question-text">{currentQuizQuestion.question}</p>
        {#if currentQuizQuestion.audio_url}
          <AudioButton src={currentQuizQuestion.audio_url} />
        {/if}
      </div>
      <div class="options">
        {#each currentQuizQuestion.options as option, i}
          <button
            class="option"
            class:selected={selectedAnswer === option}
            class:correct={showFeedback && option === currentQuizQuestion.correct_answer}
            class:wrong={showFeedback && selectedAnswer === option && option !== currentQuizQuestion.correct_answer}
            onclick={() => selectAnswer(option)}
            disabled={showFeedback}
          >
            <span class="option-num">{i + 1}</span>
            {option}
          </button>
        {/each}
      </div>

      {#if showFeedback}
        <div class="feedback" class:correct={isCorrect} class:wrong={!isCorrect}>
          {isCorrect ? 'Correct!' : `The answer was: ${currentQuizQuestion.correct_answer}`}
        </div>
      {/if}
    </div>

    {#if showFeedback}
      <div class="actions">
        <button class="btn btn-primary" onclick={nextQuestion}>
          {currentQuestion === challenge.data.length - 1 ? 'Finish' : 'Next'} &rarr;
        </button>
      </div>
    {/if}

  {:else if challenge.challenge_type === 'flashcard'}
    <div class="challenge-header">
      <a href="/games" class="back">&larr; Games</a>
      <h1>{challengeTitle}</h1>
      <div class="header-stats">
        <div class="streak-badge">
          <span class="fire">🔥</span> {challenge.current_streak}
        </div>
        <div class="timer">⏱️ {formatTime(timer)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {((flashcardIndex + 1) / challenge.data.length) * 100}%"></div>
      </div>
      <span class="progress-text">Card {flashcardIndex + 1} of {challenge.data.length}</span>
    </div>

    <div class="flashcard-container">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="flashcard" class:flipped={flashcardFlipped} onclick={flipFlashcard}>
        <div class="flashcard-front">
          <div class="flashcard-label">English</div>
          <div class="flashcard-text">{currentFlashcard.english}</div>
          <div class="flip-hint">Tap to flip</div>
        </div>
        <div class="flashcard-back">
          <div class="flashcard-label">Amharic</div>
          <div class="flashcard-text-romanized">{currentFlashcard.romanized}</div>
          <div class="flashcard-text-amharic">{currentFlashcard.amharic}</div>
          {#if currentFlashcard.audio_url}
            <div class="flashcard-audio">
              <AudioButton src={currentFlashcard.audio_url} />
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick={nextFlashcard}>
        {flashcardIndex === challenge.data.length - 1 ? 'Finish' : 'Next Card'} &rarr;
      </button>
    </div>

  {:else if challenge.challenge_type === 'listening'}
    <div class="challenge-header">
      <a href="/games" class="back">&larr; Games</a>
      <h1>{challengeTitle}</h1>
      <div class="header-stats">
        <div class="streak-badge">
          <span class="fire">🔥</span> {challenge.current_streak}
        </div>
        <div class="timer">⏱️ {formatTime(timer)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {((currentQuestion + 1) / challenge.data.length) * 100}%"></div>
      </div>
      <span class="progress-text">Question {currentQuestion + 1} of {challenge.data.length}</span>
    </div>

    <div class="question-card">
      <p class="listen-prompt">Listen and choose the correct English meaning:</p>
      <div class="audio-area">
        <AudioButton src={currentQuizQuestion.audio_url} />
        <span class="play-hint">Tap to play</span>
      </div>

      <div class="options">
        {#each currentQuizQuestion.options as option, i}
          <button
            class="option"
            class:selected={selectedAnswer === option}
            class:correct={showFeedback && option === currentQuizQuestion.correct_answer}
            class:wrong={showFeedback && selectedAnswer === option && option !== currentQuizQuestion.correct_answer}
            onclick={() => selectAnswer(option)}
            disabled={showFeedback}
          >
            <span class="option-num">{i + 1}</span>
            {option}
          </button>
        {/each}
      </div>

      {#if showFeedback}
        <div class="feedback" class:correct={isCorrect} class:wrong={!isCorrect}>
          {isCorrect ? 'Correct!' : `The answer was: ${currentQuizQuestion.correct_answer}`}
          <div class="feedback-detail">
            <span class="fd-romanized">{currentQuizQuestion.romanized}</span>
            <span class="fd-amharic">{currentQuizQuestion.amharic}</span>
          </div>
        </div>
      {/if}
    </div>

    {#if showFeedback}
      <div class="actions">
        <button class="btn btn-primary" onclick={nextQuestion}>
          {currentQuestion === challenge.data.length - 1 ? 'Finish' : 'Next'} &rarr;
        </button>
      </div>
    {/if}

  {:else if challenge.challenge_type === 'speed-typing'}
    <div class="challenge-header">
      <a href="/games" class="back">&larr; Games</a>
      <h1>{challengeTitle}</h1>
      <div class="header-stats">
        <div class="streak-badge">
          <span class="fire">🔥</span> {challenge.current_streak}
        </div>
        <div class="timer">⏱️ {formatTime(timer)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {((currentWordIndex + 1) / challenge.data.length) * 100}%"></div>
      </div>
      <span class="progress-text">Word {currentWordIndex + 1} of {challenge.data.length}</span>
    </div>

    <div class="typing-container">
      <div class="typing-word">
        <div class="word-english">{currentTypingWord.english}</div>
        <div class="word-amharic-row">
          <div class="word-amharic">{currentTypingWord.amharic}</div>
          {#if currentTypingWord.audio_url}
            <AudioButton src={currentTypingWord.audio_url} />
          {/if}
        </div>
      </div>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        class="typing-input"
        bind:value={typedText}
        oninput={handleTyping}
        placeholder="Type the romanized word..."
        autofocus
      />
      <div class="typing-hint">Type: {currentTypingWord.romanized}</div>
    </div>

  {:else if challenge.challenge_type === 'memory'}
    <div class="challenge-header">
      <a href="/games" class="back">&larr; Games</a>
      <h1>{challengeTitle}</h1>
      <div class="header-stats">
        <div class="streak-badge">
          <span class="fire">🔥</span> {challenge.current_streak}
        </div>
        <div class="timer">⏱️ {formatTime(timer)} | Moves: {memoryMoves}</div>
      </div>
    </div>

    <div class="memory-grid">
      {#each memoryCards as card, index}
        <button
          class="memory-card"
          class:flipped={flippedIndices.includes(index) || matchedPairs.includes(card.pairId)}
          class:matched={matchedPairs.includes(card.pairId)}
          onclick={() => flipMemoryCard(index)}
          disabled={matchedPairs.includes(card.pairId)}
        >
          <div class="memory-card-back">?</div>
          <div class="memory-card-front" class:romanized={card.type === 'romanized'} class:english={card.type === 'english'}>
            <div class="memory-card-text">{card.text}</div>
            {#if card.type === 'romanized' && card.audio_url}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="memory-card-audio" onclick={(e) => e.stopPropagation()}>
                <AudioButton src={card.audio_url} />
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .daily-challenge {
    max-width: 700px;
    margin: 0 auto;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
    font-size: 1.1rem;
  }

  .challenge-header {
    margin-bottom: 1.5rem;
  }

  .back {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    display: inline-block;
    margin-bottom: 0.5rem;
  }

  .back:hover {
    color: var(--color-text-heading);
  }

  .challenge-header h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin-bottom: 0.75rem;
  }

  .header-stats {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .streak-badge {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-orange);
    border-radius: 20px;
    padding: 0.4rem 1rem;
    font-weight: 600;
    color: var(--color-accent-orange);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .fire {
    font-size: 1.2rem;
  }

  .timer {
    color: var(--color-text-secondary);
    font-weight: 600;
  }

  .progress-bar {
    height: 6px;
    background: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    transition: width 0.3s ease;
  }

  .progress-text {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .question-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .question-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .question-text {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    font-weight: 600;
    text-align: center;
  }

  .listen-prompt {
    color: var(--color-text-secondary);
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .audio-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .play-hint {
    color: var(--color-text-muted);
    font-size: 0.8rem;
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
    transition: all 0.2s;
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

  .option:hover:not(:disabled) {
    border-color: var(--color-accent-primary);
  }

  .option.selected {
    border-color: var(--color-accent-primary);
    background: rgba(233, 69, 96, 0.1);
  }

  .option.correct {
    border-color: var(--color-accent-green);
    background: rgba(76, 175, 80, 0.15);
  }

  .option.wrong {
    border-color: var(--color-accent-red);
    background: rgba(244, 67, 54, 0.15);
  }

  .feedback {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 10px;
    font-weight: 600;
    text-align: center;
    animation: slideIn 0.3s ease;
  }

  .feedback.correct {
    background: rgba(76, 175, 80, 0.15);
    color: var(--color-accent-green);
  }

  .feedback.wrong {
    background: rgba(244, 67, 54, 0.15);
    color: var(--color-accent-red);
  }

  .feedback-detail {
    margin-top: 0.5rem;
    font-weight: 400;
    font-size: 0.9rem;
  }

  .fd-romanized {
    color: var(--color-accent-primary);
    font-weight: 600;
    margin-right: 0.5rem;
  }

  .fd-amharic {
    color: var(--color-text-secondary);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-primary:hover {
    background: var(--color-accent-primary-hover);
    transform: translateY(-2px);
  }

  /* Flashcard styles */
  .flashcard-container {
    perspective: 1000px;
    margin-bottom: 2rem;
  }

  .flashcard {
    position: relative;
    width: 100%;
    height: 350px;
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.6s;
  }

  .flashcard.flipped {
    transform: rotateY(180deg);
  }

  .flashcard-front,
  .flashcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .flashcard-back {
    transform: rotateY(180deg);
  }

  .flashcard-label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .flashcard-text {
    color: var(--color-text-heading);
    font-size: 2.5rem;
    font-weight: 700;
    text-align: center;
  }

  .flashcard-text-romanized {
    color: var(--color-accent-primary);
    font-size: 2rem;
    font-weight: 700;
  }

  .flashcard-text-amharic {
    color: var(--color-text-heading);
    font-size: 2.5rem;
  }

  .flip-hint {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    margin-top: 1rem;
  }

  .flashcard-audio {
    margin-top: 1rem;
  }

  /* Speed typing styles */
  .typing-container {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .typing-word {
    margin-bottom: 2rem;
  }

  .word-english {
    color: var(--color-text-heading);
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .word-amharic-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .word-amharic {
    color: var(--color-text-secondary);
    font-size: 1.5rem;
  }

  .typing-input {
    width: 100%;
    max-width: 400px;
    padding: 1rem;
    font-size: 1.3rem;
    text-align: center;
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-heading);
    margin-bottom: 1rem;
  }

  .typing-input:focus {
    outline: none;
    border-color: var(--color-accent-primary);
  }

  .typing-hint {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  /* Memory game styles */
  .memory-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .memory-card {
    aspect-ratio: 1;
    position: relative;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    cursor: pointer;
    transform-style: preserve-3d;
    transition: transform 0.3s;
    font-size: 1rem;
    font-weight: 600;
  }

  .memory-card:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .memory-card.flipped {
    transform: rotateY(180deg);
  }

  .memory-card.matched {
    opacity: 0.5;
    pointer-events: none;
  }

  .memory-card-back,
  .memory-card-front {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    padding: 0.5rem;
    text-align: center;
    word-break: break-word;
  }

  .memory-card-back {
    background: var(--color-accent-primary);
    color: #fff;
    font-size: 2rem;
  }

  .memory-card-front {
    transform: rotateY(180deg);
    background: var(--color-bg-elevated);
    color: var(--color-text-heading);
    flex-direction: column;
    gap: 0.5rem;
  }

  .memory-card-text {
    text-align: center;
  }

  .memory-card-front.romanized {
    color: var(--color-accent-primary);
  }

  .memory-card-front.english {
    color: var(--color-text-heading);
  }

  .memory-card-audio {
    display: flex;
    justify-content: center;
  }

  /* Completion screen */
  .completion-screen {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .completion-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
    animation: bounce 0.6s ease;
  }

  .star-icon {
    color: var(--color-accent-orange);
  }

  .check-icon {
    color: var(--color-accent-green);
  }

  .completion-screen h1 {
    color: var(--color-text-heading);
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }

  .completion-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    color: var(--color-accent-primary);
    font-size: 2rem;
    font-weight: 700;
  }

  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .perfect-badge {
    background: linear-gradient(90deg, var(--color-accent-orange), var(--color-accent-primary));
    color: #fff;
    padding: 0.5rem 1.5rem;
    border-radius: 20px;
    display: inline-block;
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    animation: pulse 1s infinite;
  }

  .streak-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 1.5rem 0;
    font-size: 1.5rem;
  }

  .streak-number {
    color: var(--color-accent-orange);
    font-size: 3rem;
    font-weight: 700;
  }

  .streak-label {
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .share-btn {
    background: var(--color-accent-blue);
    color: #fff;
    padding: 0.75rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
    transition: all 0.2s;
  }

  .share-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
  }

  .back-btn {
    display: inline-block;
    margin-top: 1.5rem;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.95rem;
  }

  .back-btn:hover {
    color: var(--color-text-heading);
  }

  /* Error screen */
  .error-screen {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .error-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
  }

  .error-screen h1 {
    color: var(--color-text-heading);
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .error-screen p {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
  }

  /* Already completed screen */
  .already-completed {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .check-circle {
    width: 120px;
    height: 120px;
    background: var(--color-accent-green);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5rem;
    color: #fff;
    margin: 0 auto 1.5rem;
    animation: scaleIn 0.5s ease;
  }

  .already-completed h1 {
    color: var(--color-text-heading);
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .already-completed p {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }

  .comeback-msg {
    color: var(--color-accent-primary);
    font-weight: 600;
  }

  /* Calendar */
  .calendar-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--color-border);
  }

  .calendar-section h2 {
    color: var(--color-text-heading);
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }

  .calendar {
    max-width: 400px;
    margin: 0 auto;
  }

  .calendar-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .calendar-header div {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
  }

  .calendar-day {
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    position: relative;
    font-size: 0.85rem;
  }

  .calendar-day.empty {
    background: transparent;
    border: none;
  }

  .calendar-day.completed {
    background: rgba(76, 175, 80, 0.2);
    border-color: var(--color-accent-green);
  }

  .calendar-day.today {
    border: 2px solid var(--color-accent-primary);
    font-weight: 700;
  }

  .day-number {
    color: var(--color-text-heading);
  }

  .check-mark {
    color: var(--color-accent-green);
    font-size: 1rem;
    position: absolute;
    bottom: 2px;
    right: 2px;
  }

  /* Animations */
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }

  @media (max-width: 640px) {
    .completion-stats {
      flex-direction: column;
      gap: 1rem;
    }

    .memory-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }

    .memory-card {
      font-size: 0.7rem;
    }

    .memory-card-text {
      font-size: 0.7rem;
    }

    .challenge-header h1 {
      font-size: 1.5rem;
    }

    .question-text {
      font-size: 1.1rem;
    }

    .flashcard {
      height: 300px;
    }

    .flashcard-text {
      font-size: 2rem;
    }

    .word-english {
      font-size: 1.5rem;
    }

    .word-amharic {
      font-size: 1.2rem;
    }

    .word-amharic-row {
      gap: 0.5rem;
    }
  }

  @media (max-width: 480px) {
    .memory-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .memory-card {
      font-size: 0.75rem;
      min-height: 80px;
    }

    .memory-card-text {
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .question-options {
      grid-template-columns: 1fr;
    }

    .answer-option {
      padding: 1.25rem;
      min-height: 60px;
    }
  }
</style>
