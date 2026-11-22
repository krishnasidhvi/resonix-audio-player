<script lang="ts">
  import { audiusTrending, AUDIUS_GENRES } from '../lib/sources/audius';
  import { archiveSearch, ARCHIVE_SHELVES } from '../lib/sources/archive';
  import { openverseSearch } from '../lib/sources/openverse';
  import { radioSearch } from '../lib/sources/radio';
  import type { Album } from '../lib/sources/album';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { praharAt, ragasAt } from '../lib/raga';
  import Card from '../components/Card.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Tonight';
  const prahar = praharAt();
  const ragas = ragasAt().slice(0, 3);

  let genre: string | undefined = $state(undefined);
  let trending: Track[] = $state([]);
  let trendingErr = $state('');
  let trendingLoading = $state(true);
  $effect(() => {
    const g = genre;
    trendingLoading = true; trendingErr = '';
    audiusTrending(g).then((t) => { if (g === genre) trending = t; }).catch((e) => (trendingErr = e.message)).finally(() => (trendingLoading = false));
  });

  let shelf = $state(0);
  let albums: Album[] = $state([]);
  let albumsLoading = $state(true);
  $effect(() => {
    const s = ARCHIVE_SHELVES[shelf];
    albumsLoading = true;
    archiveSearch(s.query, 1, s.extra).then((a) => (albums = a)).catch(() => (albums = [])).finally(() => (albumsLoading = false));
  });

  const CC_TOPICS = ['acoustic', 'piano', 'lofi', 'cinematic', 'jazz', 'indian', 'ambient', 'folk'];
  const topic = CC_TOPICS[new Date().getDate() % CC_TOPICS.length];
  let cc: Track[] = $state([]);
  openverseSearch(topic).then((t) => (cc = t.slice(0, 12))).catch(() => {});

  let stations: Track[] = $state([]);
  radioSearch({ limit: 14 }).then((s) => (stations = s)).catch(() => {});
</script>

<div class="page">
  <header class="hero">
    <div>
      <p class="eyebrow">{prahar.label} · {prahar.description}</p>
      <h1 class="page-title">{greeting}.</h1>
      <p class="muted lead">Free, openly licensed music from independent artists, public archives and live radio, plus everything on your own drive.</p>
    </div>
    <a class="raga surface" href="#/raga">
      <span class="eyebrow">Raga clock</span>
      <strong class="display">{ragas.map((r) => r.name).join(' · ') || 'Open the raga clock'}</strong>
      <span class="faint">Traditionally sung at this hour <Icon name="next" size={12} /></span>
    </a>
  </header>

  {#if library.recent.length}
    <section class="section">
      <div class="section-head"><h2>Jump back in</h2></div>
      <div class="scroll-x">
        {#each library.recent.slice(0, 12) as t, i (t.id)}
          <Card title={t.title} subtitle={t.artist} artwork={t.artwork} seed={t.artist + t.title} onplay={() => player.playList(library.recent, i)} />
        {/each}
      </div>
    </section>
  {/if}

  <section class="section">
    <div class="section-head">
      <h2>Trending on Audius</h2>
      <a class="faint small" href="https://audius.co" target="_blank" rel="noopener">audius.co</a>
    </div>
    <div class="row wrap chips">
      <button class="chip" class:active={!genre} onclick={() => (genre = undefined)}>All</button>
      {#each AUDIUS_GENRES as g}<button class="chip" class:active={genre === g} onclick={() => (genre = g)}>{g}</button>{/each}
    </div>
    {#if trendingLoading && !trending.length}
      {#each Array(6) as _}<div class="skeleton" style="height:52px;margin:4px 0"></div>{/each}
    {:else if trendingErr}
      <p class="faint">Audius is unreachable right now ({trendingErr}).</p>
    {:else}
      <div class="trend-grid">
        <TrackList tracks={trending.slice(0, 10)} numbered />
      </div>
      {#if trending.length > 10}
        <button class="btn small ghost more" onclick={() => player.playList(trending, 0)}><Icon name="play" size={14} /> Play all {trending.length}</button>
      {/if}
    {/if}
  </section>

  <section class="section">
    <div class="section-head"><h2>From the open archives</h2><span class="faint small">Internet Archive · CC & public domain only</span></div>
    <div class="row wrap chips">
      {#each ARCHIVE_SHELVES as s, i}<button class="chip" class:active={shelf === i} onclick={() => (shelf = i)}>{s.label}</button>{/each}
    </div>
    {#if albumsLoading}
      <div class="scroll-x">{#each Array(6) as _}<div class="skeleton" style="width:176px;height:220px"></div>{/each}</div>
    {:else}
      <div class="scroll-x">
        {#each albums.slice(0, 16) as a (a.id)}
          <Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/album/{encodeURIComponent(a.id)}" badge={a.license?.name} />
        {/each}
      </div>
    {/if}
  </section>

  {#if cc.length}
    <section class="section">
      <div class="section-head"><h2>Creative Commons: {topic}</h2><span class="faint small">via Openverse · Jamendo, Wikimedia, ccMixter</span></div>
      <div class="scroll-x">
        {#each cc as t, i (t.id)}
          <Card title={t.title} subtitle={t.artist} artwork={t.artwork} seed={t.artist + t.title} onplay={() => player.playList(cc, i)} badge={t.license?.name} />
        {/each}
      </div>
    </section>
  {/if}

  {#if stations.length}
    <section class="section">
      <div class="section-head"><h2>Live around the world</h2><a class="faint small" href="#/radio">All radio</a></div>
      <div class="scroll-x">
        {#each stations as s, i (s.id)}
          <Card title={s.title} subtitle={s.artist} artwork={s.artwork} seed={s.title} onplay={() => player.playList(stations, i)} badge="LIVE" round />
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .hero { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: end; padding: 18px 0 6px; }
  .lead { max-width: 560px; margin: 8px 0 0; font-size: 15px; }
  .raga { display: grid; gap: 4px; padding: 16px 20px; text-decoration: none; min-width: 260px; max-width: 340px; background: linear-gradient(135deg, var(--accent-wash), transparent 70%), var(--bg-raise); transition: border-color 0.2s; }
  .raga:hover { border-color: var(--accent); }
  .raga strong { font-size: 19px; }
  .small { font-size: 12.5px; }
  .chips { gap: 6px; margin-bottom: 14px; }
  .trend-grid :global(.list) { grid-template-columns: 1fr 1fr; column-gap: 24px; }
  .more { margin-top: 10px; }
  @media (max-width: 1100px) { .trend-grid :global(.list) { grid-template-columns: 1fr; } }
  @media (max-width: 720px) { .hero { grid-template-columns: 1fr; } .raga { max-width: none; } }
</style>
