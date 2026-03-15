<script>
  import { page } from '$app/stores';
  import { getQuiz, submitQuiz, getLesson } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import { onMount } from 'svelte';

  let questions = $state([]);
  let lesson = $state(null);
  let loading = $state(true);
  let currentQ = $state(0);
  let answers = $state([]);
  let selectedAnswer = $state(null);
  let showFeedback = $state(false);
  let result = $state(null);

  let lessonId = $derived(Number($page.params.id));

  onMount(async () => {
    const [q, l] = await Promise.all([getQuiz(lessonId), getLesson(lessonId)]);
    questions = q.filter(q => q.question_type === 'multiple_choice' || q.question_type === 'fill_blank');
    lesson = l;
    loading = false;
  });

  let current = $derived(questions[currentQ]);
  let progress = $derived(questions.length > 0 ? ((currentQ) / questions.length) * 100 : 0);

  function selectAnswer(answer) {
    if (showFeedback) return;
    selectedAnswer = answer;
  }

  function checkAnswer() {
    if (selectedAnswer === null) return;
    showFeedback = true;
    answers.push({
      question_id: current.id,
      user_answer: selectedAnswer
    });
  }

  async function nextQuestion() {
    if (currentQ < questions.length - 1) {
      currentQ++;
      selectedAnswer = null;
      showFeedback = false;
    } else {
      result = await submitQuiz(lessonId, answers);
      if (result.leveled_up) {
        await loadProgress();
        triggerLevelUp();
      } else {
        await loadProgress();
      }
    }
  }

  let isCorrect = $derived(selectedAnswer === current?.correct_answer);

  let fillBlankInput = $state('');

  function submitFillBlank() {
    if (!fillBlankInput.trim()) return;
    selectedAnswer = fillBlankInput.trim().toLowerCase();
    showFeedback = true;
    answers.push({
      question_id: current.id,
      user_answer: selectedAnswer
    });
  }
</script>

