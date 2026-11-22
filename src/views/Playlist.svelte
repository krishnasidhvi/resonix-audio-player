<script lang="ts">
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { fmtDuration, plural } from '../lib/util';
  import Artwork from '../components/Artwork.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  let { id }: { id: string } = $props();
  const p = $derived(library.playlists.find((x) => x.id === id));
  const total = $derived(p?.tracks.reduce((s, t) => s + (t.duration || 0), 0) ?? 0);

  function rename() { const n = prompt('Rename playlist', p!.name); if (n) library.renamePlaylist(id, n); }
  function del() { if (confirm(`Delete "${p!.name}"?`)) { library.deletePlaylist(id); ui.go('#/library/playlists'); } }
  function exportM3u() {
    const lines = ['#EXTM3U', ...p!.tracks.flatMap((t) => [`#EXTINF:${Math.round(t.duration) || -1},${t.artist} - ${t.title}`, t.streamUrl ?? t.localKey ?? ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' }));
    a.download = `${p!.name}.m3u8`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
</script>

<div class="page">
  {#if !p}
    <div class="empty"><h3>Playlist not found</h3><a href="#/library/playlists">Back to playlists</a></div>
  {:else}
    <header class="head">
      <div class="art"><Artwork src={p.tracks[0]?.artwork} seed={p.id} radius="var(--radius)" /></div>
      <div>
        <p class="eyebrow">Playlist</p>
        <h1 class="page-title">{p.name}</h1>
        <p class="muted">{plural(p.tracks.length, 'track')}{#if total} · {fmtDuration(total)}{/if}</p>
        <div class="row wrap actions">
          <button class="btn primary" onclick={() => player.playList(p.tracks, 0)} disabled={!p.tracks.length}><Icon name="play" size={16} /> Play</button>
          <button class="btn" onclick={() => { player.shuffle = true; player.playList(p.tracks, Math.floor(Math.random() * p.tracks.length)); }} disabled={!p.tracks.length}><Icon name="shuffle" size={16} /> Shuffle</button>
          <button class="btn ghost" onclick={rename}>Rename</button>
          <button class="btn ghost" onclick={exportM3u} disabled={!p.tracks.length}>Export .m3u8</button>
          <button class="btn ghost danger" onclick={del}><Icon name="trash" size={15} /> Delete</button>
        </div>
      </div>
    </header>
    {#if p.tracks.length}
      <section class="section"><TrackList tracks={p.tracks} numbered showSource onRemove={(t) => library.removeFromPlaylist(id, t.id)} /></section>
    {:else}
      <div class="empty section"><h3>This playlist is empty</h3><p>Add tracks from any ⋯ menu.</p></div>
    {/if}
  {/if}
</div>

<style>
  .head { display: grid; grid-template-columns: 200px 1fr; gap: 30px; align-items: end; }
  .actions { gap: 8px; margin-top: 14px; }
  .danger { color: var(--danger); }
  @media (max-width: 720px) { .head { grid-template-columns: 1fr; } .art { width: 50%; } }
</style>
