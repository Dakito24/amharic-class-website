<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getLesson, completeLesson } from '$lib/api.js';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
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

  // Build a lookup from romanized text to audio_url for step examples
  let audioLookup = $derived(() => {
    if (!lesson?.vocabulary) return {};
    const map = {};
    for (const v of lesson.vocabulary) {
      map[v.romanized.toLowerCase()] = v.audio_url;
    }
    return map;
  });

  function getAudioForExample(ex) {
    const lookup = audioLookup();
    return lookup[ex.romanized?.toLowerCase()] || null;
  }

  function getAudioForWord(word) {
    const lookup = audioLookup();
    return lookup[word.romanized?.toLowerCase()] || null;
  }

  // Match each vocab word with its related example sentence(s)
  let vocabWithExamples = $derived(() => {
    if (!lesson) return [];
    const examples = lesson.content.examples || [];
    return lesson.vocabulary.map(word => {
      const related = examples.filter(ex =>
        ex.romanized?.toLowerCase().includes(word.romanized.toLowerCase()) ||
        ex.english?.toLowerCase().includes(word.english.toLowerCase().replace(/\s*\(.*\)/, ''))
      );
      return { ...word, examples: related };
    });
  });
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

        {#if lesson.content.steps[currentStep].words}
          <div class="step-words">
            {#each lesson.content.steps[currentStep].words as word}
              <div class="step-word-item">
                <div class="sw-main">
                  <span class="sw-romanized">{word.romanized}</span>
                  <span class="sw-amharic">{word.amharic}</span>
                  {#if getAudioForWord(word)}
                    <AudioButton src={getAudioForWord(word)} />
                  {/if}
                </div>
                <div class="sw-detail">
                  <span class="sw-english">{word.english}</span>
                  {#if word.pronunciation_guide}
                    <span class="sw-pron">{word.pronunciation_guide}</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if lesson.content.steps[currentStep].examples}
          <div class="examples">
            {#each lesson.content.steps[currentStep].examples as ex}
              <div class="example-item">
                <div class="ex-top-row">
                  <div class="ex-english">{ex.english}</div>
                  {#if getAudioForExample(ex)}
                    <AudioButton src={getAudioForExample(ex)} />
                  {/if}
                </div>
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
                <div class="fc-romanized-row">
                  <div class="fc-romanized">{currentCard.romanized}</div>
                  <AudioButton src={currentCard.audio_url} />
                </div>
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
        <h2>Vocabulary & Examples</h2>
        <p class="vocab-intro">Listen and review the words and phrases from this lesson:</p>

        <div class="vocab-list-combined">
          {#each vocabWithExamples() as word}
            <div class="vocab-combined-card">
              <div class="vocab-main">
                <div class="vocab-english">{word.english}</div>
                <div class="vocab-romanized-row">
                  <div class="vocab-romanized">{word.romanized}</div>
                  <AudioButton src={word.audio_url} />
                </div>
                <div class="vocab-amharic">{word.amharic}</div>
                {#if word.pronunciation_guide}
                  <div class="vocab-pron">{word.pronunciation_guide}</div>
                {/if}
                {#if word.gender}
                  <span class="vocab-gender">{word.gender}</span>
                {/if}
              </div>
              {#if word.examples.length > 0}
                <div class="vocab-examples">
                  {#each word.examples as ex}
                    <div class="vocab-ex-item">
                      <span class="ex-en">{ex.english}</span>
                      <span class="ex-rom">{ex.romanized}</span>
                      {#if ex.amharic}
                        <span class="ex-amh">{ex.amharic}</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>

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
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .lesson-header {
    margin-bottom: 1.5rem;
  }

  .back {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover {
    color: var(--color-text-heading);
  }

  .lesson-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }

  .unit-badge {
    background: var(--color-accent-primary);
    color: #fff;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .lesson-info h1 {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    margin: 0;
  }

  .progress-track {
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent-primary);
    transition: width 0.3s ease;
  }

  .step-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 1rem;
  }

  .step-counter {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.75rem;
  }

  .step-title {
    color: var(--color-text-heading);
    margin: 0 0 1rem;
    font-size: 1.3rem;
  }

  .step-body {
    color: var(--color-text-primary);
    line-height: 1.7;
    white-space: pre-wrap;
  }

  .step-words {
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.6rem;
  }

  .step-word-item {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 0.75rem;
    transition: border-color 0.2s;
  }

  .step-word-item:hover {
    border-color: var(--color-accent-primary);
  }

  .sw-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .sw-romanized {
    color: var(--color-accent-primary);
    font-size: 1.3rem;
    font-weight: 700;
  }

  .sw-amharic {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .sw-detail {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .sw-english {
    color: var(--color-text-heading);
    font-size: 0.85rem;
  }

  .sw-pron {
    color: var(--color-accent-orange);
    font-size: 0.75rem;
    font-style: italic;
  }

  .examples {
    margin-top: 1.5rem;
    display: grid;
    gap: 0.75rem;
  }

  .example-item {
    background: var(--color-bg-elevated);
    border-radius: 8px;
    padding: 1rem;
  }

  .ex-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .ex-english {
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .ex-romanized {
    color: var(--color-accent-primary);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .ex-amharic {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-top: 0.15rem;
  }

  .ex-pron {
    color: var(--color-accent-orange);
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
    background: var(--color-accent-primary);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
  }

  .btn-secondary {
    background: var(--color-border);
    color: var(--color-text-heading);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-border-hover);
  }

  .vocab-section h2 {
    color: var(--color-text-heading);
    font-size: 1.4rem;
    margin-bottom: 0.25rem;
  }

  .vocab-intro {
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
  }

  .vocab-list-combined {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .vocab-combined-card {
    display: flex;
    gap: 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1rem 1.25rem;
    transition: border-color 0.2s;
    align-items: flex-start;
  }

  .vocab-combined-card:hover {
    border-color: var(--color-accent-primary);
  }

  .vocab-main {
    flex: 1;
    min-width: 0;
  }

  .vocab-examples {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    border-left: 2px solid var(--color-border);
    padding-left: 1rem;
  }

  .vocab-ex-item {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: baseline;
    font-size: 0.88rem;
  }

  .ex-amh {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  @media (max-width: 600px) {
    .vocab-combined-card {
      flex-direction: column;
      gap: 0.75rem;
    }
    .vocab-examples {
      border-left: none;
      border-top: 1px solid var(--color-border);
      padding-left: 0;
      padding-top: 0.75rem;
    }
  }

  .vocab-english {
    color: var(--color-text-heading);
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .vocab-romanized-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vocab-romanized {
    color: var(--color-accent-primary);
    font-weight: 600;
    font-size: 1.05rem;
  }

  .vocab-amharic {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    margin-top: 0.1rem;
  }

  .vocab-pron {
    color: var(--color-accent-orange);
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.25rem;
  }

  .vocab-gender {
    display: inline-block;
    background: var(--color-border);
    color: var(--color-text-secondary);
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    margin-top: 0.3rem;
  }

  .ex-en {
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .ex-rom {
    color: var(--color-accent-primary);
  }

  .completion-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-green);
    border-radius: 16px;
    padding: 3rem;
    text-align: center;
  }

  .completion-icon {
    font-size: 3rem;
    color: var(--color-accent-green);
    margin-bottom: 1rem;
  }

  .completion-card h2 {
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .xp-earned {
    color: var(--color-accent-orange);
    font-size: 1.5rem;
    font-weight: 700;
  }

  .already {
    color: var(--color-text-secondary);
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
    background: linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated));
    border: 2px dashed var(--color-accent-primary);
    border-radius: 12px;
    color: var(--color-accent-primary);
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
    color: var(--color-text-secondary);
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
    background: linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated));
    border: 2px solid var(--color-border);
  }

  .flashcard-back {
    background: linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-surface));
    border: 2px solid var(--color-accent-primary);
    transform: rotateY(180deg);
  }

  .fc-label {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }

  .fc-word {
    color: var(--color-text-heading);
    font-size: 1.6rem;
    font-weight: 700;
  }

  .fc-hint {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    margin-top: 1rem;
  }

  .fc-romanized-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .fc-romanized {
    color: var(--color-accent-primary);
    font-size: 1.6rem;
    font-weight: 700;
  }

  .fc-amharic {
    color: var(--color-text-secondary);
    font-size: 1.2rem;
    margin-bottom: 0.25rem;
  }

  .fc-pron {
    color: var(--color-accent-orange);
    font-size: 0.9rem;
    font-style: italic;
  }

  .fc-gender {
    display: inline-block;
    background: var(--color-border);
    color: var(--color-text-secondary);
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
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-green);
    border-radius: 16px;
    padding: 2.5rem;
    text-align: center;
  }

  .done-icon {
    font-size: 2.5rem;
    color: var(--color-accent-green);
    margin-bottom: 0.5rem;
  }

  .flashcard-done h2 {
    color: var(--color-text-heading);
    margin-bottom: 0.5rem;
  }

  .flashcard-done p {
    color: var(--color-text-secondary);
    margin-bottom: 1.25rem;
  }

  .done-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
</style>
