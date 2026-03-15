<script>
  let { lesson } = $props();
</script>

<a
  href={lesson.locked ? undefined : `/lessons/${lesson.id}`}
  class="card"
  class:completed={lesson.completed}
  class:locked={lesson.locked}
>
  <div class="card-status">
    {#if lesson.completed}
      <span class="check">done</span>
    {:else if lesson.locked}
      <span class="lock">locked</span>
    {:else}
      <span class="dot"></span>
    {/if}
  </div>
  <div class="card-body">
    <div class="card-meta">Unit {lesson.unit} &middot; Lesson {lesson.order_num}</div>
    <h3 class="card-title">{lesson.title}</h3>
    <p class="card-desc">{lesson.description}</p>
  </div>
  <div class="card-xp">+{lesson.xp_reward} XP</div>
</a>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 1.25rem;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
  }

  .card:hover:not(.locked) {
    border-color: #e94560;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(233, 69, 96, 0.15);
  }

  .card.completed {
    border-color: #4caf50;
    opacity: 0.85;
  }

  .card.locked {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .card-status {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .check {
    width: 32px;
    height: 32px;
    background: #4caf50;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .lock {
    color: #666;
    font-size: 0.7rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    background: #e94560;
    border-radius: 50%;
  }

  .card-body {
    flex: 1;
  }

  .card-meta {
    font-size: 0.75rem;
    color: #a8a8b3;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.25rem;
  }

  .card-title {
    color: #fff;
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
  }

  .card-desc {
    color: #a8a8b3;
    margin: 0;
    font-size: 0.85rem;
  }

  .card-xp {
    color: #f5a623;
    font-weight: 700;
    font-size: 0.9rem;
    white-space: nowrap;
  }
</style>
