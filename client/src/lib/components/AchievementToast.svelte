<script>
  import { newAchievements } from '../stores/progress.js';

  let achievements = $derived($newAchievements);

  function dismiss() {
    newAchievements.set([]);
  }

  $effect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(dismiss, 5000);
      return () => clearTimeout(timer);
    }
  });
</script>

{#if achievements.length > 0}
  <div class="toast-container">
    {#each achievements as achievement}
      <div class="toast">
        <div class="toast-icon">!</div>
        <div class="toast-content">
          <strong>Achievement Unlocked!</strong>
          <span>{achievement.title}</span>
          <small>{achievement.description}</small>
        </div>
        <button class="toast-close" onclick={dismiss}>x</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 80px;
    right: 1rem;
    z-index: 999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: linear-gradient(135deg, var(--color-bg-surface), var(--color-bg-elevated));
    border: 1px solid var(--color-accent-orange);
    border-radius: 12px;
    padding: 1rem;
    animation: slideIn 0.4s ease;
    box-shadow: 0 4px 20px rgba(245, 166, 35, 0.2);
    min-width: 280px;
  }

  .toast-icon {
    width: 40px;
    height: 40px;
    background: var(--color-accent-orange);
    color: #1a1a2e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .toast-content {
    display: flex;
    flex-direction: column;
  }

  .toast-content strong {
    color: var(--color-accent-orange);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .toast-content span {
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .toast-content small {
    color: var(--color-text-secondary);
    font-size: 0.8rem;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 1rem;
    padding: 0.25rem;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
