<script>
  import { page } from '$app/stores';
  import { getStoryChapter, completeStoryChapter } from '$lib/api.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import { onMount } from 'svelte';

  let chapter = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let currentScene = $state(0);
  let selectedChoices = $state([]);
  let completed = $state(false);
  let completionResult = $state(null);
  let showFeedback = $state(false);

  let chapterId = $derived(Number($page.params.id));

  onMount(async () => {
    try {
      chapter = await getStoryChapter(chapterId);
    } catch (err) {
      console.error('Failed to load story chapter:', err);
      error = err.message || 'Failed to load story chapter';
    } finally {
      loading = false;
    }
  });

  // Track story progression
  let storyHistory = $derived(() => {
    if (!chapter) return [];
    return chapter.turns.slice(0, currentScene + 1);
  });

  let currentTurn = $derived(chapter?.turns[currentScene] || null);
  let isChoiceTurn = $derived(currentTurn?.type === 'user');
  let currentChoice = $derived(selectedChoices[currentScene] || null);

  function selectChoice(option, optionIndex) {
    selectedChoices[currentScene] = { ...option, optionIndex };
    selectedChoices = [...selectedChoices];
    showFeedback = true;
  }

  function continueStory() {
    showFeedback = false;

    if (currentScene < chapter.turns.length - 1) {
      currentScene++;
    } else {
      finishChapter();
    }
  }

  async function finishChapter() {
    completed = true;

    try {
      // Submit chapter completion with choices made
      completionResult = await completeStoryChapter(
        chapterId,
        selectedChoices.map((c, i) => ({
          scene: i,
          choice: c?.optionIndex || 0
        }))
      );

      if (completionResult.leveled_up) {
        await loadProgress();
        triggerLevelUp();
      } else {
        await loadProgress();
      }
    } catch (err) {
      console.error('Failed to complete story chapter:', err);
      error = err.message || 'Failed to complete story chapter';
      completed = false;
    }
  }

  function restartChapter() {
    currentScene = 0;
    selectedChoices = [];
    completed = false;
    completionResult = null;
    showFeedback = false;
  }

  // Calculate progress percentage
  let progressPercent = $derived(
    chapter ? Math.round(((currentScene + 1) / chapter.turns.length) * 100) : 0
  );
</script>

