<script>
  import { getReviewQuiz, submitReviewQuiz } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import QuestionCard from '$lib/components/QuestionCard.svelte';
  import { onMount } from 'svelte';

  let questions = $state([]);
  let loading = $state(true);
  let currentQ = $state(0);
  let answers = $state([]);
  let selectedAnswer = $state(null);
  let showFeedback = $state(false);
  let result = $state(null);
  let fillBlankInput = $state('');

  onMount(async () => {
    questions = await getReviewQuiz();
    loading = false;
  });

  let current = $derived(questions[currentQ]);
  let progress = $derived(questions.length > 0 ? (currentQ / questions.length) * 100 : 0);

  function selectAnswer(answer) {
    if (showFeedback) return;
    selectedAnswer = answer;
    showFeedback = true;
    answers.push({ question_id: current.id, user_answer: answer });
  }

  function submitFillBlank() {
    if (!fillBlankInput.trim()) return;
    const answer = fillBlankInput.trim().toLowerCase();
    selectedAnswer = answer;
    showFeedback = true;
    answers.push({ question_id: current.id, user_answer: answer });
  }

  async function nextQuestion() {
    if (currentQ < questions.length - 1) {
      currentQ++;
      selectedAnswer = null;
      showFeedback = false;
      fillBlankInput = '';
    } else {
      result = await submitReviewQuiz(answers);
      if (result.leveled_up) {
        await loadProgress();
        triggerLevelUp();
      } else {
        await loadProgress();
      }
    }
  }
</script>

<div class="review-quiz">
  {#if loading}
    <div class="loading">Loading review quiz...</div>
  {:else if questions.length === 0}
    <div class="empty">
      <h2>No questions to review</h2>
      <p>Take some quizzes first to build your review queue.</p>
      <a href="/quiz" class="btn btn-secondary">Go to Quizzes</a>
    </div>
  {:else if result}
    <div class="result-card">
      <div class="result-icon">
        {#if result.percentage >= 80}&#9733;{:else if result.percentage >= 50}&#9734;{:else}&#10060;{/if}
      </div>
      <h2>Review Complete!</h2>
      <div class="score">{result.score}/{result.total}</div>
      <div class="percentage">{result.percentage}%</div>
      {#if result.perfect}
        <div class="perfect-badge">PERFECT! +10 bonus XP</div>
      {/if}
      <div class="xp-earned">+{result.xp_earned} XP</div>
      <div class="result-actions">
        <a href="/review" class="btn btn-secondary">Back to Review</a>
        <a href="/review/quiz" class="btn btn-primary"
          onclick={(e) => { e.preventDefault(); location.reload(); }}>
          Retry
        </a>
      </div>
    </div>
  {:else}
    <div class="quiz-header">
      <a href="/review" class="back">&larr; Review</a>
      <h1>Weak Words Quiz</h1>
      <div class="quiz-progress">
        <div class="quiz-progress-fill" style="width: {progress}%"></div>
      </div>
      <span class="quiz-count">Question {currentQ + 1} of {questions.length}</span>
    </div>

    <QuestionCard
      question={current}
      {selectedAnswer}
      {showFeedback}
      {fillBlankInput}
      onSelectAnswer={selectAnswer}
      onSubmitFillBlank={submitFillBlank}
    />

    <div class="quiz-actions">
      {#if !showFeedback}
        {#if current.question_type === 'multiple_choice'}
          <button class="btn btn-primary" onclick={() => { showFeedback = true; answers.push({ question_id: current.id, user_answer: selectedAnswer }); }} disabled={selectedAnswer === null}>
            Check Answer
          </button>
        {:else}
          <button class="btn btn-primary" onclick={submitFillBlank} disabled={!fillBlankInput.trim()}>
            Check Answer
          </button>
        {/if}
      {:else}
        <button class="btn btn-primary" onclick={nextQuestion}>
          {currentQ === questions.length - 1 ? 'See Results' : 'Next Question'} &rarr;
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .review-quiz {
    max-width: 650px;
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

  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--color-accent-primary); color: #fff; }
  .btn-secondary { background: var(--color-border); color: var(--color-text-heading); }
</style>
