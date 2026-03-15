<script>
  import { showLevelUp, userProgress } from '../stores/progress.js';

  let visible = $derived($showLevelUp);
  let progress = $derived($userProgress);
</script>

{#if visible}
  <div class="overlay" role="dialog" aria-label="Level up notification">
    <div class="modal">
      <div class="stars">* * *</div>
      <h2>Level Up!</h2>
      <div class="level-number">Level {progress?.level}</div>
      <p class="level-title">{progress?.level_title}</p>
      <p class="sub">Keep going! You're making great progress.</p>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  .modal {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid #e94560;
    border-radius: 16px;
    padding: 2.5rem;
    text-align: center;
    animation: scaleIn 0.4s ease;
    box-shadow: 0 0 40px rgba(233, 69, 96, 0.3);
  }

  .stars {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    letter-spacing: 0.5rem;
    color: #f5a623;
  }

  h2 {
    color: #e94560;
    font-size: 2rem;
    margin: 0;
  }

  .level-number {
    font-size: 3rem;
    font-weight: 800;
    color: #fff;
    margin: 0.5rem 0;
  }

  .level-title {
    color: #f5a623;
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0;
  }

  .sub {
    color: #a8a8b3;
    margin-top: 1rem;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
</style>
