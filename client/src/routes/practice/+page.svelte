<script>
  import { getVocabulary, searchVocabulary } from '$lib/api.js';
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
              <span class="vocab-romanized">{word.romanized}</span>
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
    color: #fff;
    font-size: 1.8rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: #a8a8b3;
    margin-bottom: 1.5rem;
  }

  .search-bar input {
    width: 100%;
    padding: 0.85rem 1rem;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 10px;
    color: #fff;
    font-size: 1rem;
    outline: none;
    margin-bottom: 1rem;
  }

  .search-bar input:focus {
    border-color: #e94560;
  }

  .search-bar input::placeholder {
    color: #666;
  }

  .category-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .filter-btn {
    padding: 0.4rem 0.75rem;
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 20px;
    color: #a8a8b3;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-btn:hover {
    border-color: #e94560;
    color: #fff;
  }

  .filter-btn.active {
    background: #e94560;
    border-color: #e94560;
    color: #fff;
  }

  .loading, .empty {
    text-align: center;
    color: #a8a8b3;
    padding: 2rem;
  }

  .vocab-count {
    color: #666;
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
    background: #16213e;
    border: 1px solid #2a2a4a;
    border-radius: 8px;
    padding: 0.85rem 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: inherit;
  }

  .vocab-item:hover {
    border-color: #3a3a5a;
  }

  .vocab-item.expanded {
    border-color: #e94560;
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
    color: #fff;
    font-weight: 600;
  }

  .vocab-romanized {
    color: #e94560;
    font-size: 0.9rem;
  }

  .vocab-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .vocab-amharic {
    color: #a8a8b3;
    font-size: 1.1rem;
  }

  .vocab-gender {
    background: #2a2a4a;
    color: #666;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.7rem;
  }

  .vocab-details {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #2a2a4a;
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
  }

  .detail-label {
    color: #666;
  }

  .detail-value {
    color: #a8a8b3;
  }

  .detail-value.pron {
    color: #f5a623;
    font-style: italic;
  }
</style>
