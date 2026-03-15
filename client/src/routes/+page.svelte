<script>
  import { userProgress } from '$lib/stores/progress.js';
  import { getLessons } from '$lib/api.js';
  import { onMount } from 'svelte';

  let progress = $derived($userProgress);
  let recentLessons = $state([]);
  let nextLesson = $state(null);

  onMount(async () => {
    const lessons = await getLessons();
    recentLessons = lessons.filter(l => l.completed).slice(-3).reverse();
    nextLesson = lessons.find(l => !l.completed && !l.locked) || lessons.find(l => !l.completed);
  });

  const LEVEL_TITLES = {
    1: 'Beginner', 2: 'Beginner', 3: 'Learner', 4: 'Learner',
    5: 'Speaker', 6: 'Speaker', 7: 'Speaker',
    8: 'Conversationalist', 9: 'Conversationalist', 10: 'Fluent Speaker'
  };
</script>

<div class="dashboard">
  <header class="hero">
    <h1>Learn to Speak Amharic</h1>
    <p>Master the Ethiopian language through interactive lessons and practice</p>
  </header>

  {#if progress}
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{progress.level}</div>
        <div class="stat-label">{progress.level_title}</div>
        <div class="xp-bar">
          <div class="xp-fill" style="width: {(progress.xp_in_current_level / 100) * 100}%"></div>
        </div>
        <div class="xp-detail">{progress.xp_in_current_level}/100 XP to next level</div>
      </div>

      <div class="stat-card">
        <div class="stat-value streak-value">*{progress.current_streak}</div>
        <div class="stat-label">Day Streak</div>
        <div class="stat-sub">Best: {progress.longest_streak} days</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{progress.lessons_completed}/{progress.total_lessons}</div>
        <div class="stat-label">Lessons Done</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {(progress.lessons_completed / progress.total_lessons) * 100}%"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{progress.vocab_mastered}</div>
        <div class="stat-label">Words Mastered</div>
        <div class="stat-sub">of {progress.total_vocab} total</div>
      </div>
    </div>
  {/if}

  <div class="actions">
    {#if nextLesson}
      <a href="/lessons/{nextLesson.id}" class="action-card primary">
        <div class="action-icon">&#9654;</div>
        <div>
          <h3>Continue Learning</h3>
          <p>{nextLesson.title}</p>
        </div>
      </a>
    {/if}

    <a href="/flashcards" class="action-card">
      <div class="action-icon">&#9649;</div>
      <div>
        <h3>Flashcards</h3>
        <p>Review vocabulary</p>
      </div>
    </a>

    <a href="/quiz" class="action-card">
      <div class="action-icon">?</div>
      <div>
        <h3>Take a Quiz</h3>
        <p>Test your knowledge</p>
      </div>
    </a>

    <a href="/practice" class="action-card">
      <div class="action-icon">&#9998;</div>
      <div>
        <h3>Practice</h3>
        <p>Browse all vocabulary</p>
      </div>
    </a>
  </div>

  {#if recentLessons.length > 0}
    <section class="recent">
      <h2>Recently Completed</h2>
      <div class="recent-list">
        {#each recentLessons as lesson}
          <a href="/lessons/{lesson.id}" class="recent-item">
            <span class="recent-check">done</span>
            <span>{lesson.title}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 800px;
    margin: 0 auto;
  }

  .hero {
    text-align: center;
    margin-bottom: 2rem;
  }

  .hero h1 {
    font-size: 2rem;
    color: #fff;
    margin-bottom: 0.5rem;
  }

  .hero p {
    color: #a8a8b3;
    font-size: 1.1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 1.25rem;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 800;
    color: #fff;
  }

  .streak-value {
    color: #f5a623;
  }

  .stat-label {
    color: #a8a8b3;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .stat-sub {
    color: #666;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }

  .xp-bar, .progress-bar {
    height: 6px;
    background: #2a2a4a;
    border-radius: 3px;
    margin-top: 0.5rem;
    overflow: hidden;
  }

  .xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #e94560, #f5a623);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .progress-fill {
    height: 100%;
    background: #4caf50;
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  .xp-detail {
    color: #666;
    font-size: 0.7rem;
    margin-top: 0.25rem;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 12px;
    padding: 1.25rem;
    text-decoration: none;
    transition: all 0.2s;
  }

  .action-card:hover {
    border-color: #e94560;
    transform: translateY(-2px);
  }

  .action-card.primary {
    border-color: #e94560;
    background: linear-gradient(135deg, #1a1a2e, #16213e);
  }

  .action-icon {
    width: 48px;
    height: 48px;
    background: #2a2a4a;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .action-card h3 {
    color: #fff;
    font-size: 1rem;
    margin: 0;
  }

  .action-card p {
    color: #a8a8b3;
    font-size: 0.8rem;
    margin: 0.15rem 0 0;
  }

  .recent h2 {
    color: #fff;
    font-size: 1.2rem;
    margin-bottom: 0.75rem;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #16213e;
    border-radius: 8px;
    text-decoration: none;
    color: #a8a8b3;
    transition: background 0.2s;
  }

  .recent-item:hover {
    background: #1a1a3e;
  }

  .recent-check {
    color: #4caf50;
    font-size: 0.75rem;
    font-weight: 700;
  }
</style>
