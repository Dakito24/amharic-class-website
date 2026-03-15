<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getLesson, completeLesson } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import { onMount } from 'svelte';

  let lesson = $state(null);
  let loading = $state(true);
  let currentStep = $state(0);
  let showVocab = $state(false);
  let showFlashcards = $state(false);
  let completing = $state(false);
  let result = $state(null);

  // Flashcard practice state
  let flashcardIndex = $state(0);
  let flashcardFlipped = $state(false);
  let flashcardsDone = $state(false);
  let vocabCards = $derived(lesson ? lesson.vocabulary : []);
  let currentCard = $derived(vocabCards[flashcardIndex] || null);

  let lessonId = $derived($page.params.id);

  onMount(async () => {
    lesson = await getLesson(lessonId);
    loading = false;
  });

  function nextStep() {
    if (currentStep < lesson.content.steps.length - 1) {
      currentStep++;
    } else {
      showVocab = true;
    }
  }

  function prevStep() {
    if (showVocab) {
      showVocab = false;
    } else if (currentStep > 0) {
      currentStep--;
    }
  }

  async function finishLesson() {
    completing = true;
    result = await completeLesson(lessonId);
    if (result.leveled_up) {
      await loadProgress();
      triggerLevelUp();
    } else {
      await loadProgress();
    }
    completing = false;
  }

  function startFlashcards() {
    flashcardIndex = 0;
    flashcardFlipped = false;
    flashcardsDone = false;
    showFlashcards = true;
  }

  function flipCard() {
    flashcardFlipped = !flashcardFlipped;
  }

  function nextCard() {
    flashcardFlipped = false;
    if (flashcardIndex < vocabCards.length - 1) {
      flashcardIndex++;
    } else {
      flashcardsDone = true;
    }
  }

  function prevCard() {
    if (flashcardIndex > 0) {
      flashcardFlipped = false;
      flashcardIndex--;
    }
  }

  function exitFlashcards() {
    showFlashcards = false;
    flashcardsDone = false;
  }

  let totalSteps = $derived(lesson ? lesson.content.steps.length + 1 : 0);
  let progressPercent = $derived(lesson ? ((showVocab ? lesson.content.steps.length : currentStep) / totalSteps) * 100 : 0);
</script>

