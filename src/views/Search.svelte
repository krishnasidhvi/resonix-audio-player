<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import { licenceLabel, sourceBlurb, sourceName } from '../lib/i18n/labels';
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
    <input bind:this={input} type="search" bind:value={text} placeholder={t('search.placeholder')} aria-label={t('search.aria')} />
    {#if loading}<span class="spin" aria-label={t('search.searching')}></span>{/if}
  </div>

  {#if !results}
    <section class="section">
      <p class="eyebrow">{t('search.try')}</p>
      <div class="row wrap" style="gap:8px">{#each SUGGEST as s}<button class="chip" onclick={() => (text = s)}>{s}</button>{/each}</div>
      <p class="faint note">{t('search.note')} {#if jamendoKey()}{t('search.jamendoOn')}{:else}<a href="#/settings">{t('search.addKey')}</a>{/if}</p>
    </section>
  {:else}
    <div class="tabs row wrap" role="tablist">
      {#each TABS as tab}
        {#if tab === 'all' || tab === 'archive' || (counts[tab] !== undefined && (tab !== 'local' || counts[tab] > 0))}
          <button role="tab" class="chip" class:active={filter === tab} aria-selected={filter === tab} onclick={() => (filter = tab)}>
            {tab === 'all' ? t('common.all') : sourceName(tab)}
            <span class="faint num">{tab === 'all' ? '' : tab === 'archive' ? results.albums.length : counts[tab]}</span>
          </button>
        {/if}
      {/each}
    </div>

    {#if filter === 'all' || filter === 'archive'}
      {#if results.albums.length}
        <section class="section">
          <div class="section-head"><h2>Internet Archive</h2><span class="faint small">{t('search.archiveHint')}</span></div>
          <div class={filter === 'archive' ? 'grid-cards' : 'scroll-x'}>
            {#each results.albums as a (a.id)}
              <Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/album/{encodeURIComponent(a.id)}" badge={licenceLabel(a.license)} />
            {/each}
          </div>
        </section>
      {:else if filter === 'archive'}<p class="faint">{results.albumError ?? t('search.noArchive')}</p>{/if}
    {/if}

    {#each groups as g (g.source)}
      {#if filter === 'all' || filter === g.source}
        <section class="section">
          <div class="section-head">
            <h2><span class="dot" style:background={SOURCES[g.source].color}></span>{sourceName(g.source)}</h2>
            <span class="faint small">{sourceBlurb(g.source)}</span>
          </div>
          {#if g.error}<p class="faint">{g.error}</p>
          {:else}<TrackList tracks={filter === 'all' ? g.tracks.slice(0, 6) : g.tracks} />
            {#if filter === 'all' && g.tracks.length > 6}<button class="btn small ghost" onclick={() => (filter = g.source)}>{t('search.allFrom', { count: g.tracks.length, source: sourceName(g.source) })}</button>{/if}
          {/if}
        </section>
      {/if}
    {/each}
    {#if !groups.some((g) => g.tracks.length) && !results.albums.length}
      <div class="empty section"><h3>{t('search.noResults', { q: text })}</h3><p>{t('search.noResultsHint')}</p></div>
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
