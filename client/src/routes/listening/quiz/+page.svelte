<script>
  import { page } from '$app/stores';
  import { getListeningQuiz, submitListeningQuiz } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { onMount } from 'svelte';

  let questions = $state([]);
  let loading = $state(true);
  let currentQ = $state(0);
  let answers = $state([]);
  let selectedAnswer = $state(null);
  let showFeedback = $state(false);
  let result = $state(null);

  let lessonId = $derived($page.url.searchParams.get('lesson_id'));

  onMount(async () => {
    questions = await getListeningQuiz(lessonId);
    loading = false;
  });

  let current = $derived(questions[currentQ]);
  let progress = $derived(questions.length > 0 ? (currentQ / questions.length) * 100 : 0);
  let isCorrect = $derived(selectedAnswer === current?.correct_answer);

  function selectAnswer(answer) {
    if (showFeedback) return;
    selectedAnswer = answer;
    showFeedback = true;
    answers.push({
      vocab_id: current.vocab_id,
      lesson_id: current.lesson_id,
      user_answer: answer,
      correct_answer: current.correct_answer,
      romanized: current.romanized,
      amharic: current.amharic
    });
  }

  async function nextQuestion() {
    if (currentQ < questions.length - 1) {
      currentQ++;
      selectedAnswer = null;
      showFeedback = false;
    } else {
      result = await submitListeningQuiz(answers);
      if (result.leveled_up) {
        await loadProgress();
        triggerLevelUp();
      } else {
        await loadProgress();
      }
    }
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (loading || result || !current) return;

    if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!showFeedback) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= current.options.length) {
        e.preventDefault();
        e.stopPropagation();
        selectAnswer(current.options[num - 1]);
        return;
      }
    }

    if (e.key === 'Enter' && showFeedback) {
      e.preventDefault();
      e.stopPropagation();
      nextQuestion();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="listening-quiz">
  {#if loading}
    <div class="loading">Loading listening quiz...</div>
  {:else if questions.length === 0}
    <div class="empty">
      <h2>Not enough vocabulary</h2>
      <p>This lesson needs at least 4 words with audio for a listening quiz.</p>
      <a href="/listening" class="btn btn-secondary">Back</a>
    </div>
  {:else if result}
    <div class="result-card">
      <div class="result-icon">
        {#if result.percentage >= 80}&#9733;{:else if result.percentage >= 50}&#9734;{:else}&#10060;{/if}
      </div>
      <h2>Listening Quiz Complete!</h2>
      <div class="score">{result.score}/{result.total}</div>
      <div class="percentage">{result.percentage}%</div>
      {#if result.perfect}
        <div class="perfect-badge">PERFECT EARS! +15 bonus XP</div>
      {/if}
      <div class="xp-earned">+{result.xp_earned} XP</div>

      <div class="result-breakdown">
        {#each result.results as r}
          <div class="result-item" class:correct={r.correct} class:wrong={!r.correct}>
            <span class="result-indicator">{r.correct ? '&#10003;' : '&#10060;'}</span>
            <span class="result-word">{r.romanized}</span>
            {#if !r.correct}
              <span class="result-answer">{r.correct_answer}</span>
            {/if}
          </div>
        {/each}
      </div>

      <div class="result-actions">
        <a href="/listening/quiz{lessonId ? `?lesson_id=${lessonId}` : ''}" class="btn btn-primary"
          onclick={(e) => { e.preventDefault(); location.reload(); }}>
          Retry
        </a>
        <a href="/listening" class="btn btn-secondary">All Quizzes</a>
      </div>
    </div>
  {:else}
    <div class="quiz-header">
      <a href="/listening" class="back">&larr; Listening</a>
      <h1>Listening Quiz</h1>
      <div class="quiz-progress">
        <div class="quiz-progress-fill" style="width: {progress}%"></div>
      </div>
      <span class="quiz-count">Question {currentQ + 1} of {questions.length}</span>
    </div>

    <div class="question-card">
      <p class="listen-prompt">Listen and choose the correct English meaning:</p>

      <div class="audio-area">
        <AudioButton src={current.audio_url} size="large" />
        <span class="play-hint">Tap to play</span>
      </div>

      <div class="options">
        {#each current.options as option, i}
          <button
            class="option"
            class:selected={selectedAnswer === option}
            class:correct={showFeedback && option === current.correct_answer}
            class:wrong={showFeedback && selectedAnswer === option && option !== current.correct_answer}
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
          {#if isCorrect}
            Correct!
          {:else}
            The answer was: {current.correct_answer}
          {/if}
          <div class="feedback-detail">
            <span class="fd-romanized">{current.romanized}</span>
            <span class="fd-amharic">{current.amharic}</span>
          </div>
        </div>
      {/if}
    </div>

    <div class="quiz-actions">
      {#if showFeedback}
        <button class="btn btn-primary" onclick={nextQuestion}>
          {currentQ === questions.length - 1 ? 'See Results' : 'Next'} &rarr;
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .listening-quiz {
    max-width: 600px;
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

  .empty h2 { color: var(--color-text-heading); margin-bottom: 0.5rem; }

  .back {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover { color: var(--color-text-heading); }

  .quiz-header { margin-bottom: 1.5rem; }

  .quiz-header h1 {
    color: var(--color-text-heading);
    font-size: 1.4rem;
    margin: 0.5rem 0;
  }

  .quiz-progress {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .quiz-progress-fill {
    height: 100%;
    background: var(--color-accent-primary);
    transition: width 0.3s ease;
  }

  .quiz-count {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .question-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1rem;
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

  .option:hover:not(:disabled) { border-color: var(--color-accent-primary); }
  .option.selected { border-color: var(--color-accent-primary); background: rgba(233, 69, 96, 0.1); }
  .option.correct { border-color: var(--color-accent-green); background: rgba(76, 175, 80, 0.15); }
  .option.wrong { border-color: var(--color-accent-red); background: rgba(244, 67, 54, 0.15); }

  .feedback {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 10px;
    font-weight: 600;
    text-align: center;
  }

  .feedback.correct { background: rgba(76, 175, 80, 0.15); color: var(--color-accent-green); }
  .feedback.wrong { background: rgba(244, 67, 54, 0.15); color: var(--color-accent-red); }

  .feedback-detail {
    margin-top: 0.5rem;
    font-weight: 400;
    font-size: 0.9rem;
  }

  .fd-romanized { color: var(--color-accent-primary); font-weight: 600; margin-right: 0.5rem; }
  .fd-amharic { color: var(--color-text-secondary); }

  .quiz-actions {
    display: flex;
    justify-content: flex-end;
  }

  .result-card {
    text-align: center;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2.5rem;
  }

  .result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .result-card h2 { color: var(--color-text-heading); }
  .score { font-size: 2.5rem; font-weight: 800; color: var(--color-text-heading); }
  .percentage { color: var(--color-text-secondary); font-size: 1.2rem; }
  .perfect-badge {
    background: linear-gradient(90deg, var(--color-accent-orange), var(--color-accent-primary));
    color: #fff;
    padding: 0.4rem 1rem;
    border-radius: 20px;
    display: inline-block;
    font-weight: 700;
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }
  .xp-earned { color: var(--color-accent-orange); font-size: 1.5rem; font-weight: 700; margin-top: 0.5rem; }

  .result-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin: 1.5rem 0;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
  }

  .result-item.correct { background: rgba(76, 175, 80, 0.15); color: var(--color-accent-green); }
  .result-item.wrong { background: rgba(244, 67, 54, 0.15); color: var(--color-accent-red); }
  .result-word { font-weight: 600; }
  .result-answer { color: var(--color-text-secondary); font-size: 0.75rem; }

  .result-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
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

    .option {
      padding: 0.75rem;
      font-size: 0.9rem;
    }

    .result-card {
      padding: 1.5rem;
    }

    .score {
      font-size: 2rem;
    }

    .xp-earned {
      font-size: 1.2rem;
    }
  }
</style>
