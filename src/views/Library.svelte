<script lang="ts">
  import { offline } from '../lib/stores/offline.svelte';
  const fmtBytes = (b: number) => new Intl.NumberFormat(undefined, { style: 'unit', unit: b > 1e9 ? 'gigabyte' : 'megabyte', maximumFractionDigits: 1 }).format(b > 1e9 ? b / 1e9 : b / 1e6);
  import { canPickFolder, ensurePermission, importFiles, importFolder, requestPermission } from '../lib/sources/local';
  import { analyseTrack, cachedAnalysis } from '../lib/audio/analysis';
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t, type Key } from '../lib/i18n/i18n.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Card from '../components/Card.svelte';
  import Icon from '../components/Icon.svelte';

  let { tab = 'files' }: { tab?: string } = $props();
  let progress: { done: number; total: number } | null = $state(null);
  let filter = $state('');
  let needsPermission = $state(false);
  let batch: { done: number; total: number } | null = $state(null);
  let fileInput: HTMLInputElement | undefined = $state();

  $effect(() => { if (canPickFolder && library.local.length) ensurePermission().then((ok) => (needsPermission = !ok)).catch(() => {}); });

  const shown = $derived.by(() => {
    const q = filter.toLowerCase();
    return q ? library.local.filter((t) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(q)) : library.local;
  });

  async function pickFolder() {
    try {
      progress = { done: 0, total: 0 };
      const tracks = await importFolder((done, total) => (progress = { done, total }));
      await library.addLocal(tracks);
      ui.toast(t('toast.addedTracks', { count: tracks.length }));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast((e as Error).message, 'error');
    } finally { progress = null; }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    progress = { done: 0, total: files.length };
    try {
      const tracks = await importFiles([...files], (done, total) => (progress = { done, total }));
      await library.addLocal(tracks);
      ui.toast(t('toast.addedTracks', { count: tracks.length }));
    } catch (e) { ui.toast((e as Error).message, 'error'); }
    finally { progress = null; }
  }

  async function analyseAll() {
    const todo = [];
    for (const t of library.local) if (!(await cachedAnalysis(t.id))) todo.push(t);
    if (!todo.length) return ui.toast(t('toast.allAnalysed'));
    batch = { done: 0, total: todo.length };
    for (const t of todo) {
      try { await analyseTrack(t); } catch { /* skip unreadable */ }
      batch = { done: batch.done + 1, total: todo.length };
    }
    batch = null;
    ui.toast(t('toast.analysisDone'));
  }

  const tabs: { id: string; label: Key }[] = [
    { id: 'files', label: 'library.tab.files' },
    { id: 'favorites', label: 'nav.favourites' },
    { id: 'playlists', label: 'nav.playlists' },
    { id: 'recent', label: 'library.tab.recent' },
    { id: 'offline', label: 'offline.tab' },
  ];
</script>

