<script lang="ts">
  import { t, td, type Key } from '../lib/i18n/i18n.svelte';
  import { licenceLabel, praharDesc, praharLabel } from '../lib/i18n/labels';
  import { audiusTrending, AUDIUS_GENRES } from '../lib/sources/audius';
  import { archiveSearch, ARCHIVE_SHELVES } from '../lib/sources/archive';
  import { openverseSearch } from '../lib/sources/openverse';
  import { radioSearch, RADIO_SHELVES } from '../lib/sources/radio';
  import { i18n } from '../lib/i18n/i18n.svelte';
  import type { Album } from '../lib/sources/album';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { praharAt, ragasAt } from '../lib/raga';
  import Card from '../components/Card.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  const hour = new Date().getHours();
  const greetingKey: Key = hour < 5 ? 'home.lateNight' : hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : hour < 21 ? 'home.evening' : 'home.tonight';
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

  // Live hits: start on the shelf that matches the interface language
  const firstShelf = ({ te: 'te', hi: 'bolly', ta: 'ta' } as Record<string, string>)[i18n.locale] ?? 'enhits';
  let shelfId = $state(firstShelf);
  let hits: Track[] = $state([]);
  let hitsLoading = $state(true);
  $effect(() => {
    const sh = RADIO_SHELVES.find((x) => x.id === shelfId)!;
    hitsLoading = true;
    radioSearch({ ...sh.q, limit: 16 }).then((s) => { if (shelfId === sh.id) hits = s; }).catch(() => (hits = [])).finally(() => (hitsLoading = false));
  });
</script>

<div class="page">
  <header class="hero">
    <div>
      <p class="eyebrow">{praharLabel(prahar.label)} · {praharDesc(prahar.label, prahar.description)}</p>
      <h1 class="page-title">{t(greetingKey)}</h1>
      <p class="muted lead">{t('home.lead')}</p>
    </div>
    <a class="raga surface" href="#/raga">
      <span class="eyebrow">{t('nav.raga')}</span>
      <strong class="display">{ragas.map((r) => r.name).join(' · ') || t('home.ragaOpen')}</strong>
      <span class="faint">{t('home.ragaHint')} <span class="flip-rtl"><Icon name="next" size={12} /></span></span>
    </a>
  </header>

  <section class="section">
    <div class="section-head"><h2>{t('home.liveHits')}</h2><span class="faint small">{t('home.liveHitsHint')}</span></div>
    <div class="row wrap chips">
      {#each RADIO_SHELVES as sh}<button class="chip" class:active={shelfId === sh.id} onclick={() => (shelfId = sh.id)}>{t(('radio.shelf.' + sh.id) as Key)}</button>{/each}
    </div>
    {#if hitsLoading}
      <div class="scroll-x">{#each Array(6) as _}<div class="skeleton" style="width:176px;height:220px"></div>{/each}</div>
    {:else}
      <div class="scroll-x">
        {#each hits as s, i (s.id)}
          <Card title={s.title} subtitle={s.artist} artwork={s.artwork} seed={s.title} onplay={() => player.playList(hits, i)} badge={t('common.live')} round />
        {/each}
      </div>
    {/if}
  </section>

  {#if library.recent.length}
    <section class="section">
      <div class="section-head"><h2>{t('home.jumpBack')}</h2></div>
      <div class="scroll-x">
        {#each library.recent.slice(0, 12) as tr, i (tr.id)}
          <Card title={tr.title} subtitle={tr.artist} artwork={tr.artwork} seed={tr.artist + tr.title} onplay={() => player.playList(library.recent, i)} />
        {/each}
      </div>
    </section>
  {/if}

  <section class="section">
    <div class="section-head">
      <h2>{t('home.trending')}</h2>
      <a class="faint small" href="https://audius.co" target="_blank" rel="noopener">audius.co</a>
    </div>
    <div class="row wrap chips">
      <button class="chip" class:active={!genre} onclick={() => (genre = undefined)}>{t('common.all')}</button>
      {#each AUDIUS_GENRES as g}<button class="chip" class:active={genre === g} onclick={() => (genre = g)}>{g}</button>{/each}
    </div>
    {#if trendingLoading && !trending.length}
      {#each Array(6) as _}<div class="skeleton" style="height:52px;margin:4px 0"></div>{/each}
    {:else if trendingErr}
      <p class="faint">{t('home.audiusDown', { error: trendingErr })}</p>
    {:else}
      <div class="trend-grid">
        <TrackList tracks={trending.slice(0, 10)} numbered />
      </div>
      {#if trending.length > 10}
        <button class="btn small ghost more" onclick={() => player.playList(trending, 0)}><Icon name="play" size={14} /> {t('home.playAll', { count: trending.length })}</button>
      {/if}
    {/if}
  </section>

  <section class="section">
    <div class="section-head"><h2>{t('home.archives')}</h2><span class="faint small">{t('home.archivesHint')}</span></div>
    <div class="row wrap chips">
      {#each ARCHIVE_SHELVES as s, i}<button class="chip" class:active={shelf === i} onclick={() => (shelf = i)}>{t(`shelf.${i}` as Key)}</button>{/each}
    </div>
    {#if albumsLoading}
      <div class="scroll-x">{#each Array(6) as _}<div class="skeleton" style="width:176px;height:220px"></div>{/each}</div>
    {:else}
      <div class="scroll-x">
        {#each albums.slice(0, 16) as a (a.id)}
          <Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/album/{encodeURIComponent(a.id)}" badge={licenceLabel(a.license)} />
        {/each}
      </div>
    {/if}
  </section>

  {#if cc.length}
    <section class="section">
      <div class="section-head"><h2>{t('home.cc', { topic: td(`topic.${topic}`, topic) })}</h2><span class="faint small">{t('home.ccHint')}</span></div>
      <div class="scroll-x">
        {#each cc as tr, i (tr.id)}
          <Card title={tr.title} subtitle={tr.artist} artwork={tr.artwork} seed={tr.artist + tr.title} onplay={() => player.playList(cc, i)} badge={licenceLabel(tr.license)} />
        {/each}
      </div>
    </section>
  {/if}

  {#if stations.length}
    <section class="section">
      <div class="section-head"><h2>{t('home.live')}</h2><a class="faint small" href="#/radio">{t('home.allRadio')}</a></div>
      <div class="scroll-x">
        {#each stations as s, i (s.id)}
          <Card title={s.title} subtitle={s.artist} artwork={s.artwork} seed={s.title} onplay={() => player.playList(stations, i)} badge={t('common.live')} round />
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
