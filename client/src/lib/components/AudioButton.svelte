<script>
  let { src } = $props();
  let playing = $state(false);

  // Singleton: stop any currently playing audio
  let currentAudio = null;

  function play(e) {
    e.stopPropagation();
    e.preventDefault();

    if (!src) return;

    // Stop previous audio
    if (window.__amharicAudio) {
      window.__amharicAudio.pause();
      window.__amharicAudio.currentTime = 0;
    }

    const audio = new Audio(src);
    window.__amharicAudio = audio;
    playing = true;

    audio.addEventListener('ended', () => { playing = false; });
    audio.addEventListener('error', () => { playing = false; });
    audio.play().catch(() => { playing = false; });
  }
</script>

{#if src}
  <button class="audio-btn" class:playing onclick={play} aria-label="Play pronunciation" title="Play pronunciation">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      {#if playing}
        <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
      {:else}
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      {/if}
    </svg>
  </button>
{/if}

<style>
  .audio-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: rgba(233, 69, 96, 0.15);
    color: var(--color-accent-primary);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    flex-shrink: 0;
  }

  .audio-btn:hover {
    background: rgba(233, 69, 96, 0.3);
    transform: scale(1.1);
  }

  .audio-btn.playing {
    background: var(--color-accent-primary);
    color: white;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
</style>
