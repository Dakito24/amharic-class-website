<script>
  import { getVocabulary, searchVocabulary } from '$lib/api.js';
  import AudioButton from '$lib/components/AudioButton.svelte';
  import { onMount } from 'svelte';

  let vocab = $state([]);
  let filteredVocab = $state([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let selectedCategory = $state('all');
  let expandedId = $state(null);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'greeting', label: 'Greetings' },
    { value: 'pronoun', label: 'Pronouns' },
    { value: 'number', label: 'Numbers' },
    { value: 'family', label: 'Family' },
    { value: 'noun', label: 'Nouns' },
    { value: 'adjective', label: 'Adjectives' },
    { value: 'verb', label: 'Verbs' },
    { value: 'day', label: 'Days' },
    { value: 'phrase', label: 'Phrases' }
  ];

  onMount(async () => {
    vocab = await getVocabulary();
    filteredVocab = vocab;
    loading = false;
  });

  async function handleSearch() {
    if (searchQuery.length >= 2) {
      filteredVocab = await searchVocabulary(searchQuery);
    } else if (searchQuery.length === 0) {
      applyFilter();
    }
  }

  function applyFilter() {
    if (selectedCategory === 'all') {
      filteredVocab = vocab;
    } else {
      filteredVocab = vocab.filter(v => v.category === selectedCategory);
    }
  }

  function selectCategory(cat) {
    selectedCategory = cat;
    searchQuery = '';
    applyFilter();
  }

  function toggleExpand(id) {
    expandedId = expandedId === id ? null : id;
  }
</script>

<div class="practice-page">
  <h1>Practice</h1>
  <p class="subtitle">Browse and search all Amharic vocabulary. Tap any word for details.</p>

  <div class="search-bar">
    <input
      type="text"
      placeholder="Search English or Amharic..."
      bind:value={searchQuery}
      oninput={handleSearch}
    />
  </div>

  <div class="category-filters">
    {#each categories as cat}
      <button
        class="filter-btn"
        class:active={selectedCategory === cat.value}
        onclick={() => selectCategory(cat.value)}
      >
        {cat.label}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="loading">Loading vocabulary...</div>
  {:else if filteredVocab.length === 0}
    <div class="empty">No results found.</div>
  {:else}
    <div class="vocab-count">{filteredVocab.length} words</div>
    <div class="vocab-list">
      {#each filteredVocab as word}
        <button class="vocab-item" class:expanded={expandedId === word.id} onclick={() => toggleExpand(word.id)}>
          <div class="vocab-main">
            <div class="vocab-left">
              <span class="vocab-english">{word.english}</span>
              <span class="vocab-romanized-row">
                <span class="vocab-romanized">{word.romanized}</span>
                <AudioButton src={word.audio_url} />
              </span>
            </div>
            <div class="vocab-right">
              <span class="vocab-amharic">{word.amharic}</span>
              {#if word.gender}
                <span class="vocab-gender">{word.gender === 'masculine' ? 'm' : 'f'}</span>
              {/if}
            </div>
          </div>
          {#if expandedId === word.id}
            <div class="vocab-details">
              {#if word.pronunciation_guide}
                <div class="detail-row">
                  <span class="detail-label">Pronunciation:</span>
                  <span class="detail-value pron">{word.pronunciation_guide}</span>
                </div>
              {/if}
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">{word.category}</span>
              </div>
              {#if word.gender}
                <div class="detail-row">
                  <span class="detail-label">Gender:</span>
                  <span class="detail-value">{word.gender}</span>
                </div>
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .practice-page {
    max-width: 700px;
    margin: 0 auto;
  }

  h1 {
    color: var(--color-text-heading);
    font-size: 1.8rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: var(--color-text-secondary);
    margin-bottom: 1.5rem;
  }

  .search-bar input {
    width: 100%;
    padding: 0.85rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    color: var(--color-text-heading);
    font-size: 1rem;
    outline: none;
    margin-bottom: 1rem;
  }

  .search-bar input:focus {
    border-color: var(--color-accent-primary);
  }

  .search-bar input::placeholder {
    color: var(--color-text-muted);
  }

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .filter-btn {
    padding: 0.4rem 0.75rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    border-color: var(--color-accent-primary);
    color: var(--color-text-heading);
  }

  .filter-btn.active {
    background: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: #fff;
  }

  .loading, .empty {
    text-align: center;
    color: var(--color-text-secondary);
    padding: 2rem;
  }

  .vocab-count {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .vocab-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .vocab-item {
    width: 100%;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: inherit;
  }

  .vocab-item:hover {
    border-color: var(--color-border-hover);
  }

  .vocab-item.expanded {
    border-color: var(--color-accent-primary);
  }

  .vocab-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .vocab-left {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .vocab-english {
    color: var(--color-text-heading);
    font-weight: 600;
  }

  .vocab-romanized-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .vocab-romanized {
    color: var(--color-accent-primary);
    font-size: 0.9rem;
  }

  .vocab-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vocab-amharic {
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .vocab-gender {
    background: var(--color-border);
    color: var(--color-text-muted);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
  }

  .vocab-details {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
  }

  .detail-label {
    color: var(--color-text-muted);
  }

  .detail-value {
    color: var(--color-text-secondary);
  }

  .detail-value.pron {
    color: var(--color-accent-orange);
    font-style: italic;
  }
</style>
