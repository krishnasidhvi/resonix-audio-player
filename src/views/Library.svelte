<script lang="ts">
  import { canPickFolder, ensurePermission, importFiles, importFolder, requestPermission } from '../lib/sources/local';
  import { analyseTrack, cachedAnalysis } from '../lib/audio/analysis';
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { plural } from '../lib/util';
  import TrackList from '../components/TrackList.svelte';
  import Card from '../components/Card.svelte';
  import Icon from '../components/Icon.svelte';

  let { tab = 'files' }: { tab?: string } = $props();
  let progress: { done: number; total: number } | null = $state(null);
  let filter = $state('');
  let needsPermission = $state(false);
  let batch: { done: number; total: number } | null = $state(null);
  let fileInput: HTMLInputElement | undefined = $state();

  $effect(() => { if (canPickFolder && library.local.length) ensurePermission().then((ok) => (needsPermission = !ok)); });

  const shown = $derived.by(() => {
    const q = filter.toLowerCase();
    return q ? library.local.filter((t) => `${t.title} ${t.artist} ${t.album ?? ''}`.toLowerCase().includes(q)) : library.local;
  });

  async function pickFolder() {
    try {
      progress = { done: 0, total: 0 };
      const tracks = await importFolder((done, total) => (progress = { done, total }));
      await library.addLocal(tracks);
      ui.toast(`Added ${plural(tracks.length, 'track')}`);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast((e as Error).message, 'error');
    } finally { progress = null; }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    progress = { done: 0, total: files.length };
    const tracks = await importFiles([...files], (done, total) => (progress = { done, total }));
    await library.addLocal(tracks);
    progress = null;
    ui.toast(`Added ${plural(tracks.length, 'track')}`);
  }

  async function analyseAll() {
    const todo = [];
    for (const t of library.local) if (!(await cachedAnalysis(t.id))) todo.push(t);
    if (!todo.length) return ui.toast('Every local track is already analysed');
    batch = { done: 0, total: todo.length };
    for (const t of todo) {
      try { await analyseTrack(t); } catch { /* skip unreadable */ }
      batch = { done: batch.done + 1, total: todo.length };
    }
    batch = null;
    ui.toast('Analysis finished. Try the Journey map.');
  }

  const tabs = [
    { id: 'files', label: 'On this device' },
    { id: 'favorites', label: 'Favourites' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'recent', label: 'Recently played' },
  ];
</script>

<div class="page">
  <p class="eyebrow">Library</p>
  <h1 class="page-title">Your music</h1>
  <div class="row wrap tabs" role="tablist">
    {#each tabs as t}<a role="tab" class="chip" class:active={tab === t.id} aria-selected={tab === t.id} href="#/library/{t.id}">{t.label}</a>{/each}
  </div>

  {#if tab === 'files'}
    <div class="row wrap actions">
      {#if canPickFolder}<button class="btn primary" onclick={pickFolder}><Icon name="folder" size={16} /> Add a music folder</button>{/if}
      <button class="btn" onclick={() => fileInput?.click()}><Icon name="upload" size={16} /> Add files</button>
      <input bind:this={fileInput} type="file" accept="audio/*,.flac,.m4a,.opus" multiple hidden onchange={(e) => addFiles(e.currentTarget.files)} />
      {#if library.local.length}
        <button class="btn" onclick={analyseAll} disabled={!!batch}><Icon name="sparkle" size={16} /> {batch ? `Analysing ${batch.done}/${batch.total}…` : 'Analyse all'}</button>
        <input type="search" placeholder="Filter" bind:value={filter} aria-label="Filter library" class="filter" />
        <button class="btn ghost" onclick={() => player.playList(shown, 0)}><Icon name="play" size={14} /> Play {shown.length}</button>
      {/if}
    </div>
    {#if progress}<p class="muted">Reading tags… {progress.done}{progress.total ? ' / ' + progress.total : ''}</p>{/if}
    {#if needsPermission}
      <div class="notice surface row">
        <span class="grow">Your browser needs permission again to read your music folder.</span>
        <button class="btn small primary" onclick={async () => (needsPermission = !(await requestPermission()))}>Allow access</button>
      </div>
    {/if}
    {#if !library.local.length && !progress}
      <div class="empty section">
        <Icon name="folder" size={30} />
        <h3>Bring your own music</h3>
        <p>Add a folder or drop audio files anywhere on this page. MP3, FLAC, M4A/AAC, Ogg, Opus and WAV all work.<br />Files stay on this device: nothing is uploaded.</p>
      </div>
    {:else}
      <section class="section"><TrackList tracks={shown} onRemove={(t) => library.removeLocal(t)} /></section>
      <button class="btn small ghost danger" onclick={() => { if (confirm('Remove all local tracks from Resonix? Your files are not deleted.')) library.clearLocal(); }}>Clear local library</button>
    {/if}
  {:else if tab === 'favorites'}
    {#if library.favorites.length}
      <div class="row actions"><button class="btn primary" onclick={() => player.playList(library.favorites, 0)}><Icon name="play" size={14} /> Play</button></div>
      <section class="section"><TrackList tracks={library.favorites} showSource /></section>
    {:else}<div class="empty section"><Icon name="heart" size={28} /><h3>No favourites yet</h3><p>Tap the heart on any track.</p></div>{/if}
  {:else if tab === 'playlists'}
    <div class="row actions"><button class="btn" onclick={() => { const n = prompt('Playlist name', 'New playlist'); if (n) { const p = library.createPlaylist(n); ui.go(`#/playlist/${p.id}`); } }}><Icon name="plus" size={15} /> New playlist</button></div>
    {#if library.playlists.length}
      <div class="grid-cards section">
        {#each library.playlists as p (p.id)}
          <Card title={p.name} subtitle={plural(p.tracks.length, 'track')} artwork={p.tracks[0]?.artwork} seed={p.id} href="#/playlist/{p.id}" onplay={p.tracks.length ? () => player.playList(p.tracks, 0) : undefined} />
        {/each}
      </div>
    {:else}<div class="empty section"><h3>No playlists</h3><p>Create one, or save your queue from the Queue panel.</p></div>{/if}
  {:else}
    {#if library.recent.length}<section class="section"><TrackList tracks={library.recent} showSource /></section>
    {:else}<div class="empty section"><h3>Nothing played yet</h3></div>{/if}
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
