<script>
  import { getVocabulary, submitGameScore } from '$lib/api.js';
  import { loadProgress } from '$lib/stores/progress.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { onMount, onDestroy } from 'svelte';

  // Game states
  const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    JUMPING: 'jumping',
    COLLISION: 'collision',
    QUESTION: 'question',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
  };

  // Physics constants
  const GRAVITY = 0.8;
  const JUMP_FORCE = -16;
  const GROUND_Y = 0;
  const PLAYER_X = 100;
  const OBSTACLE_SPAWN_X = 800;
  const COLLISION_DISTANCE = 60;

  // State variables
  let gameState = $state(GAME_STATE.MENU);
  let vocabulary = $state([]);
  let loading = $state(true);
  let loadError = $state(false);

  // Game metrics
  let distance = $state(0);
  let score = $state(0);
  let lives = $state(3);
  let speed = $state(6);

  // Player physics
  let playerY = $state(GROUND_Y);
  let jumpVelocity = $state(0);
  let isJumping = $state(false);
  let canJump = $state(true);

  // Obstacles & Questions
  let obstacles = $state([]);
  let nextObstacleDistance = $state(0);
  let currentQuestion = $state(null);
  let questionOptions = $state([]);
  let collidedObstacle = $state(null);

  // Animations
  let animationFrame = $state(null);
  let lastTimestamp = $state(0);
  let runCycle = $state(0);
  let backgroundOffset = $state(0);
  let mountainOffset = $state(0);
  let dustParticles = $state([]);

  // High scores
  let highScore = $state(0);
  let bestDistance = $state(0);

  // Keyboard state
  let spacePressed = $state(false);

  onMount(async () => {
    // Load vocabulary
    try {
      const allVocab = await getVocabulary();
      vocabulary = allVocab.filter(v => v.amharic && v.english);
      if (vocabulary.length === 0) {
        loadError = true;
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
      vocabulary = [];
      loadError = true;
    } finally {
      loading = false;
    }

    // Load high scores
    const saved = localStorage.getItem('endless-runner-high-score');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        highScore = data.score || 0;
        bestDistance = data.distance || 0;
      } catch (error) {
        console.error('Failed to load high scores:', error);
      }
    }
  });

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  function startGame() {
    if (vocabulary.length === 0) return;

    gameState = GAME_STATE.PLAYING;
    distance = 0;
    score = 0;
    lives = 3;
    speed = 6;
    playerY = GROUND_Y;
    jumpVelocity = 0;
    isJumping = false;
    canJump = true;
    obstacles = [];
    dustParticles = [];
    nextObstacleDistance = 150;
    currentQuestion = null;
    collidedObstacle = null;
    backgroundOffset = 0;
    mountainOffset = 0;
    runCycle = 0;
    lastTimestamp = performance.now();

    gameLoop(lastTimestamp);
  }

  function jump() {
    if (canJump && !isJumping && gameState === GAME_STATE.PLAYING) {
      isJumping = true;
      canJump = false;
      jumpVelocity = JUMP_FORCE;
      gameState = GAME_STATE.JUMPING;

      // Create dust particles
      createDustParticles();
    }
  }

  function createDustParticles() {
    for (let i = 0; i < 5; i++) {
      dustParticles.push({
        id: Date.now() + i,
        x: PLAYER_X + Math.random() * 30 - 15,
        y: 80,
        vx: -(2 + Math.random() * 2),
        vy: -(2 + Math.random() * 3),
        life: 1.0
      });
    }
  }

  function gameLoop(timestamp) {
    if (gameState !== GAME_STATE.PLAYING && gameState !== GAME_STATE.JUMPING) {
      return;
    }

    const deltaTime = Math.min(timestamp - lastTimestamp, 32); // Cap at ~30fps minimum
    lastTimestamp = timestamp;
    const normalizedDelta = deltaTime / 16.67; // Normalize to 60fps

    // Update distance and score
    distance += speed * normalizedDelta;
    score = Math.floor(distance / 10);

    // Gradually increase speed
    speed = 6 + Math.floor(distance / 1000) * 0.5;

    // Update background parallax
    backgroundOffset = (backgroundOffset + speed * normalizedDelta * 0.5) % 800;
    mountainOffset = (mountainOffset + speed * normalizedDelta * 0.2) % 800;

    // Update run animation
    runCycle = (runCycle + speed * normalizedDelta * 0.1) % 4;

    // Physics: Apply gravity and update player position
    if (isJumping) {
      jumpVelocity += GRAVITY * normalizedDelta;
      playerY += jumpVelocity * normalizedDelta;

      // Check if landed
      if (playerY >= GROUND_Y) {
        playerY = GROUND_Y;
        jumpVelocity = 0;
        isJumping = false;
        canJump = true;
        if (gameState === GAME_STATE.JUMPING) {
          gameState = GAME_STATE.PLAYING;
        }
        createDustParticles();
      }
    }

    // Spawn obstacles
    if (distance >= nextObstacleDistance) {
      createObstacle();
      nextObstacleDistance = distance + 200 + Math.random() * 150;
    }

    // Update obstacles
    obstacles = obstacles.map(obs => ({
      ...obs,
      x: obs.x - speed * normalizedDelta
    })).filter(obs => obs.x > -100);

    // Check collisions
    checkCollisions();

    // Update dust particles
    dustParticles = dustParticles.map(p => ({
      ...p,
      x: p.x + p.vx * normalizedDelta,
      y: p.y + p.vy * normalizedDelta,
      vy: p.vy + 0.2 * normalizedDelta,
      life: p.life - 0.02 * normalizedDelta
    })).filter(p => p.life > 0);

    // Random dust particles while running
    if (Math.random() < 0.1 && !isJumping) {
      dustParticles.push({
        id: Date.now() + Math.random(),
        x: PLAYER_X + 20,
        y: 85,
        vx: -(1 + Math.random()),
        vy: -(0.5 + Math.random()),
        life: 0.5
      });
    }

    animationFrame = requestAnimationFrame(gameLoop);
  }

  function createObstacle() {
    const types = [
      { emoji: '🌳', width: 40 },
      { emoji: '🪨', width: 35 },
      { emoji: '🌵', width: 40 },
      { emoji: '🏔️', width: 45 },
      { emoji: '🐪', width: 40 }
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    obstacles.push({
      id: Date.now(),
      x: OBSTACLE_SPAWN_X,
      type: type.emoji,
      width: type.width,
      hit: false
    });
  }

  function checkCollisions() {
    for (const obstacle of obstacles) {
      if (obstacle.hit) continue;

      const obstacleLeft = obstacle.x;
      const obstacleRight = obstacle.x + obstacle.width;
      const playerLeft = PLAYER_X;
      const playerRight = PLAYER_X + 50;
      const playerBottom = 80 + playerY;
      const obstacleTop = 80 + 50; // Obstacles are ~50px tall

      // Check if player overlaps with obstacle horizontally
      const horizontalOverlap = playerRight > obstacleLeft && playerLeft < obstacleRight;

      // Check if player is low enough to collide (not jumping over)
      const verticalCollision = playerBottom < obstacleTop + 30;

      if (horizontalOverlap && verticalCollision) {
        handleCollision(obstacle);
        break;
      }
    }
  }

  function handleCollision(obstacle) {
    obstacle.hit = true;
    collidedObstacle = obstacle;

    // Pause game and show question
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    gameState = GAME_STATE.COLLISION;

    // Small delay before showing question
    setTimeout(() => {
      showQuestion();
    }, 300);
  }

  function showQuestion() {
    gameState = GAME_STATE.QUESTION;

    // Get random vocab word
    const word = vocabulary[Math.floor(Math.random() * vocabulary.length)];

    // Generate wrong answers
    const wrongAnswers = [];
    while (wrongAnswers.length < 3) {
      const wrong = vocabulary[Math.floor(Math.random() * vocabulary.length)];
      if (wrong.id !== word.id && !wrongAnswers.find(w => w.id === wrong.id)) {
        wrongAnswers.push(wrong);
      }
    }

    // Shuffle options
    const allOptions = [
      { text: word.english, correct: true },
      ...wrongAnswers.map(w => ({ text: w.english, correct: false }))
    ].sort(() => Math.random() - 0.5);

    currentQuestion = {
      romanized: word.amharic,
      amharic: word.geez || word.amharic,
      audio_url: word.audio_url,
      correctAnswer: word.english
    };
    questionOptions = allOptions;
  }

  function answerQuestion(option) {
    if (option.correct) {
      // Correct answer - resume game, no penalty
      score += 50;
      resumeAfterQuestion();
    } else {
      // Wrong answer - lose 1 life
      lives--;

      if (lives <= 0) {
        endGame();
      } else {
        resumeAfterQuestion();
      }
    }
  }

  function resumeAfterQuestion() {
    currentQuestion = null;
    collidedObstacle = null;
    gameState = GAME_STATE.PLAYING;
    lastTimestamp = performance.now();
    gameLoop(lastTimestamp);
  }

  function pauseGame() {
    if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.JUMPING) {
      gameState = GAME_STATE.PAUSED;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    }
  }

  function resumeGame() {
    if (gameState === GAME_STATE.PAUSED) {
      gameState = GAME_STATE.PLAYING;
      lastTimestamp = performance.now();
      gameLoop(lastTimestamp);
    }
  }

  async function endGame() {
    gameState = GAME_STATE.GAME_OVER;

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // Update high scores
    if (score > highScore) {
      highScore = score;
      bestDistance = Math.floor(distance);
      localStorage.setItem('endless-runner-high-score', JSON.stringify({
        score: highScore,
        distance: bestDistance
      }));
    }

    // Submit score to server
    try {
      await submitGameScore('endless-runner', score, null, {
        distance: Math.floor(distance),
        lives_remaining: lives
      });
      await loadProgress();
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Spacebar to jump
    if (e.code === 'Space' && !spacePressed) {
      e.preventDefault();
      spacePressed = true;
      if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.JUMPING) {
        jump();
      }
    }

    // P to pause
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.JUMPING) {
        pauseGame();
      } else if (gameState === GAME_STATE.PAUSED) {
        resumeGame();
      }
    }

    // Number keys for question answers
    if (gameState === GAME_STATE.QUESTION) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= questionOptions.length) {
        e.preventDefault();
        answerQuestion(questionOptions[num - 1]);
      }
    }
  }

  function handleKeyup(e) {
    if (e.code === 'Space') {
      spacePressed = false;
    }
  }

  // Derived values
  let distanceMeters = $derived(Math.floor(distance));
  let runFrame = $derived(Math.floor(runCycle));
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="endless-runner">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading Ethiopian landscape...</p>
    </div>
  {:else if loadError}
    <div class="error-screen">
      <h1>Error Loading Game</h1>
      <p>Failed to load vocabulary. Please try refreshing the page.</p>
      <a href="/games" class="back-btn">Back to Games</a>
    </div>
  {:else if gameState === GAME_STATE.MENU}
    <div class="start-screen">
      <h1>Endless Runner</h1>
      <div class="game-description">
        <p>Run through the Ethiopian highlands and test your vocabulary!</p>
      </div>

      <div class="game-rules">
        <h3>How to Play:</h3>
        <ul>
          <li>Press <kbd>SPACE</kbd> to jump over obstacles</li>
          <li>If you hit an obstacle, answer a vocabulary question</li>
          <li>Correct answer: Continue running</li>
          <li>Wrong answer: Lose 1 life (❤️)</li>
          <li>Game over when all 3 lives are lost</li>
          <li>Press <kbd>P</kbd> to pause</li>
        </ul>
      </div>

      {#if highScore > 0}
        <div class="high-scores">
          <div class="stat-box">
            <span class="label">High Score</span>
            <span class="value">{highScore}</span>
          </div>
          <div class="stat-box">
            <span class="label">Best Distance</span>
            <span class="value">{bestDistance}m</span>
          </div>
        </div>
      {/if}

      <button class="start-btn" onclick={startGame} disabled={vocabulary.length === 0}>
        {vocabulary.length === 0 ? 'No Vocabulary Available' : 'Start Running'}
      </button>
    </div>
  {:else}
    <!-- Game HUD -->
    <div class="game-hud">
      <div class="hud-left">
        <div class="lives">
          {#each Array(3) as _, i}
            <span class="heart" class:lost={i >= lives}>❤️</span>
          {/each}
        </div>
      </div>

      <div class="hud-center">
        <div class="score-display">
          <div class="distance">{distanceMeters}m</div>
          <div class="score">{score} pts</div>
        </div>
      </div>

      <div class="hud-right">
        {#if gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.JUMPING}
          <button class="pause-btn" onclick={pauseGame}>⏸</button>
        {/if}
      </div>
    </div>

    <!-- Game Canvas -->
    <div class="game-canvas">
      <!-- Parallax Background Layers -->
      <div class="sky-layer"></div>

      <div class="mountains-layer" style="transform: translateX(-{mountainOffset}px)">
        <div class="mountains-content"></div>
        <div class="mountains-content"></div>
      </div>

      <div class="hills-layer" style="transform: translateX(-{backgroundOffset * 0.6}px)">
        <div class="hills-content"></div>
        <div class="hills-content"></div>
      </div>

      <div class="ground-layer" style="transform: translateX(-{backgroundOffset}px)">
        <div class="ground-content"></div>
        <div class="ground-content"></div>
      </div>

      <!-- Player Character -->
      <div
        class="player"
        class:jumping={isJumping}
        data-frame={runFrame}
        style="bottom: {80 + playerY}px"
      >
        <div class="character">🏃🏾</div>
      </div>

      <!-- Jump Hint -->
      {#if gameState === GAME_STATE.PLAYING && canJump && distance < 100}
        <div class="jump-hint">Press SPACE to jump</div>
      {/if}

      <!-- Obstacles -->
      {#each obstacles as obstacle (obstacle.id)}
        <div
          class="obstacle"
          class:hit={obstacle.hit}
          style="left: {obstacle.x}px"
        >
          {obstacle.type}
        </div>
      {/each}

      <!-- Dust Particles -->
      {#each dustParticles as particle (particle.id)}
        <div
          class="dust-particle"
          style="left: {particle.x}px; bottom: {particle.y}px; opacity: {particle.life}"
        ></div>
      {/each}

      <!-- Ground Line -->
      <div class="ground-line"></div>
    </div>

    <!-- Question Modal -->
    {#if gameState === GAME_STATE.QUESTION && currentQuestion}
      <div class="question-modal">
        <div class="question-content">
          <div class="collision-header">
            <span class="collision-icon">💥</span>
            <h2>Obstacle Hit! Answer to continue</h2>
          </div>

          <div class="word-display">
            <div class="romanized">{currentQuestion.romanized}</div>
            {#if currentQuestion.amharic}
              <div class="geez">{currentQuestion.amharic}</div>
            {/if}
            {#if currentQuestion.audio_url}
              <div class="audio-container">
                <AudioButton src={currentQuestion.audio_url} />
              </div>
            {/if}
          </div>

          <div class="answer-options">
            {#each questionOptions as option, i}
              <button
                class="option-btn"
                onclick={() => answerQuestion(option)}
              >
                <span class="option-num">{i + 1}</span>
                <span class="option-text">{option.text}</span>
              </button>
            {/each}
          </div>

          <p class="hint">Press 1-4 or click to answer</p>
        </div>
      </div>
    {/if}

    <!-- Pause Menu -->
    {#if gameState === GAME_STATE.PAUSED}
      <div class="pause-modal">
        <div class="pause-content">
          <h2>⏸ Paused</h2>
          <div class="pause-stats">
            <div class="stat-row">Distance: {distanceMeters}m</div>
            <div class="stat-row">Score: {score}</div>
            <div class="stat-row">Lives: {lives}/3</div>
          </div>
          <div class="pause-buttons">
            <button class="resume-btn" onclick={resumeGame}>Resume (P)</button>
            <button class="quit-btn" onclick={() => gameState = GAME_STATE.MENU}>
              Quit to Menu
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Game Over Screen -->
    {#if gameState === GAME_STATE.GAME_OVER}
      <div class="gameover-modal">
        <div class="gameover-content">
          <h1>Game Over</h1>

          <div class="final-stats">
            <div class="stat-card">
              <div class="stat-label">Distance</div>
              <div class="stat-value">{distanceMeters}m</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Score</div>
              <div class="stat-value">{score}</div>
            </div>
          </div>

          {#if score >= highScore && score > 0}
            <div class="new-record">New High Score!</div>
          {/if}

          <div class="gameover-buttons">
            <button class="play-again-btn" onclick={startGame}>Play Again</button>
            <a href="/games" class="back-btn">Back to Games</a>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .endless-runner {
    width: 100%;
    height: calc(100vh - 60px);
    background: var(--color-bg-body);
    position: relative;
    overflow: hidden;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: var(--color-text-primary);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error Screen */
  .error-screen {
    max-width: 600px;
    margin: 0 auto;
    padding: 3rem 2rem;
    text-align: center;
  }

  .error-screen h1 {
    color: var(--color-accent-red);
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .error-screen p {
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
  }

  /* Start Screen */
  .start-screen {
    max-width: 700px;
    margin: 0 auto;
    padding: 3rem 2rem;
    text-align: center;
  }

  .start-screen h1 {
    color: var(--color-text-heading);
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .game-description {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }

  .game-rules {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    margin: 2rem 0;
    text-align: left;
  }

  .game-rules h3 {
    color: var(--color-text-heading);
    margin-bottom: 1rem;
  }

  .game-rules ul {
    list-style: none;
    color: var(--color-text-primary);
  }

  .game-rules li {
    padding: 0.5rem 0;
    padding-left: 1.5rem;
    position: relative;
  }

  .game-rules li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--color-accent-primary);
  }

  kbd {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.2rem 0.6rem;
    font-family: monospace;
    font-weight: 600;
    font-size: 0.9em;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .high-scores {
    display: flex;
    gap: 2rem;
    justify-content: center;
    margin: 2rem 0;
  }

  .stat-box {
    background: var(--color-bg-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-box .label {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-box .value {
    color: var(--color-accent-orange);
    font-size: 2rem;
    font-weight: 700;
  }

  .start-btn {
    background: linear-gradient(135deg, #009639, #FEDD00);
    color: #000;
    font-size: 1.3rem;
    font-weight: 700;
    padding: 1rem 3rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 150, 57, 0.3);
  }

  .start-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 150, 57, 0.5);
  }

  .start-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .start-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Game HUD */
  .game-hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
    z-index: 20;
    pointer-events: none;
  }

  .game-hud > * {
    pointer-events: auto;
  }

  .lives {
    display: flex;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.75rem 1.25rem;
    border-radius: 50px;
    backdrop-filter: blur(10px);
  }

  .heart {
    font-size: 1.8rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .heart.lost {
    opacity: 0.2;
    filter: grayscale(1);
    transform: scale(0.8);
  }

  .score-display {
    display: flex;
    gap: 2rem;
    background: rgba(0, 0, 0, 0.7);
    padding: 0.75rem 2rem;
    border-radius: 50px;
    backdrop-filter: blur(10px);
    font-weight: 700;
  }

  .distance {
    color: #FEDD00;
    font-size: 1.3rem;
  }

  .score {
    color: #009639;
    font-size: 1.3rem;
  }

  .pause-btn {
    background: rgba(0, 0, 0, 0.7);
    border: 2px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 0.75rem 1.25rem;
    border-radius: 50px;
    cursor: pointer;
    font-size: 1.3rem;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  }

  .pause-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: var(--color-accent-orange);
  }

  /* Game Canvas */
  .game-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* Background Layers - Parallax */
  .sky-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 65%;
    background: linear-gradient(to bottom,
      #87CEEB 0%,
      #B0E0E6 50%,
      #FFE5B4 100%
    );
  }

  .mountains-layer {
    position: absolute;
    bottom: 200px;
    left: 0;
    width: 100%;
    height: 300px;
    display: flex;
  }

  .mountains-content {
    min-width: 800px;
    height: 100%;
    background-image:
      linear-gradient(135deg, transparent 30%, rgba(101, 67, 33, 0.6) 30%, rgba(101, 67, 33, 0.6) 35%, transparent 35%),
      linear-gradient(145deg, transparent 25%, rgba(139, 90, 43, 0.7) 25%, rgba(139, 90, 43, 0.7) 32%, transparent 32%),
      linear-gradient(125deg, transparent 40%, rgba(160, 82, 45, 0.5) 40%, rgba(160, 82, 45, 0.5) 48%, transparent 48%);
    background-size: 600px 100%;
    background-repeat: repeat-x;
  }

  .hills-layer {
    position: absolute;
    bottom: 120px;
    left: 0;
    width: 100%;
    height: 150px;
    display: flex;
  }

  .hills-content {
    min-width: 800px;
    height: 100%;
    background-image:
      radial-gradient(ellipse at 10% 100%, rgba(34, 139, 34, 0.8) 0%, rgba(34, 139, 34, 0.8) 30%, transparent 30%),
      radial-gradient(ellipse at 35% 100%, rgba(46, 125, 50, 0.7) 0%, rgba(46, 125, 50, 0.7) 35%, transparent 35%),
      radial-gradient(ellipse at 60% 100%, rgba(56, 142, 60, 0.6) 0%, rgba(56, 142, 60, 0.6) 32%, transparent 32%),
      radial-gradient(ellipse at 85% 100%, rgba(67, 160, 71, 0.7) 0%, rgba(67, 160, 71, 0.7) 28%, transparent 28%);
    background-size: 400px 100%;
    background-repeat: repeat-x;
  }

  .ground-layer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 120px;
    display: flex;
  }

  .ground-content {
    min-width: 800px;
    height: 100%;
    background: linear-gradient(to bottom,
      #8B7355 0%,
      #6F5438 50%,
      #654321 100%
    );
    border-top: 4px solid #4a3214;
    position: relative;
  }

  .ground-content::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 0;
    right: 0;
    height: 20px;
    background-image: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 10px,
      rgba(0,0,0,0.1) 10px,
      rgba(0,0,0,0.1) 12px
    );
  }

  .ground-line {
    position: absolute;
    bottom: 80px;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  /* Player Character */
  .player {
    position: absolute;
    left: 100px;
    z-index: 10;
    transition: bottom 0.05s linear;
  }

  .character {
    font-size: 4rem;
    filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.4));
    animation: run 0.4s steps(4) infinite;
  }

  .player.jumping .character {
    animation: jumpRotate 0.6s ease-out;
  }

  @keyframes run {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes jumpRotate {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-10deg) scale(1.1); }
    50% { transform: rotate(-5deg) scale(1.15); }
    75% { transform: rotate(5deg) scale(1.1); }
    100% { transform: rotate(0deg) scale(1); }
  }

  /* Jump Hint */
  .jump-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: #FEDD00;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1.3rem;
    font-weight: 700;
    animation: pulse 2s ease-in-out infinite;
    z-index: 15;
    backdrop-filter: blur(10px);
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  }

  /* Obstacles */
  .obstacle {
    position: absolute;
    bottom: 80px;
    font-size: 3.5rem;
    z-index: 9;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
    transition: opacity 0.3s;
  }

  .obstacle.hit {
    opacity: 0.5;
    filter: drop-shadow(0 0 15px rgba(255, 0, 0, 0.8));
  }

  /* Dust Particles */
  .dust-particle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: rgba(139, 115, 85, 0.6);
    border-radius: 50%;
    z-index: 2;
    pointer-events: none;
  }

  /* Question Modal */
  .question-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.3s;
    backdrop-filter: blur(8px);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .question-content {
    background: var(--color-bg-surface);
    border: 4px solid #EF2118;
    border-radius: 20px;
    padding: 2.5rem;
    max-width: 650px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn {
    from { transform: translateY(-50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .collision-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .collision-icon {
    font-size: 2.5rem;
    animation: shake 0.5s;
  }

  @keyframes shake {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(10deg); }
  }

  .collision-header h2 {
    color: var(--color-text-heading);
    font-size: 1.5rem;
    margin: 0;
  }

  .word-display {
    text-align: center;
    padding: 2rem;
    background: var(--color-bg-elevated);
    border-radius: 16px;
    margin-bottom: 2rem;
  }

  .romanized {
    font-size: 2.5rem;
    color: var(--color-accent-orange);
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .geez {
    font-size: 2rem;
    color: var(--color-text-secondary);
    font-family: 'Noto Sans Ethiopic', serif;
    margin-bottom: 0.75rem;
  }

  .audio-container {
    margin-top: 0.75rem;
  }

  .answer-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .option-btn {
    background: var(--color-bg-elevated);
    border: 3px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 1.25rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .option-btn:hover {
    background: var(--color-accent-primary);
    color: #fff;
    border-color: var(--color-accent-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 150, 57, 0.3);
  }

  .option-num {
    background: rgba(255, 255, 255, 0.2);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    flex-shrink: 0;
  }

  .option-text {
    flex: 1;
    text-align: left;
  }

  .hint {
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    margin: 0;
  }

  /* Pause Modal */
  .pause-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(10px);
  }

  .pause-content {
    background: var(--color-bg-surface);
    border: 3px solid var(--color-border);
    border-radius: 20px;
    padding: 2.5rem;
    text-align: center;
    max-width: 400px;
  }

  .pause-content h2 {
    color: var(--color-text-heading);
    font-size: 2rem;
    margin-bottom: 1.5rem;
  }

  .pause-stats {
    background: var(--color-bg-elevated);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-row {
    padding: 0.5rem;
    color: var(--color-text-primary);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .pause-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .resume-btn, .quit-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .resume-btn {
    background: var(--color-accent-green);
    color: #fff;
    border: none;
  }

  .resume-btn:hover {
    background: #3d9140;
    transform: translateY(-2px);
  }

  .quit-btn {
    background: transparent;
    border: 2px solid var(--color-border);
    color: var(--color-text-primary);
  }

  .quit-btn:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-accent-primary);
  }

  /* Game Over Modal */
  .gameover-modal {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .gameover-content {
    background: var(--color-bg-surface);
    border: 4px solid var(--color-accent-red);
    border-radius: 20px;
    padding: 3rem;
    text-align: center;
    max-width: 600px;
    width: 90%;
    animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .gameover-content h1 {
    color: var(--color-accent-red);
    font-size: 3rem;
    margin-bottom: 2rem;
  }

  .final-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--color-bg-elevated);
    border-radius: 16px;
    padding: 2rem 1rem;
  }

  .stat-label {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    color: var(--color-accent-orange);
    font-size: 2.5rem;
    font-weight: 700;
  }

  .new-record {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    padding: 1.25rem;
    border-radius: 12px;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    animation: recordPulse 1s ease-in-out infinite;
  }

  @keyframes recordPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  .gameover-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .play-again-btn {
    background: var(--color-accent-green);
    color: #fff;
    padding: 1rem 2.5rem;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .play-again-btn:hover {
    background: #3d9140;
    transform: translateY(-2px);
  }

  .back-btn {
    background: transparent;
    border: 3px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 1rem 2.5rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s;
  }

  .back-btn:hover {
    background: var(--color-bg-elevated);
    border-color: var(--color-accent-primary);
  }

  @media (max-width: 768px) {
    .game-hud {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .score-display {
      gap: 1rem;
      padding: 0.5rem 1.5rem;
    }

    .distance, .score {
      font-size: 1.1rem;
    }

    .answer-options {
      grid-template-columns: 1fr;
    }

    .final-stats {
      grid-template-columns: 1fr;
    }

    .gameover-buttons {
      flex-direction: column;
    }

    .player .character,
    .obstacle {
      font-size: 3rem;
    }
  }
</style>