<div class="quiz-page">
  {#if loading}
    <div class="loading">Loading quiz...</div>
  {:else if questions.length === 0}
    <div class="empty">
      <h2>No quiz available</h2>
      <p>This lesson doesn't have quiz questions yet.</p>
      <a href="/quiz" class="btn btn-secondary">Back to Quizzes</a>
    </div>
  {:else if result}
    <div class="result-card">
      <div class="result-icon">
        {#if result.percentage >= 80}&#9733;{:else if result.percentage >= 50}&#9734;{:else}&#10060;{/if}
      </div>
      <h2>Quiz Complete!</h2>
      <div class="score">{result.score}/{result.total}</div>
      <div class="percentage">{result.percentage}%</div>
      {#if result.perfect}
        <div class="perfect-badge">PERFECT SCORE! +15 bonus XP</div>
      {/if}
      <div class="xp-earned">+{result.xp_earned} XP</div>

      <div class="result-breakdown">
        {#each result.results as r, i}
          <div class="result-item" class:correct={r.correct} class:wrong={!r.correct}>
            <span class="result-indicator">{r.correct ? '&#10003;' : '&#10060;'}</span>
            <span class="result-q">Q{i + 1}</span>
            {#if !r.correct}
              <span class="result-answer">Answer: {r.correct_answer}</span>
            {/if}
          </div>
        {/each}
      </div>

      <div class="result-actions">
        <a href="/quiz/{lessonId}" class="btn btn-primary"
          onclick={(e) => { e.preventDefault(); location.reload(); }}>
          Retry
        </a>
        <a href="/quiz" class="btn btn-secondary">All Quizzes</a>
      </div>
    </div>
  {:else}
    <div class="quiz-header">
      <a href="/quiz" class="back">&larr; Quizzes</a>
      <h1>{lesson?.title} Quiz</h1>
      <div class="quiz-progress">
        <div class="quiz-progress-fill" style="width: {progress}%"></div>
      </div>
      <span class="quiz-count">Question {currentQ + 1} of {questions.length}</span>
    </div>

    <div class="question-card">
      <h2 class="question-text">{current.question}</h2>

      {#if current.question_type === 'multiple_choice'}
        <div class="options">
          {#each current.options as option}
            <button
              class="option"
              class:selected={selectedAnswer === option}
              class:correct={showFeedback && option === current.correct_answer}
              class:wrong={showFeedback && selectedAnswer === option && option !== current.correct_answer}
              onclick={() => selectAnswer(option)}
              disabled={showFeedback}
            >
              {option}
            </button>
          {/each}
        </div>
      {:else if current.question_type === 'fill_blank'}
        <div class="fill-blank">
          <input
            type="text"
            bind:value={fillBlankInput}
            placeholder="Type your answer..."
            disabled={showFeedback}
            onkeydown={(e) => e.key === 'Enter' && !showFeedback && submitFillBlank()}
          />
          {#if showFeedback}
            <div class="fill-feedback" class:correct={isCorrect} class:wrong={!isCorrect}>
              {#if isCorrect}
                Correct!
              {:else}
                Answer: {current.correct_answer}
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if showFeedback && current.explanation}
        <div class="explanation">
          <strong>Explanation:</strong> {current.explanation}
        </div>
      {/if}
    </div>

    <div class="quiz-actions">
      {#if !showFeedback}
        {#if current.question_type === 'multiple_choice'}
          <button class="btn btn-primary" onclick={checkAnswer} disabled={selectedAnswer === null}>
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
  .quiz-page {
    max-width: 650px;
    margin: 0 auto;
  }

  .loading, .empty {
    text-align: center;
    color: #a8a8b3;
    padding: 3rem;
  }

  .empty {
    background: #16213e;
    border-radius: 16px;
    border: 1px solid #2a2a4a;
  }

  .empty h2 { color: #fff; margin-bottom: 0.5rem; }

  .back {
    color: #a8a8b3;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover { color: #fff; }

  .quiz-header {
    margin-bottom: 1.5rem;
  }

  .quiz-header h1 {
    color: #fff;
    font-size: 1.4rem;
    margin: 0.5rem 0;
  }

  .quiz-progress {
    height: 4px;
    background: #2a2a4a;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.25rem;
  }

  .quiz-progress-fill {
    height: 100%;
    background: #e94560;
    transition: width 0.3s ease;
  }

  .quiz-count {
    color: #a8a8b3;
    font-size: 0.8rem;
  }

  .question-card {
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 16px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .question-text {
    color: #fff;
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
    padding: 1rem;
    background: #1a1a2e;
    border: 2px solid #2a2a4a;
    border-radius: 10px;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .option:hover:not(:disabled) {
    border-color: #e94560;
  }

  .option.selected {
    border-color: #e94560;
    background: rgba(233, 69, 96, 0.1);
  }

  .option.correct {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.15);
  }

  .option.wrong {
    border-color: #f44336;
    background: rgba(244, 67, 54, 0.15);
  }

  .fill-blank input {
    width: 100%;
    padding: 1rem;
    background: #1a1a2e;
    border: 2px solid #2a2a4a;
    border-radius: 10px;
    color: #fff;
    font-size: 1.1rem;
    outline: none;
  }

  .fill-blank input:focus {
    border-color: #e94560;
  }

  .fill-feedback {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
  }

  .fill-feedback.correct {
    background: rgba(76, 175, 80, 0.15);
    color: #4caf50;
  }

  .fill-feedback.wrong {
    background: rgba(244, 67, 54, 0.15);
    color: #f44336;
  }

  .explanation {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(245, 166, 35, 0.1);
    border-radius: 8px;
    color: #f5a623;
    font-size: 0.9rem;
  }

  .quiz-actions {
    display: flex;
    justify-content: flex-end;
  }

  .result-card {
    text-align: center;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 16px;
    padding: 2.5rem;
  }

  .result-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  .result-card h2 { color: #fff; }
  .score { font-size: 2.5rem; font-weight: 800; color: #fff; }
  .percentage { color: #a8a8b3; font-size: 1.2rem; }
  .perfect-badge {
    background: linear-gradient(90deg, #f5a623, #e94560);
    color: #fff;
    padding: 0.4rem 1rem;
    border-radius: 20px;
    display: inline-block;
    font-weight: 700;
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }
  .xp-earned { color: #f5a623; font-size: 1.5rem; font-weight: 700; margin-top: 0.5rem; }

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

  .result-item.correct { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
  .result-item.wrong { background: rgba(244, 67, 54, 0.15); color: #f44336; }
  .result-answer { color: #a8a8b3; font-size: 0.75rem; }

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
  .btn-primary { background: #e94560; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #d63851; }
  .btn-secondary { background: #2a2a4a; color: #fff; }
</style>
