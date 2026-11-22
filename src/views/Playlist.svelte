<script lang="ts">
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { fmtDuration, t } from '../lib/i18n/i18n.svelte';
  import Artwork from '../components/Artwork.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  let { id }: { id: string } = $props();
  const p = $derived(library.playlists.find((x) => x.id === id));
  const total = $derived(p?.tracks.reduce((s, t) => s + (t.duration || 0), 0) ?? 0);

  function rename() { const n = prompt(t('playlist.renamePrompt'), p!.name); if (n) library.renamePlaylist(id, n); }
  function del() { if (confirm(t('playlist.deleteConfirm', { name: p!.name }))) { library.deletePlaylist(id); ui.go('#/library/playlists'); } }
  function exportM3u() {
    const lines = ['#EXTM3U', ...p!.tracks.flatMap((t) => [`#EXTINF:${Math.round(t.duration) || -1},${t.artist} - ${t.title}`, t.streamUrl ?? t.localKey ?? ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' }));
    a.download = `${p!.name}.m3u8`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); // revoking at once can cancel the download
  }
</script>

<div class="page">
  {#if !p}
    <div class="empty"><h3>{t('playlist.notFound')}</h3><a href="#/library/playlists">{t('playlist.back')}</a></div>
  {:else}
    <header class="head">
      <div class="art"><Artwork src={p.tracks[0]?.artwork} seed={p.id} radius="var(--radius)" /></div>
      <div>
        <p class="eyebrow">{t('playlist.eyebrow')}</p>
        <h1 class="page-title" dir="auto">{p.name}</h1>
        <p class="muted">{t('count.tracks', { count: p.tracks.length })}{#if total} · {fmtDuration(total)}{/if}</p>
        <div class="row wrap actions">
          <button class="btn primary" onclick={() => player.playList(p.tracks, 0)} disabled={!p.tracks.length}><Icon name="play" size={16} /> {t('common.play')}</button>
          <button class="btn" onclick={() => { player.shuffle = true; player.playList(p.tracks, Math.floor(Math.random() * p.tracks.length)); }} disabled={!p.tracks.length}><Icon name="shuffle" size={16} /> {t('player.shuffle')}</button>
          <button class="btn ghost" onclick={rename}>{t('playlist.rename')}</button>
          <button class="btn ghost" onclick={exportM3u} disabled={!p.tracks.length}>{t('playlist.export')}</button>
          <button class="btn ghost danger" onclick={del}><Icon name="trash" size={15} /> {t('playlist.delete')}</button>
        </div>
      </div>
    </header>
    {#if p.tracks.length}
      <section class="section"><TrackList tracks={p.tracks} numbered showSource onRemove={(tr) => library.removeFromPlaylist(id, tr.id)} /></section>
    {:else}
      <div class="empty section"><h3>{t('playlist.empty')}</h3><p>{t('playlist.emptyHint')}</p></div>
    {/if}
  {/if}
</div>

<style>
  .head { display: grid; grid-template-columns: 200px 1fr; gap: 30px; align-items: end; }
  .actions { gap: 8px; margin-top: 14px; }
  .danger { color: var(--danger); }
  @media (max-width: 720px) { .head { grid-template-columns: 1fr; } .art { width: 50%; } }
</style>
