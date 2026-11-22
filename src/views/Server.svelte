<script lang="ts">
  import {
    albumTracks, connectServer, forgetServer, mixedContentProblem, playlistTracks, randomSongs, recentAlbums,
    searchServer, serverConfig, serverPlaylists, type ServerConfig, type ServerKind, type ServerPlaylist,
  } from '../lib/sources/server';
  import type { Album } from '../lib/sources/album';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import { debounce } from '../lib/util';
  import Card from '../components/Card.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  let { sub = '', id = '' }: { sub?: string; id?: string } = $props();

  let cfg: ServerConfig | null = $state(serverConfig());
  // connect form
  let kind: ServerKind = $state('subsonic');
  let url = $state('');
  let user = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');
  const mixed = $derived(url.trim() ? mixedContentProblem(url) : false);

  async function connect() {
    busy = true; error = '';
    try {
      cfg = await connectServer(kind, url, user, password);
      password = '';
      ui.toast(t('srv.connected', { name: cfg.name ?? cfg.url }));
    } catch (e) {
      const msg = (e as Error).message;
      error = msg === 'mixed' ? t('srv.mixed') : t('srv.failed', { error: msg });
    } finally { busy = false; }
  }
  function demo() { kind = 'subsonic'; url = 'https://demo.navidrome.org'; user = 'demo'; password = 'demo'; }
  function disconnect() { forgetServer(); cfg = null; }

  // browsing
  let albums: Album[] = $state([]);
  let playlists: ServerPlaylist[] = $state([]);
  let loading = $state(false);
  let tracks: Track[] = $state([]);
  let title = $state('');
  let q = $state('');
  let results: Track[] = $state([]);

  $effect(() => {
    const c = cfg;
    if (!c) return;
    error = '';
    if (sub === 'album' || sub === 'playlist') {
      loading = true; tracks = [];
      const job = sub === 'album' ? albumTracks(c, id) : playlistTracks(c, id);
      job.then((r) => { tracks = r; title = sub === 'album' ? (r[0]?.album ?? '') : (playlists.find((p) => p.id === id)?.name ?? ''); })
        .catch((e) => (error = (e as Error).message)).finally(() => (loading = false));
      if (sub === 'playlist' && !playlists.length) serverPlaylists(c).then((p) => { playlists = p; title = p.find((x) => x.id === id)?.name ?? title; }).catch(() => {});
      return;
    }
    loading = true;
    Promise.all([recentAlbums(c), serverPlaylists(c).catch(() => [])])
      .then(([a, p]) => { albums = a; playlists = p; })
      .catch((e) => (error = (e as Error).message))
      .finally(() => (loading = false));
  });

  const runSearch = debounce(async (v: string) => {
    if (!cfg || v.trim().length < 2) { results = []; return; }
    try { const r = await searchServer(cfg, v.trim()); if (v === q) results = r; } catch { results = []; }
  }, 350);

  async function random() {
    if (!cfg) return;
    try { const r = await randomSongs(cfg); if (r.length) player.playList(r, 0); } catch (e) { ui.toast((e as Error).message, 'error'); }
  }
</script>

