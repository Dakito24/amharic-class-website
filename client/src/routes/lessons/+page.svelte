<script>
  import LessonCard from '$lib/components/LessonCard.svelte';
  import { getLessons } from '$lib/api.js';
  import { onMount } from 'svelte';

  let lessons = $state([]);
  let loading = $state(true);

  onMount(async () => {
    lessons = await getLessons();
    loading = false;
  });

  let units = $derived(() => {
    const grouped = {};
    for (const lesson of lessons) {
      if (!grouped[lesson.unit]) {
        grouped[lesson.unit] = { unit: lesson.unit, title: lesson.unit_title, lessons: [] };
      }
      grouped[lesson.unit].lessons.push(lesson);
    }
    return Object.values(grouped);
  });
</script>

<div class="lessons-page">
  <h1>Lessons</h1>
  <p class="subtitle">Master Amharic step by step. Complete lessons in order to unlock new ones.</p>

  {#if loading}
    <div class="loading">Loading lessons...</div>
  {:else}
    {#each units() as unit}
      <section class="unit">
        <h2 class="unit-header">
          <span class="unit-num">Unit {unit.unit}</span>
          {unit.title}
        </h2>
        <div class="lesson-list">
          {#each unit.lessons as lesson}
            <LessonCard {lesson} />
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>

<style>
  .lessons-page h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
  }

  .loading {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 3rem;
  }

  .unit {
    margin-bottom: 2rem;
  }

  .unit-header {
    color: var(--color-text-heading);
    font-size: 1.2rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .unit-num {
    background: var(--color-accent-primary);
    color: #fff;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .lesson-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