<div class="lesson-page">
  {#if loading}
    <div class="loading">Loading lesson...</div>
  {:else if lesson}
    <div class="lesson-header">
      <a href="/lessons" class="back">&larr; Lessons</a>
      <div class="lesson-info">
        <span class="unit-badge">Unit {lesson.unit}</span>
        <h1>{lesson.title}</h1>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: {progressPercent}%"></div>
      </div>
    </div>

    {#if result}
      <div class="completion-card">
        <div class="completion-icon">&#10003;</div>
        <h2>Lesson Complete!</h2>
        {#if result.xp_earned > 0}
          <p class="xp-earned">+{result.xp_earned} XP</p>
        {:else}
          <p class="already">Already completed</p>
        {/if}
        <div class="completion-actions">
          <a href="/quiz/{lesson.id}" class="btn btn-primary">Take Quiz</a>
          <a href="/lessons" class="btn btn-secondary">All Lessons</a>
          {#if lesson.id < 28}
            <a href="/lessons/{lesson.id + 1}" class="btn btn-secondary">Next Lesson</a>
          {/if}
        </div>
      </div>
    {:else if !showVocab}
      <div class="step-card">
        <div class="step-counter">Step {currentStep + 1} of {lesson.content.steps.length}</div>
        <h2 class="step-title">{lesson.content.steps[currentStep].title}</h2>
        <div class="step-body">
          {lesson.content.steps[currentStep].body}
        </div>

        {#if lesson.content.steps[currentStep].examples}
          <div class="examples">
            {#each lesson.content.steps[currentStep].examples as ex}
              <div class="example-item">
                <div class="ex-english">{ex.english}</div>
                <div class="ex-romanized">{ex.romanized}</div>
                {#if ex.amharic}
                  <div class="ex-amharic">{ex.amharic}</div>
                {/if}
                {#if ex.pronunciation_guide}
                  <div class="ex-pron">{ex.pronunciation_guide}</div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="step-nav">
        <button class="btn btn-secondary" onclick={prevStep} disabled={currentStep === 0}>
          &larr; Back
        </button>
        <button class="btn btn-primary" onclick={nextStep}>
          {currentStep === lesson.content.steps.length - 1 ? 'View Vocabulary' : 'Next'} &rarr;
        </button>
      </div>
    {:else if showFlashcards}
      <div class="flashcard-section">
        {#if flashcardsDone}
          <div class="flashcard-done">
            <div class="done-icon">&#10003;</div>
            <h2>Nice work!</h2>
            <p>You practiced all {vocabCards.length} words from this lesson.</p>
            <div class="done-actions">
              <button class="btn btn-secondary" onclick={() => startFlashcards()}>Practice Again</button>
              <button class="btn btn-primary" onclick={exitFlashcards}>Continue</button>
            </div>
          </div>
        {:else if currentCard}
          <div class="flashcard-counter">{flashcardIndex + 1} / {vocabCards.length}</div>
          <button class="flashcard" class:flipped={flashcardFlipped} onclick={flipCard}>
            <div class="flashcard-inner">
              <div class="flashcard-front">
                <div class="fc-label">English</div>
                <div class="fc-word">{currentCard.english}</div>
                <div class="fc-hint">Tap to reveal</div>
              </div>
              <div class="flashcard-back">
                <div class="fc-romanized">{currentCard.romanized}</div>
                <div class="fc-amharic">{currentCard.amharic}</div>
                {#if currentCard.pronunciation_guide}
                  <div class="fc-pron">{currentCard.pronunciation_guide}</div>
                {/if}
                {#if currentCard.gender}
                  <span class="fc-gender">{currentCard.gender}</span>
                {/if}
              </div>
            </div>
          </button>
          <div class="flashcard-nav">
            <button class="btn btn-secondary" onclick={prevCard} disabled={flashcardIndex === 0}>&larr; Prev</button>
            <button class="btn btn-primary" onclick={nextCard}>
              {flashcardIndex === vocabCards.length - 1 ? 'Done' : 'Next'} &rarr;
            </button>
          </div>
        {/if}
      </div>

      <div class="step-nav">
        <button class="btn btn-secondary" onclick={exitFlashcards}>&larr; Back to Vocabulary</button>
        <button class="btn btn-primary" onclick={() => { exitFlashcards(); finishLesson(); }} disabled={completing}>
          {completing ? 'Completing...' : 'Skip to Complete'}
        </button>
      </div>

    {:else}
      <div class="vocab-section">
        <h2>Vocabulary</h2>
        <p class="vocab-intro">Review the words and phrases from this lesson:</p>

        <div class="vocab-grid">
          {#each lesson.vocabulary as word}
            <div class="vocab-card">
              <div class="vocab-english">{word.english}</div>
              <div class="vocab-romanized">{word.romanized}</div>
              <div class="vocab-amharic">{word.amharic}</div>
              {#if word.pronunciation_guide}
                <div class="vocab-pron">{word.pronunciation_guide}</div>
              {/if}
              {#if word.gender}
                <span class="vocab-gender">{word.gender}</span>
              {/if}
            </div>
          {/each}
        </div>

        {#if lesson.content.examples && lesson.content.examples.length > 0}
          <h3 class="examples-header">Examples</h3>
          <div class="examples-list">
            {#each lesson.content.examples as ex}
              <div class="example-row">
                <span class="ex-en">{ex.english}</span>
                <span class="ex-rom">{ex.romanized}</span>
                {#if ex.pronunciation_guide}
                  <span class="ex-pr">{ex.pronunciation_guide}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if vocabCards.length > 0}
          <button class="btn btn-flashcard" onclick={startFlashcards}>
            Practice with Flashcards ({vocabCards.length} words)
          </button>
        {/if}
      </div>

      <div class="step-nav">
        <button class="btn btn-secondary" onclick={prevStep}>&larr; Back to Steps</button>
        <button class="btn btn-primary" onclick={finishLesson} disabled={completing}>
          {completing ? 'Completing...' : 'Complete Lesson'}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .lesson-page {
    max-width: 700px;
    margin: 0 auto;
  }

  .loading {
    text-align: center;
    color: #a8a8b3;
    padding: 3rem;
  }

  .lesson-header {
    margin-bottom: 1.5rem;
  }

  .back {
    color: #a8a8b3;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover {
    color: #fff;
  }

  .lesson-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .unit-badge {
    background: #e94560;
    color: #fff;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .lesson-info h1 {
    color: #fff;
    font-size: 1.5rem;
    margin: 0;
  }

  .progress-track {
    height: 4px;
    background: #2a2a4a;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #e94560;
    transition: width 0.3s ease;
  }

  .step-card {
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .step-counter {
    color: #a8a8b3;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.75rem;
  }

  .step-title {
    color: #fff;
    margin: 0 0 1rem;
    font-size: 1.3rem;
  }

  .step-body {
    color: #ccc;
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .examples {
    margin-top: 1.5rem;
    display: grid;
    gap: 0.75rem;
  }

  .example-item {
    background: #1a1a2e;
    border-radius: 8px;
    padding: 1rem;
  }

  .ex-english {
    color: #fff;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .ex-romanized {
    color: #e94560;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .ex-amharic {
    color: #a8a8b3;
    font-size: 0.9rem;
    margin-top: 0.15rem;
  }

  .ex-pron {
    color: #f5a623;
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.15rem;
  }

  .step-nav {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #e94560;
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: #d63851;
  }

  .btn-secondary {
    background: #2a2a4a;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #3a3a5a;
  }

  .vocab-section h2 {
    color: #fff;
    font-size: 1.4rem;
    margin-bottom: 0.25rem;
  }

  .vocab-intro {
    color: #a8a8b3;
    margin-bottom: 1rem;
  }

  .vocab-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .vocab-card {
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 10px;
    padding: 1rem;
    transition: border-color 0.2s;
  }

  .vocab-card:hover {
    border-color: #e94560;
  }

  .vocab-english {
    color: #fff;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .vocab-romanized {
    color: #e94560;
    font-weight: 600;
    font-size: 1.05rem;
  }

  .vocab-amharic {
    color: #a8a8b3;
    font-size: 0.9rem;
    margin-top: 0.1rem;
  }

  .vocab-pron {
    color: #f5a623;
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
  }

  .vocab-gender {
    display: inline-block;
    background: #2a2a4a;
    color: #a8a8b3;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    margin-top: 0.3rem;
  }

  .examples-header {
    color: #fff;
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .examples-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .example-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #16213e;
    border-radius: 8px;
    align-items: baseline;
  }

  .ex-en {
    color: #fff;
    font-weight: 600;
  }

  .ex-rom {
    color: #e94560;
  }

  .ex-pr {
    color: #f5a623;
    font-size: 0.85rem;
    font-style: italic;
  }

  .completion-card {
    background: #16213e;
    border: 2px solid #4caf50;
    border-radius: 16px;
    padding: 3rem;
    text-align: center;
  }

  .completion-icon {
    font-size: 3rem;
    color: #4caf50;
    margin-bottom: 1rem;
  }

  .completion-card h2 {
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .xp-earned {
    color: #f5a623;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .already {
    color: #a8a8b3;
  }

  .completion-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  /* Flashcard Practice */
  .btn-flashcard {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #16213e, #1a1a2e);
    border: 2px dashed #e94560;
    border-radius: 12px;
    color: #e94560;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
  }

  .btn-flashcard:hover {
    background: rgba(233, 69, 96, 0.1);
    border-style: solid;
  }

  .flashcard-section {
    text-align: center;
    margin-bottom: 1rem;
  }

  .flashcard-counter {
    color: #a8a8b3;
    font-size: 0.85rem;
    margin-bottom: 1rem;
    letter-spacing: 1px;
  }

  .flashcard {
    width: 100%;
    max-width: 400px;
    height: 240px;
    margin: 0 auto 1.25rem;
    perspective: 800px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    display: block;
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

  .flashcard-front,
  .flashcard-back {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .flashcard-front {
    background: linear-gradient(135deg, #16213e, #1a1a3a);
    border: 2px solid #2a2a4a;
  }

  .flashcard-back {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid #e94560;
    transform: rotateY(180deg);
  }

  .fc-label {
    color: #a8a8b3;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }

  .fc-word {
    color: #fff;
    font-size: 1.6rem;
    font-weight: 700;
  }

  .fc-hint {
    color: #555;
    font-size: 0.8rem;
    margin-top: 1rem;
  }

  .fc-romanized {
    color: #e94560;
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .fc-amharic {
    color: #a8a8b3;
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
  }

  .fc-pron {
    color: #f5a623;
    font-size: 0.9rem;
    font-style: italic;
  }

  .fc-gender {
    display: inline-block;
    background: #2a2a4a;
    color: #a8a8b3;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    margin-top: 0.5rem;
  }

  .flashcard-nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .flashcard-done {
    background: #16213e;
    border: 2px solid #4caf50;
    border-radius: 16px;
    padding: 2.5rem;
    text-align: center;
  }

  .done-icon {
    font-size: 2.5rem;
    color: #4caf50;
    margin-bottom: 0.5rem;
  }

  .flashcard-done h2 {
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .flashcard-done p {
    color: #a8a8b3;
    margin-bottom: 1.25rem;
  }

  .done-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
</style>