<div class="page">
  {#if !cfg}
    <p class="eyebrow">{t('srv.nav')}</p>
    <h1 class="page-title">{t('srv.title')}</h1>
    <p class="muted lead">{t('srv.lead')}</p>
    <form class="connect surface" onsubmit={(e) => { e.preventDefault(); void connect(); }}>
      <div class="field">
        <span id="kind-l">{t('srv.kind')}</span>
        <div class="row" role="radiogroup" aria-labelledby="kind-l">
          <button type="button" role="radio" aria-checked={kind === 'subsonic'} class="chip" class:active={kind === 'subsonic'} onclick={() => (kind = 'subsonic')}>Navidrome / Subsonic</button>
          <button type="button" role="radio" aria-checked={kind === 'jellyfin'} class="chip" class:active={kind === 'jellyfin'} onclick={() => (kind = 'jellyfin')}>Jellyfin</button>
        </div>
      </div>
      <label class="field"><span>{t('srv.url')}</span><input type="text" bind:value={url} placeholder="https://music.example.com" dir="ltr" autocomplete="url" required /></label>
      <div class="two">
        <label class="field"><span>{t('srv.user')}</span><input type="text" bind:value={user} autocomplete="username" required /></label>
        <label class="field"><span>{t('srv.password')}</span><input type="password" bind:value={password} autocomplete="current-password" /></label>
      </div>
      {#if mixed}<p class="warn small">{t('srv.mixed')}</p>{/if}
      {#if error}<p class="warn small">{error}</p>{/if}
      <div class="row wrap">
        <button class="btn primary" disabled={busy || mixed || !url || !user}>{busy ? t('srv.connecting') : t('srv.connect')}</button>
        <button type="button" class="btn ghost" onclick={demo}>{t('srv.demo')}</button>
      </div>
      <p class="faint small">{t('srv.privacy')}</p>
    </form>
  {:else if sub === 'album' || sub === 'playlist'}
    <a class="faint small back" href="#/server">← {cfg.name ?? t('srv.nav')}</a>
    <h1 class="page-title" dir="auto">{title || '…'}</h1>
    {#if tracks.length}
      <div class="row actions"><button class="btn primary" onclick={() => player.playList(tracks, 0)}><Icon name="play" size={15} /> {t('common.play')}</button>
        <span class="faint small">{t('count.tracks', { count: tracks.length })}</span></div>
    {/if}
    {#if error}<p class="warn">{error}</p>
    {:else if loading}{#each Array(8) as _}<div class="skeleton" style="height:52px;margin:6px 0"></div>{/each}
    {:else if !tracks.length}<div class="empty section"><h3>{t('srv.empty')}</h3></div>
    {:else}<section class="section"><TrackList {tracks} numbered={sub === 'album'} /></section>{/if}
  {:else}
    <p class="eyebrow">{t('srv.nav')} · <span dir="ltr">{cfg.url.replace(/^https?:\/\//, '')}</span></p>
    <h1 class="page-title">{cfg.name ?? t('srv.title')}</h1>
    <div class="row wrap actions">
      <button class="btn primary" onclick={random}><Icon name="shuffle" size={15} /> {t('srv.random')}</button>
      <input type="search" class="search" bind:value={q} oninput={() => runSearch(q)} placeholder={t('srv.search')} aria-label={t('srv.search')} />
      <button class="btn ghost" onclick={disconnect}>{t('srv.disconnect')}</button>
    </div>
    {#if error}<p class="warn">{error}</p>{/if}
    {#if results.length}<section class="section"><TrackList tracks={results} /></section>{/if}
    <section class="section">
      <div class="section-head"><h2>{t('srv.recent')}</h2></div>
      {#if loading}<div class="scroll-x">{#each Array(6) as _}<div class="skeleton" style="width:176px;height:220px"></div>{/each}</div>
      {:else if albums.length}
        <div class="grid-cards">{#each albums as a (a.id)}<Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/server/album/{encodeURIComponent(a.id)}" />{/each}</div>
      {:else}<p class="faint">{t('srv.empty')}</p>{/if}
    </section>
    {#if playlists.length}
      <section class="section">
        <div class="section-head"><h2>{t('srv.playlists')}</h2></div>
        <div class="grid-cards">{#each playlists as p (p.id)}<Card title={p.name} subtitle={t('count.tracks', { count: p.count })} artwork={p.artwork} seed={p.id} href="#/server/playlist/{encodeURIComponent(p.id)}" />{/each}</div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .lead { max-width: 680px; margin: 6px 0 0; }
  .connect { margin-top: 24px; padding: 20px; display: grid; gap: 14px; max-width: 560px; }
  .field { display: grid; gap: 6px; font-size: 13px; font-weight: 550; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .small { font-size: 12.5px; margin: 0; }
  .warn { color: var(--danger); }
  .actions { gap: 10px; margin-top: 10px; }
  .search { width: 240px; }
  .back { text-decoration: none; }
  @media (max-width: 720px) { .two { grid-template-columns: 1fr; } }
</style>
