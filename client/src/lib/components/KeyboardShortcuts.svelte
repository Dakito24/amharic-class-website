<script>
  import { goto } from '$app/navigation';

  let showHelp = $state(false);

  const NAV_SHORTCUTS = [
    { key: '1', path: '/', label: 'Home' },
    { key: '2', path: '/lessons', label: 'Lessons' },
    { key: '3', path: '/flashcards', label: 'Flashcards' },
    { key: '4', path: '/quiz', label: 'Quiz' },
    { key: '5', path: '/practice', label: 'Practice' },
    { key: '6', path: '/profile', label: 'Profile' }
  ];

  function handleKeydown(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
      return;
    }

    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
      e.preventDefault();
      showHelp = !showHelp;
      return;
    }

    if (e.key === 'Escape' && showHelp) {
      showHelp = false;
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const nav = NAV_SHORTCUTS.find(s => s.key === e.key);
    if (nav) {
      e.preventDefault();
      goto(nav.path);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showHelp}
  <div class="help-overlay" onclick={() => showHelp = false} onkeydown={(e) => e.key === 'Escape' && (showHelp = false)} role="dialog" aria-label="Keyboard shortcuts">
    <div class="help-modal" onclick={(e) => e.stopPropagation()}>
      <div class="help-header">
        <h2>Keyboard Shortcuts</h2>
        <button class="help-close" onclick={() => showHelp = false}>&times;</button>
      </div>

      <div class="shortcut-group">
        <h3>Navigation</h3>
        {#each NAV_SHORTCUTS as s}
          <div class="shortcut-row">
            <kbd>{s.key}</kbd>
            <span>{s.label}</span>
          </div>
        {/each}
      </div>

      <div class="shortcut-group">
        <h3>Quiz Page</h3>
        <div class="shortcut-row"><kbd>1</kbd>-<kbd>4</kbd><span>Select answer</span></div>
        <div class="shortcut-row"><kbd>Enter</kbd><span>Check / Next question</span></div>
      </div>

      <div class="shortcut-group">
        <h3>Flashcards</h3>
        <div class="shortcut-row"><kbd>Space</kbd><span>Flip card</span></div>
        <div class="shortcut-row"><kbd>1</kbd><span>Didn't know</span></div>
        <div class="shortcut-row"><kbd>2</kbd><span>Hard</span></div>
        <div class="shortcut-row"><kbd>3</kbd><span>Good</span></div>
        <div class="shortcut-row"><kbd>4</kbd><span>Easy</span></div>
      </div>

      <div class="shortcut-group">
        <h3>General</h3>
        <div class="shortcut-row"><kbd>?</kbd><span>Toggle this help</span></div>
        <div class="shortcut-row"><kbd>Esc</kbd><span>Close overlay</span></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .help-modal {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    max-width: 420px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .help-header h2 {
    color: var(--color-text-heading);
    font-size: 1.2rem;
    margin: 0;
  }

  .help-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .help-close:hover {
    color: var(--color-text-heading);
  }

  .shortcut-group {
    margin-bottom: 1.25rem;
  }

  .shortcut-group h3 {
    color: var(--color-accent-primary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 0.5rem;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.3rem 0;
    color: var(--color-text-primary);
    font-size: 0.9rem;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 0.4rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: var(--color-text-heading);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
  }
</style>
