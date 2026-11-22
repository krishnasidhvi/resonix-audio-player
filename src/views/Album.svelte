<script lang="ts">
  import { archiveAlbumTracks } from '../lib/sources/archive';
  import { getJson } from '../lib/http';
  import { licenseFromUrl } from '../lib/license';
  import type { Album } from '../lib/sources/album';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { fmtDuration } from '../lib/util';
  import Artwork from '../components/Artwork.svelte';
  import TrackList from '../components/TrackList.svelte';
  import Icon from '../components/Icon.svelte';

  let { id }: { id: string } = $props();
  let album: Album | null = $state(null);
  let tracks: Track[] = $state([]);
  let error = $state('');
  let description = $state('');

  $effect(() => {
    const ident = id.replace(/^archive:/, '');
    album = null; tracks = []; error = '';
    getJson<{ metadata: { title?: string; creator?: string | string[]; licenseurl?: string; year?: string; date?: string; description?: string | string[] } }>(
      `https://archive.org/metadata/${encodeURIComponent(ident)}`,
    ).then(async (m) => {
      const md = m.metadata;
      const lic = licenseFromUrl(md.licenseurl);
      if (!lic) throw new Error('This item has no open licence, so Resonix does not play it.');
      album = {
        id: `archive:${ident}`, source: 'archive', title: md.title ?? ident,
        artist: (Array.isArray(md.creator) ? md.creator[0] : md.creator) ?? 'Unknown artist',
        artwork: `https://archive.org/services/img/${encodeURIComponent(ident)}`,
        license: lic, pageUrl: `https://archive.org/details/${encodeURIComponent(ident)}`, year: md.year ?? md.date?.slice(0, 4),
      };
      const d = Array.isArray(md.description) ? md.description[0] : md.description ?? '';
      description = new DOMParser().parseFromString(d, 'text/html').body.textContent?.trim().slice(0, 600) ?? '';
      tracks = await archiveAlbumTracks(album);
      if (!tracks.length) error = 'No playable audio files in this item.';
    }).catch((e: Error) => (error = e.message));
  });

  const total = $derived(tracks.reduce((s, t) => s + t.duration, 0));
</script>

<div class="page">
  {#if album}
    <header class="head">
      <div class="art"><Artwork src={album.artwork} seed={album.id} radius="var(--radius)" /></div>
      <div class="info">
        <p class="eyebrow">Internet Archive{album.year ? ' · ' + album.year : ''}</p>
        <h1 class="page-title">{album.title}</h1>
        <p class="muted">{album.artist}{#if tracks.length} · {tracks.length} tracks{#if total} · {fmtDuration(total)}{/if}{/if}</p>
        <div class="row wrap actions">
          <button class="btn primary" onclick={() => player.playList(tracks, 0)} disabled={!tracks.length}><Icon name="play" size={16} /> Play</button>
          <button class="btn" onclick={() => player.enqueue(tracks)} disabled={!tracks.length}>Add to queue</button>
          <a class="btn ghost" href={album.pageUrl} target="_blank" rel="noopener">archive.org <Icon name="external" size={14} /></a>
        </div>
        <p class="lic small">
          {#if album.license?.url}<a href={album.license.url} target="_blank" rel="noopener">{album.license.name}</a>{:else}{album.license?.name}{/if}
          <span class="faint"> · licence as declared by the uploader</span>
        </p>
      </div>
    </header>
    {#if description}<p class="desc muted">{description}{description.length >= 600 ? '…' : ''}</p>{/if}
  {/if}
  {#if error}<div class="empty section"><h3>Can't open this item</h3><p>{error}</p></div>
  {:else if !tracks.length}{#each Array(8) as _}<div class="skeleton" style="height:52px;margin:6px 0"></div>{/each}
  {:else}<section class="section"><TrackList tracks={tracks} numbered /></section>{/if}
</div>

<style>
  .head { display: grid; grid-template-columns: 220px 1fr; gap: 32px; align-items: end; }
  .art { box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.7); border-radius: var(--radius); }
  .actions { margin: 16px 0 10px; }
  .small { font-size: 12.5px; margin: 0; }
  .lic a { color: var(--accent); }
  .desc { max-width: 820px; margin: 26px 0 0; font-size: 14px; white-space: pre-line; }
  @media (max-width: 720px) { .head { grid-template-columns: 1fr; } .art { width: 60%; } }
</style>
