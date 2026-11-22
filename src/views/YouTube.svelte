<script lang="ts">
  import { youtube } from '../lib/audio/youtube-player';
  import { parseYouTubeUrl, playlistTitle, playlistViaApi, videoFromOEmbed, videosViaOEmbed, youtubeKey, youtubeSearch } from '../lib/sources/youtube';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import { untrack } from 'svelte';
  import type { Track } from '../lib/types';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  let { url = '' }: { url?: string } = $props();
  // svelte-ignore state_referenced_locally
  let link = $state(url);
  let busy = $state(false);
  let progress = $state('');
  let error = $state('');
  let q = $state('');
  let results: Track[] = $state([]);
  let searching = $state(false);
  const hasKey = $derived(!!youtubeKey());
  const region = (() => { try { return new Intl.Locale(navigator.language).maximize().region; } catch { return undefined; } })();
  const recentYt = $derived(library.recent.filter((r) => r.source === 'youtube'));

  async function open() {
    error = '';
    const ref = parseYouTubeUrl(link);
    if (!ref) { error = t('yt.badLink'); return; }
    busy = true;
    try {
      if (ref.listId) {
        let tracks: Track[];
        if (hasKey) tracks = await playlistViaApi(ref.listId);
        else {
          const ids = await youtube.playlistIds(ref.listId);
          tracks = await videosViaOEmbed(ids, (d, n) => (progress = t('yt.importing', { done: d, total: n })));
        }
        if (!tracks.length) throw new Error(t('yt.badLink'));
        const name = (await playlistTitle(ref.listId)) ?? 'YouTube';
        const pl = library.createPlaylist(name, tracks);
        ui.toast(t('yt.imported', { count: tracks.length }));
        const start = ref.videoId ? Math.max(0, tracks.findIndex((x) => x.youtubeId === ref.videoId)) : 0;
        player.playList(tracks, start);
        ui.go(`#/playlist/${pl.id}`);
      } else if (ref.videoId) {
        player.playList([await videoFromOEmbed(ref.videoId)], 0);
      }
      link = '';
    } catch (e) {
      error = (e as Error).message;
    } finally { busy = false; progress = ''; }
  }

  async function search() {
    if (q.trim().length < 2) return;
    searching = true; error = '';
    try { results = await youtubeSearch(q.trim(), region); }
    catch (e) { error = (e as Error).message; results = []; }
    finally { searching = false; }
  }

  // a query handed over from the main search box runs once
  $effect(() => { const hq = sessionStorage.getItem('yt.q'); if (hq && hasKey) { sessionStorage.removeItem('yt.q'); q = hq; void search(); } });
  // a link handed over from the main search box opens straight away
  $effect(() => {
    if (!url) return;
    history.replaceState(null, '', '#/youtube'); // so a refresh doesn't replay it
    untrack(() => void open());
  });
</script>

<div class="page">
  <p class="eyebrow">{t('yt.eyebrow')}</p>
  <h1 class="page-title">{t('yt.title')}</h1>
  <p class="muted lead">{t('yt.lead')}</p>

  <form class="paste row" onsubmit={(e) => { e.preventDefault(); void open(); }}>
    <Icon name="upload" size={18} />
    <input type="text" bind:value={link} placeholder={t('yt.paste')} aria-label={t('yt.paste')} dir="ltr" />
    <button class="btn primary" disabled={busy || !link.trim()}>{busy ? (progress || '…') : t('yt.add')}</button>
  </form>
  {#if error}<p class="err">{error}</p>{/if}

  <section class="section">
    <div class="section-head"><h2>{t('yt.searchTitle')}</h2></div>
    {#if hasKey}
      <form class="row search" onsubmit={(e) => { e.preventDefault(); void search(); }}>
        <input type="search" bind:value={q} placeholder={t('yt.searchPlaceholder')} aria-label={t('yt.searchTitle')} class="grow" />
        <button class="btn" disabled={searching}>{t('nav.search')}</button>
      </form>
      {#if results.length}<div class="section"><TrackList tracks={results} /></div>{/if}
    {:else}
      <p class="faint">{t('yt.searchHint')} <a href="#/settings">{t('nav.settings')}</a></p>
    {/if}
  </section>

  {#if recentYt.length}
    <section class="section">
      <div class="section-head"><h2>{t('library.tab.recent')}</h2></div>
      <TrackList tracks={recentYt} />
    </section>
  {/if}

  <p class="faint small limits">{t('yt.limits')}</p>
</div>

<style>
  .lead { max-width: 720px; margin: 6px 0 0; }
  .paste { margin-top: 24px; gap: 12px; padding: 0 8px 0 18px; height: 60px; border-radius: 16px; background: var(--bg-raise); border: 1px solid var(--line); color: var(--text-3); }
  .paste:focus-within { border-color: var(--accent); }
  .paste input { flex: 1; height: 100%; background: transparent; border: 0; font-size: 16px; color: var(--text); padding: 0; }
  .err { color: var(--danger); margin: 10px 0 0; font-size: 13.5px; }
  .search { gap: 8px; max-width: 560px; }
  .faint a { color: var(--accent); }
  .small { font-size: 12.5px; }
  .limits { margin-top: 36px; max-width: 720px; }
</style>
