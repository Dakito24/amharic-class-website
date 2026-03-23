<script>
  const games = [
    {
      id: 'daily-challenge',
      title: 'Daily Challenge',
      description: 'Complete a unique challenge every day. Build your streak!',
      icon: '📅',
      difficulty: 'Varies',
      xp: '10-50 XP'
    },
    {
      id: 'whack-a-word',
      title: 'Whack-a-Word',
      description: 'Click the correct translation as words pop up. Fast reflexes required!',
      icon: '🔨',
      difficulty: 'Medium',
      xp: '20-100 XP'
    },
    {
      id: 'endless-runner',
      title: 'Endless Runner',
      description: 'Run through Ethiopia answering vocab questions to avoid obstacles!',
      icon: '🏃',
      difficulty: 'Hard',
      xp: '30-200 XP'
    },
    {
      id: 'picture-match',
      title: 'Picture Match',
      description: 'Match images to the correct Amharic words. Perfect for visual learners!',
      icon: '🖼️',
      difficulty: 'Easy',
      xp: '15-60 XP'
    },
    {
      id: 'story-adventure',
      title: 'Story Adventure',
      description: 'Interactive story where you make choices using Amharic phrases!',
      icon: '📖',
      difficulty: 'Medium',
      xp: '50-150 XP'
    }
  ];
</script>

<div class="games-page">
  <div class="header">
    <h1>Games</h1>
    <p class="subtitle">Practice Amharic while having fun!</p>
  </div>

  <div class="games-grid">
    {#each games as game}
      <a href="/games/{game.id}" class="game-card">
        <div class="game-icon">{game.icon}</div>
        <h2>{game.title}</h2>
        <p class="game-description">{game.description}</p>
        <div class="game-meta">
          <span class="difficulty difficulty-{game.difficulty.toLowerCase()}">{game.difficulty}</span>
          <span class="xp">{game.xp}</span>
        </div>
        <div class="play-btn">Play Now →</div>
      </a>
    {/each}
  </div>
</div>

<style>
  .games-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .game-card {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 16px;
    padding: 2rem;
    text-decoration: none;
    transition: all 0.3s;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .game-card:hover {
    transform: translateY(-4px);
    border-color: var(--color-accent-primary);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.2);
  }

  .game-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    text-align: center;
  }

  .game-card h2 {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .game-description {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
    margin-bottom: 1.5rem;
    flex: 1;
  }

  .game-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .difficulty {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .difficulty-easy {
    background: rgba(76, 175, 80, 0.2);
    color: var(--color-accent-green);
  }

  .difficulty-medium {
    background: rgba(245, 166, 35, 0.2);
    color: var(--color-accent-orange);
  }

  .difficulty-hard {
    background: rgba(233, 69, 96, 0.2);
    color: var(--color-accent-primary);
  }

  .difficulty-varies {
    background: rgba(33, 150, 243, 0.2);
    color: var(--color-accent-blue);
  }

  .xp {
    color: var(--color-accent-orange);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .play-btn {
    background: var(--color-accent-primary);
    color: #fff;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    transition: all 0.2s;
  }

  .game-card:hover .play-btn {
    background: var(--color-accent-orange);
  }

  @media (max-width: 768px) {
    .games-grid {
      grid-template-columns: 1fr;
    }

    h1 {
      font-size: 2rem;
    }
  }
</style>