<div class="page">
  <p class="eyebrow">{t('nav.library')}</p>
  <h1 class="page-title">{t('library.title')}</h1>
  <div class="row wrap tabs" role="tablist">
    {#each tabs as tb}<a role="tab" class="chip" class:active={tab === tb.id} aria-selected={tab === tb.id} href="#/library/{tb.id}">{t(tb.label)}</a>{/each}
  </div>

  {#if tab === 'files'}
    <div class="row wrap actions">
      {#if canPickFolder}<button class="btn primary" onclick={pickFolder}><Icon name="folder" size={16} /> {t('library.addFolder')}</button>{/if}
      <button class="btn" onclick={() => fileInput?.click()}><Icon name="upload" size={16} /> {t('library.addFiles')}</button>
      <input bind:this={fileInput} type="file" accept="audio/*,.flac,.m4a,.opus" multiple hidden onchange={(e) => addFiles(e.currentTarget.files)} />
      {#if library.local.length}
        <button class="btn" onclick={analyseAll} disabled={!!batch}><Icon name="sparkle" size={16} /> {batch ? t('library.analysing', { done: batch.done, total: batch.total }) : t('library.analyseAll')}</button>
        <input type="search" placeholder={t('library.filter')} bind:value={filter} aria-label={t('library.filterAria')} class="filter" />
        <button class="btn ghost" onclick={() => player.playList(shown, 0)}><Icon name="play" size={14} /> {t('library.playN', { count: shown.length })}</button>
      {/if}
    </div>
    {#if progress}<p class="muted">{t('library.reading', { progress: progress.done + (progress.total ? ' / ' + progress.total : '') })}</p>{/if}
    {#if needsPermission}
      <div class="notice surface row">
        <span class="grow">{t('library.permission')}</span>
        <button class="btn small primary" onclick={async () => (needsPermission = !(await requestPermission()))}>{t('library.allow')}</button>
      </div>
    {/if}
    {#if !library.local.length && !progress}
      <div class="empty section">
        <Icon name="folder" size={30} />
        <h3>{t('library.emptyTitle')}</h3>
        <p>{t('library.emptyHint1')}<br />{t('library.emptyHint2')}</p>
      </div>
    {:else}
      <section class="section"><TrackList tracks={shown} onRemove={(tr) => library.removeLocal(tr)} /></section>
      <button class="btn small ghost danger" onclick={() => { if (confirm(t('library.clearConfirm'))) library.clearLocal(); }}>{t('library.clear')}</button>
    {/if}
  {:else if tab === 'favorites'}
    {#if library.favorites.length}
      <div class="row actions"><button class="btn primary" onclick={() => player.playList(library.favorites, 0)}><Icon name="play" size={14} /> {t('common.play')}</button></div>
      <section class="section"><TrackList tracks={library.favorites} showSource /></section>
    {:else}<div class="empty section"><Icon name="heart" size={28} /><h3>{t('library.noFav')}</h3><p>{t('library.noFavHint')}</p></div>{/if}
  {:else if tab === 'playlists'}
    <div class="row actions"><button class="btn" onclick={() => { const n = prompt(t('playlist.namePrompt'), t('playlist.defaultName')); if (n) { const p = library.createPlaylist(n); ui.go(`#/playlist/${p.id}`); } }}><Icon name="plus" size={15} /> {t('nav.newPlaylist')}</button></div>
    {#if library.playlists.length}
      <div class="grid-cards section">
        {#each library.playlists as p (p.id)}
          <Card title={p.name} subtitle={t('count.tracks', { count: p.tracks.length })} artwork={p.tracks[0]?.artwork} seed={p.id} href="#/playlist/{p.id}" onplay={p.tracks.length ? () => player.playList(p.tracks, 0) : undefined} />
        {/each}
      </div>
    {:else}<div class="empty section"><h3>{t('library.noPlaylists')}</h3><p>{t('library.noPlaylistsHint')}</p></div>{/if}
  {:else if tab === 'offline'}
    {#if offline.entries.length}
      <div class="row wrap actions">
        <button class="btn primary" onclick={() => player.playList(offline.entries.map((e) => e.track), 0)}><Icon name="play" size={14} /> {t('common.play')}</button>
        <span class="faint">{t('count.tracks', { count: offline.entries.length })} · {t('offline.size', { size: fmtBytes(offline.totalBytes) })}</span>
        <button class="btn small ghost danger" onclick={() => { if (confirm(t('offline.clearConfirm'))) offline.clear(); }}>{t('offline.clear')}</button>
      </div>
      <section class="section"><TrackList tracks={offline.entries.map((e) => e.track)} showSource onRemove={(tr) => offline.remove(tr.id)} /></section>
    {:else}<div class="empty section"><Icon name="download" size={28} /><h3>{t('offline.empty')}</h3><p>{t('offline.emptyHint')}</p></div>{/if}
  {:else}
    {#if library.recent.length}<section class="section"><TrackList tracks={library.recent} showSource /></section>
    {:else}<div class="empty section"><h3>{t('library.nothingPlayed')}</h3></div>{/if}
  {/if}
</div>

<style>
  .tabs { gap: 6px; margin: 14px 0 20px; }
  .tabs a { text-decoration: none; }
  .actions { gap: 8px; }
  .filter { width: 200px; }
  .notice { margin-top: 16px; padding: 12px 16px; gap: 12px; }
  .danger { color: var(--danger); margin-top: 20px; }
</style>
