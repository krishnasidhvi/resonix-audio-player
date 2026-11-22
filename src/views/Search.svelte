<script lang="ts">
  import { searchAll, SOURCES, type UnifiedResults } from '../lib/sources';
  import { jamendoKey } from '../lib/sources/jamendo';
  import { library } from '../lib/stores/library.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import type { SourceId } from '../lib/types';
  import { debounce } from '../lib/util';
  import TrackList from '../components/TrackList.svelte';
  import Card from '../components/Card.svelte';
  import Icon from '../components/Icon.svelte';

  let { q }: { q: string } = $props();
  // svelte-ignore state_referenced_locally
  let text = $state(q);
  let results = $state<UnifiedResults | null>(null);
  let loading = $state(false);
  let filter: SourceId | 'all' = $state('all');
  let input: HTMLInputElement;

  const updateHash = debounce((v: string) => history.replaceState(null, '', `#/search?q=${encodeURIComponent(v)}`), 400);
  const run = debounce(async (v: string) => {
    if (v.trim().length < 2) { results = null; return; }
    loading = true;
    const r = await searchAll(v.trim(), library.local);
    if (v === text) { results = r; loading = false; }
  }, 350);

  $effect(() => { input?.focus(); });
  $effect(() => { const v = text; updateHash(v); run(v); });

  const groups = $derived(results?.tracks.filter((g) => g.tracks.length || g.error) ?? []);
  const counts = $derived(Object.fromEntries((results?.tracks ?? []).map((g) => [g.source, g.tracks.length])) as Record<string, number>);
  const TABS: (SourceId | 'all')[] = ['all', 'local', 'audius', 'archive', 'openverse', 'jamendo', 'radio'];
  const SUGGEST = ['Raag Yaman', 'Carnatic violin', 'lofi beats', 'Telugu', 'Bollywood radio', 'Beethoven sonata', 'ambient piano', 'jazz 1920s'];
</script>

<div class="page">
  <div class="search-box">
    <Icon name="search" size={22} />
    <input bind:this={input} type="search" bind:value={text} placeholder="Artists, songs, ragas, stations…" aria-label="Search all sources" />
    {#if loading}<span class="spin" aria-label="Searching"></span>{/if}
  </div>

  {#if !results}
    <section class="section">
      <p class="eyebrow">Try</p>
      <div class="row wrap" style="gap:8px">{#each SUGGEST as s}<button class="chip" onclick={() => (text = s)}>{s}</button>{/each}</div>
      <p class="faint note">Searches your library, Audius, Internet Archive (CC and public domain only), Openverse, Radio Browser{jamendoKey() ? ' and Jamendo' : ''} at once. {#if !jamendoKey()}<a href="#/settings">Add a free Jamendo key</a> to include Jamendo directly.{/if}</p>
    </section>
  {:else}
    <div class="tabs row wrap" role="tablist">
      {#each TABS as t}
        {#if t === 'all' || t === 'archive' || (counts[t] !== undefined && (t !== 'local' || counts[t] > 0))}
          <button role="tab" class="chip" class:active={filter === t} aria-selected={filter === t} onclick={() => (filter = t)}>
            {t === 'all' ? 'All' : SOURCES[t].name}
            <span class="faint num">{t === 'all' ? '' : t === 'archive' ? results.albums.length : counts[t]}</span>
          </button>
        {/if}
      {/each}
    </div>

    {#if filter === 'all' || filter === 'archive'}
      {#if results.albums.length}
        <section class="section">
          <div class="section-head"><h2>Internet Archive</h2><span class="faint small">Albums and recordings · open licences</span></div>
          <div class={filter === 'archive' ? 'grid-cards' : 'scroll-x'}>
            {#each results.albums as a (a.id)}
              <Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/album/{encodeURIComponent(a.id)}" badge={a.license?.name} />
            {/each}
          </div>
        </section>
      {:else if filter === 'archive'}<p class="faint">{results.albumError ?? 'No openly licensed Archive items matched.'}</p>{/if}
    {/if}

    {#each groups as g (g.source)}
      {#if filter === 'all' || filter === g.source}
        <section class="section">
          <div class="section-head">
            <h2><span class="dot" style:background={SOURCES[g.source].color}></span>{SOURCES[g.source].name}</h2>
            <span class="faint small">{SOURCES[g.source].blurb}</span>
          </div>
          {#if g.error}<p class="faint">{g.error}</p>
          {:else}<TrackList tracks={filter === 'all' ? g.tracks.slice(0, 6) : g.tracks} />
            {#if filter === 'all' && g.tracks.length > 6}<button class="btn small ghost" onclick={() => (filter = g.source)}>All {g.tracks.length} from {SOURCES[g.source].name}</button>{/if}
          {/if}
        </section>
      {/if}
    {/each}
    {#if !groups.some((g) => g.tracks.length) && !results.albums.length}
      <div class="empty section"><h3>No results for “{text}”</h3><p>Try a shorter search or another spelling.</p></div>
    {/if}
  {/if}
</div>

<style>
  .search-box { display: flex; align-items: center; gap: 14px; padding: 0 20px; height: 64px; border-radius: 16px; background: var(--bg-raise); border: 1px solid var(--line); color: var(--text-3); }
  .search-box:focus-within { border-color: var(--accent); }
  .search-box input { flex: 1; height: 100%; background: transparent; border: 0; font-size: 20px; color: var(--text); padding: 0; }
  .spin { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tabs { gap: 6px; margin-top: 18px; }
  .note { margin-top: 18px; font-size: 13px; max-width: 640px; }
  .note a { color: var(--accent); }
  .small { font-size: 12.5px; }
  h2 { display: flex; align-items: center; gap: 10px; }
  .dot { width: 9px; height: 9px; border-radius: 50%; }
</style>
