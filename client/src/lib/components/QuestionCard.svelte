<script>
  let {
    question,
    selectedAnswer = null,
    showFeedback = false,
    disabled = false,
    fillBlankInput = '',
    onSelectAnswer = () => {},
    onSubmitFillBlank = () => {}
  } = $props();

  let isCorrect = $derived(selectedAnswer === question?.correct_answer);
</script>

<div class="question-card">
  <h2 class="question-text">{question.question}</h2>

  {#if question.question_type === 'multiple_choice'}
    <div class="options">
      {#each question.options as option, i}
        <button
          class="option"
          class:selected={selectedAnswer === option}
          class:correct={showFeedback && option === question.correct_answer}
          class:wrong={showFeedback && selectedAnswer === option && option !== question.correct_answer}
          onclick={() => onSelectAnswer(option)}
          disabled={showFeedback || disabled}
        >
          <span class="option-num">{i + 1}</span>
          {option}
        </button>
      {/each}
    </div>
  {:else if question.question_type === 'fill_blank'}
    <div class="fill-blank">
      <input
        type="text"
        bind:value={fillBlankInput}
        placeholder="Type your answer..."
        disabled={showFeedback || disabled}
        onkeydown={(e) => e.key === 'Enter' && !showFeedback && onSubmitFillBlank()}
      />
      {#if showFeedback}
        <div class="fill-feedback" class:correct={isCorrect} class:wrong={!isCorrect}>
          {#if isCorrect}
            Correct!
          {:else}
            Answer: {question.correct_answer}
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if showFeedback && question.explanation}
    <div class="explanation">
      <strong>Explanation:</strong> {question.explanation}
    </div>
  {/if}
</div>

<style>
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

  .fill-blank input {
    width: 100%;
    padding: 1rem;
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-heading);
    font-size: 1.1rem;
    outline: none;
  }

  .fill-blank input:focus {
    border-color: var(--color-accent-primary);
  }

  .fill-feedback {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
  }

  .fill-feedback.correct {
    background: rgba(76, 175, 80, 0.15);
    color: var(--color-accent-green);
  }

  .fill-feedback.wrong {
    background: rgba(244, 67, 54, 0.15);
    color: var(--color-accent-red);
  }

  .explanation {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(245, 166, 35, 0.1);
    border-radius: 8px;
    color: var(--color-accent-orange);
    font-size: 0.9rem;
  }
</style>