<div class="story-page">
  {#if loading}
    <div class="loading">Loading story...</div>
  {:else if error || !chapter}
    <div class="error" role="alert">
      <h2>{error || 'Story chapter not found'}</h2>
      <div class="error-actions">
        <button class="btn-secondary" onclick={() => window.location.reload()}>Try Again</button>
        <a href="/games/story-adventure" class="btn-secondary">Back to Chapters</a>
      </div>
    </div>
  {:else}
    <header class="story-header">
      <a href="/games/story-adventure" class="back-link">&larr; All Chapters</a>
      <h1>{chapter.title}</h1>
      <p class="chapter-desc">{chapter.description}</p>

      <div class="progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100" aria-label="Story progress">
        <div class="progress-fill" style="width: {progressPercent}%"></div>
      </div>
      <div class="progress-text" aria-live="polite">Scene {currentScene + 1} of {chapter.turns.length}</div>
    </header>

    {#if !completed}
      <main class="story-reader">
        <!-- Show all previous scenes as a narrative flow -->
        <div class="scene-history">
          {#each storyHistory() as turn, i}
            {#if turn.type === 'npc'}
              <div class="narrative-scene" class:current={i === currentScene}>
                <div class="scene-speaker">{turn.speaker}</div>
                <div class="scene-dialogue">
                  <div class="dialogue-box">
                    <div class="dialogue-top">
                      <div class="dialogue-text">
                        <div class="text-romanized">{turn.romanized}</div>
                        <div class="text-amharic">{turn.amharic}</div>
                      </div>
                      {#if turn.audio_url}
                        <AudioButton src={turn.audio_url} />
                      {/if}
                    </div>
                    <div class="text-english">{turn.english}</div>
                  </div>
                </div>
              </div>
            {:else}
              <!-- User choice scene -->
              <div class="choice-scene" class:current={i === currentScene}>
                <div class="choice-prompt">
                  <span class="prompt-icon" aria-hidden="true">🎭</span>
                  <span>{turn.prompt}</span>
                </div>

                <div class="choice-options">
                  {#each turn.options as option, oi}
                    {@const isSelected = selectedChoices[i]?.optionIndex === oi}
                    {@const isCurrentAndNotSelected = i === currentScene && !selectedChoices[i]}

                    <button
                      class="choice-btn"
                      class:selected={isSelected}
                      class:available={isCurrentAndNotSelected}
                      disabled={i !== currentScene || !!selectedChoices[i]}
                      onclick={() => selectChoice(option, oi)}
                      aria-label="Choice {oi + 1}: {option.english}"
                    >
                      <div class="choice-content">
                        <div class="choice-number">{oi + 1}</div>
                        <div class="choice-text">
                          <div class="choice-romanized">{option.romanized}</div>
                          <div class="choice-amharic">{option.amharic}</div>
                          <div class="choice-english">{option.english}</div>
                        </div>
                        {#if option.audio_url}
                          <div class="choice-audio">
                            <AudioButton src={option.audio_url} />
                          </div>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>

                {#if selectedChoices[i] && (i < currentScene || showFeedback)}
                  <div class="feedback-box" role="status" aria-live="polite">
                    <div class="feedback-icon" aria-hidden="true">💡</div>
                    <div class="feedback-text">{selectedChoices[i].feedback}</div>
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>

        <!-- Navigation controls -->
        {#if !completed}
          <div class="story-controls">
            {#if isChoiceTurn && !currentChoice}
              <p class="hint-text">Choose your response above to continue</p>
            {:else if (isChoiceTurn && currentChoice && showFeedback) || !isChoiceTurn}
              <button class="btn-continue" onclick={continueStory}>
                {currentScene >= chapter.turns.length - 1 ? 'Complete Chapter' : 'Continue Story'} →
              </button>
            {/if}
          </div>
        {/if}
      </main>
    {:else}
      <!-- Completion screen -->
      <main class="completion-screen" role="status" aria-live="polite">
        <div class="completion-icon" aria-hidden="true">🎉</div>
        <h2>Chapter Complete!</h2>
        <p class="completion-message">
          You've successfully navigated through {chapter.title}!
        </p>

        <div class="completion-stats">
          <div class="stat-item">
            <div class="stat-label">XP Earned</div>
            <div class="stat-value xp">+{completionResult?.xp_earned || 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Scenes Completed</div>
            <div class="stat-value">{chapter.turns.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Choices Made</div>
            <div class="stat-value">{selectedChoices.filter(c => c).length}</div>
          </div>
        </div>

        {#if completionResult?.leveled_up}
          <div class="level-up-badge" role="status" aria-live="polite">
            <span aria-hidden="true">🌟</span> Level Up! Now Level {completionResult.level}
          </div>
        {/if}

        <div class="completion-actions">
          <button class="btn-primary" onclick={restartChapter} aria-label="Replay this chapter">
            Replay Chapter
          </button>
          <a href="/games/story-adventure" class="btn-secondary" aria-label="Return to all story chapters">
            All Chapters
          </a>
        </div>
      </main>
    {/if}
  {/if}
</div>

<style>
  .story-page {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 3rem;
  }

  .loading, .error {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .error {
    background: var(--color-bg-surface);
    border-radius: 16px;
    border: 2px solid var(--color-border);
  }

  .error h2 {
    color: var(--color-text-heading);
    margin-bottom: 1.5rem;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .story-header {
    margin-bottom: 2.5rem;
  }

  .back-link {
    display: inline-block;
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: var(--color-accent-primary);
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 2rem;
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  .chapter-desc {
    color: var(--color-text-secondary);
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    height: 6px;
    background: var(--color-bg-elevated);
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-orange));
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 10px;
  }

  .progress-text {
    text-align: right;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 600;
  }

  .story-reader {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
  }

  .scene-history {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .narrative-scene {
    opacity: 0.7;
    transition: opacity 0.3s;
  }

  .narrative-scene.current {
    opacity: 1;
  }

  .scene-speaker {
    color: var(--color-accent-primary);
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dialogue-box {
    background: var(--color-bg-elevated);
    border-left: 4px solid var(--color-accent-primary);
    border-radius: 8px;
    padding: 1.25rem;
  }

  .dialogue-top {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .dialogue-text {
    flex: 1;
  }

  .text-romanized {
    color: var(--color-text-heading);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
    line-height: 1.4;
  }

  .text-amharic {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    margin-bottom: 0.5rem;
  }

  .text-english {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    font-style: italic;
  }

  .choice-scene {
    opacity: 0.5;
    transition: opacity 0.3s;
  }

  .choice-scene.current {
    opacity: 1;
  }

  .choice-prompt {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-text-secondary);
    font-size: 1rem;
    margin-bottom: 1.25rem;
    padding: 1rem;
    background: var(--color-bg-elevated);
    border-radius: 8px;
  }

  .prompt-icon {
    font-size: 1.5rem;
  }

  .choice-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .choice-btn {
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s;
    text-align: left;
  }

  .choice-btn.available {
    border-color: var(--color-border-hover);
  }

  .choice-btn.available:hover {
    border-color: var(--color-accent-primary);
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(233, 69, 96, 0.2);
  }

  .choice-btn.selected {
    border-color: var(--color-accent-green);
    background: rgba(76, 175, 80, 0.1);
  }

  .choice-btn:disabled:not(.selected) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .choice-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
  }

  .choice-number {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent-primary);
    color: #fff;
    border-radius: 50%;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .choice-text {
    flex: 1;
  }

  .choice-romanized {
    color: var(--color-text-heading);
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.3rem;
  }

  .choice-amharic {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    margin-bottom: 0.3rem;
  }

  .choice-english {
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  .choice-audio {
    flex-shrink: 0;
  }

  .feedback-box {
    margin-top: 1rem;
    padding: 1rem 1.25rem;
    background: rgba(76, 175, 80, 0.15);
    border-left: 4px solid var(--color-accent-green);
    border-radius: 8px;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .feedback-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .feedback-text {
    color: var(--color-accent-green);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .story-controls {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid var(--color-border);
    text-align: center;
  }

  .hint-text {
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .btn-continue {
    background: var(--color-accent-primary);
    color: #fff;
    border: none;
    padding: 1rem 2rem;
    border-radius: 10px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-continue:hover {
    background: var(--color-accent-orange);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(233, 69, 96, 0.3);
  }

  .completion-screen {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-green);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }

  .completion-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: bounce 1s ease-in-out;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .completion-screen h2 {
    color: var(--color-text-heading);
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .completion-message {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }

  .completion-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding: 2rem;
    background: var(--color-bg-elevated);
    border-radius: 12px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-label {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  .stat-value {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    font-weight: 700;
  }

  .stat-value.xp {
    color: var(--color-accent-orange);
  }

  .level-up-badge {
    background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-orange));
    color: #fff;
    padding: 1rem 2rem;
    border-radius: 30px;
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 2rem;
    display: inline-block;
  }

  .completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    padding: 0.875rem 1.75rem;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: all 0.3s;
  }

  .btn-primary {
    background: var(--color-accent-primary);
    color: #fff;
    border: none;
  }

  .btn-primary:hover {
    background: var(--color-accent-orange);
    transform: translateY(-2px);
  }

  .btn-secondary {
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    color: var(--color-text-heading);
  }

  .btn-secondary:hover {
    border-color: var(--color-accent-primary);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .story-page {
      padding-bottom: 2rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .story-reader {
      padding: 1.25rem;
    }

    .text-romanized {
      font-size: 1.05rem;
    }

    .choice-romanized {
      font-size: 1rem;
    }

    .completion-stats {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .completion-actions {
      flex-direction: column;
    }

    .btn-primary, .btn-secondary {
      width: 100%;
    }
  }
</style>
