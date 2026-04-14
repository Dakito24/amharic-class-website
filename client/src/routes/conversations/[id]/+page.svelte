<script>
  import { page } from '$app/stores';
  import { getConversation, completeConversation } from '$lib/api.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { loadProgress, triggerLevelUp } from '$lib/stores/progress.js';
  import { onMount } from 'svelte';

  let convo = $state(null);
  let loading = $state(true);
  let currentTurn = $state(0);
  let selectedOptions = $state([]);
  let completed = $state(false);
  let completionResult = $state(null);

  let convoId = $derived(Number($page.params.id));

  onMount(async () => {
    convo = await getConversation(convoId);
    loading = false;
  });

  let visibleTurns = $derived(() => {
    if (!convo) return [];
    return convo.turns.slice(0, currentTurn + 1);
  });

  let currentTurnData = $derived(convo?.turns[currentTurn] || null);
  let isUserTurn = $derived(currentTurnData?.type === 'user');
  let currentFeedback = $derived(selectedOptions[currentTurn] || null);

  function selectOption(option) {
    selectedOptions[currentTurn] = option;
    selectedOptions = [...selectedOptions];
  }

  function advance() {
    if (currentTurn < convo.turns.length - 1) {
      currentTurn++;
      // Auto-advance past NPC turns if the next is also NPC
      if (convo.turns[currentTurn].type === 'npc' && currentTurn + 1 < convo.turns.length && convo.turns[currentTurn + 1].type === 'npc') {
        // Stay on this turn, let user see it
      }
    } else {
      finishConversation();
    }
  }

  async function finishConversation() {
    completed = true;
    completionResult = await completeConversation(convoId);
    if (completionResult.leveled_up) {
      await loadProgress();
      triggerLevelUp();
    } else {
      await loadProgress();
    }
  }
</script>

<div class="convo-page">
  {#if loading}
    <div class="loading">Loading conversation...</div>
  {:else if !convo}
    <div class="empty">
      <h2>Conversation not found</h2>
      <a href="/conversations" class="btn btn-secondary">Back</a>
    </div>
  {:else}
    <a href="/conversations" class="back">&larr; Conversations</a>
    <h1>{convo.title}</h1>
    <p class="description">{convo.description}</p>

    <div class="chat-area">
      {#each visibleTurns() as turn, i}
        {#if turn.type === 'npc'}
          <div class="chat-bubble npc">
            <div class="bubble-speaker">{turn.speaker}</div>
            <div class="bubble-top-row">
              <div class="bubble-text">
                <div class="bubble-romanized">{turn.romanized}</div>
                <div class="bubble-amharic">{turn.amharic}</div>
              </div>
              {#if turn.audio_url}
                <AudioButton src={turn.audio_url} />
              {/if}
            </div>
            <div class="bubble-english">{turn.english}</div>
          </div>
        {:else}
          <div class="user-turn">
            <div class="turn-prompt">{turn.prompt}</div>
            <div class="turn-options">
              {#each turn.options as option, oi}
                <div class="option-row">
                  <button
                    class="option-btn"
                    class:selected={selectedOptions[i]?.romanized === option.romanized}
                    onclick={() => selectOption(option)}
                    disabled={!!selectedOptions[i]}
                  >
                    <div class="opt-romanized">{option.romanized}</div>
                    <div class="opt-english">{option.english}</div>
                  </button>
                  {#if option.audio_url}
                    <AudioButton src={option.audio_url} />
                  {/if}
                </div>
              {/each}
            </div>

            {#if selectedOptions[i]}
              <div class="feedback-bubble">
                <div class="feedback-text">{selectedOptions[i].feedback}</div>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    {#if completed}
      <div class="completion">
        <h2>Conversation Complete!</h2>
        <p class="xp-earned">+{completionResult?.xp_earned || 0} XP</p>
        <div class="completion-actions">
          <a href="/conversations/{convoId}" class="btn btn-primary"
            onclick={(e) => { e.preventDefault(); location.reload(); }}>
            Replay
          </a>
          <a href="/conversations" class="btn btn-secondary">All Conversations</a>
        </div>
      </div>
    {:else if isUserTurn && !currentFeedback}
      <p class="choose-hint">Choose a response above</p>
    {:else if currentFeedback || !isUserTurn}
      <div class="advance-area">
        <button class="btn btn-primary" onclick={advance}>
          {currentTurn >= convo.turns.length - 1 ? 'Finish' : 'Continue'} &rarr;
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .convo-page {
    max-width: 600px;
    margin: 0 auto;
  }

  .loading, .empty {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .empty { background: var(--color-bg-surface); border-radius: 16px; border: 1px solid var(--color-border); }
  .empty h2 { color: var(--color-text-heading); margin-bottom: 1rem; }

  .back {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back:hover { color: var(--color-text-heading); }

  h1 {
    color: var(--color-text-heading);
    font-size: 1.4rem;
    margin: 0.5rem 0 0.25rem;
  }

  .description {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .chat-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .chat-bubble.npc {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px 12px 12px 2px;
    padding: 1rem;
    max-width: 85%;
  }

  .bubble-speaker {
    color: var(--color-accent-primary);
    font-weight: 700;
    font-size: 0.8rem;
    margin-bottom: 0.4rem;
  }

  .bubble-top-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .bubble-text {
    flex: 1;
  }

  .bubble-romanized {
    color: var(--color-text-heading);
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 0.15rem;
  }

  .bubble-amharic {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .bubble-english {
    color: var(--color-text-muted);
    font-size: 0.85rem;
    font-style: italic;
  }

  .user-turn {
    align-self: flex-end;
    max-width: 90%;
    width: 100%;
  }

  .turn-prompt {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
    text-align: right;
  }

  .turn-options {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .option-btn {
    flex: 1;
    padding: 0.75rem 1rem;
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: 12px 12px 2px 12px;
    cursor: pointer;
    text-align: right;
    transition: all 0.2s;
  }

  .option-btn:hover:not(:disabled) {
    border-color: var(--color-accent-primary);
  }

  .option-btn.selected {
    border-color: var(--color-accent-green);
    background: rgba(76, 175, 80, 0.1);
  }

  .option-btn:disabled:not(.selected) {
    opacity: 0.5;
  }

  .opt-romanized {
    color: var(--color-accent-primary);
    font-weight: 600;
    font-size: 0.95rem;
  }

  .opt-english {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
    margin-top: 0.1rem;
  }

  .feedback-bubble {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 8px;
    text-align: right;
  }

  .feedback-text {
    color: var(--color-accent-green);
    font-size: 0.85rem;
  }

  .choose-hint {
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.85rem;
  }

  .advance-area {
    display: flex;
    justify-content: flex-end;
  }

  .completion {
    text-align: center;
    background: var(--color-bg-surface);
    border: 2px solid var(--color-accent-green);
    border-radius: 16px;
    padding: 2rem;
  }

  .completion h2 { color: var(--color-text-heading); }
  .xp-earned { color: var(--color-accent-orange); font-size: 1.5rem; font-weight: 700; margin: 0.5rem 0; }

  .completion-actions {
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
    .option-btn {
      padding: 0.6rem 0.75rem;
    }

    .completion {
      padding: 1.5rem;
    }

    .xp-earned {
      font-size: 1.2rem;
    }
  }
</style>
