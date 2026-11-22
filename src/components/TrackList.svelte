<script lang="ts">
  import { t as tr } from '../lib/i18n/i18n.svelte';
  import { artistLabel, licenceLabel, sourceName } from '../lib/i18n/labels';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { offline } from '../lib/stores/offline.svelte';
  import { SOURCES } from '../lib/sources';
  import { fmtTime } from '../lib/util';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';
  import TrackMenu from './TrackMenu.svelte';

  let { tracks, showSource = false, numbered = false, onRemove }: {
    tracks: Track[]; showSource?: boolean; numbered?: boolean; onRemove?: (t: Track) => void;
  } = $props();

  // Long lists render in pages as you scroll, so a library of thousands of files stays fast.
  const PAGE = 120;
  let limit = $state(PAGE);
  let sentinel: HTMLLIElement | undefined = $state();
  $effect(() => { void tracks; limit = PAGE; });
  $effect(() => {
    if (!sentinel) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) limit += PAGE; }, { rootMargin: '600px' });
    io.observe(sentinel);
    return () => io.disconnect();
  });
  const shown = $derived(tracks.length > limit ? tracks.slice(0, limit) : tracks);
</script>

<ol class="list" role="list">
  {#each shown as t, i (t.id + ':' + i)}
    {@const cur = player.current?.id === t.id}
    {@const fav = library.isFavorite(t.id)}
    {@const unavailable = !offline.online && !offline.playableOffline(t)}
    <li class="row-item" class:current={cur} class:unavailable title={unavailable ? tr('offline.unavailable') : undefined}>
      <button class="hit" aria-label={tr('track.playBy', { title: t.title, artist: artistLabel(t.artist) })} onclick={() => player.playList(tracks, i)}></button>
      <span class="idx num">
        {#if cur && player.playing}
          <span class="bars" aria-label={tr('track.playing')}><i></i><i></i><i></i></span>
        {:else if numbered}{i + 1}{:else}<Icon name="play" size={14} />{/if}
      </span>
      <Artwork src={t.artwork} alts={t.artworkAlts} seed={t.artist + t.title} size="42px" radius="7px" />
      <span class="meta">
        <span class="title ellipsis" dir="auto">{t.title}</span>
        <span class="sub ellipsis" dir="auto">
          {#if t.isLive}<span class="live">{tr('common.live')}</span>{/if}
          {#if offline.has(t.id)}<span class="saved" role="img" aria-label={tr('offline.badge')} title={tr('offline.badge')}><Icon name="download" size={12} /></span>{/if}
          {artistLabel(t.artist)}{#if t.album && !t.isLive}<span class="faint"> · {t.album}</span>{/if}
        </span>
      </span>
      {#if showSource}
        <span class="src" style:--c={SOURCES[t.source].color}>{sourceName(t.source)}</span>
      {/if}
      {#if t.license}<span class="lic ellipsis faint">{licenceLabel(t.license)}</span>{/if}
      <button class="icon-btn fav" class:on={fav} aria-label={fav ? tr('track.unfav') : tr('track.fav')} aria-pressed={fav} onclick={() => library.toggleFavorite(t)}>
        <Icon name="heart" size={17} fill={fav} />
      </button>
      <span class="dur num faint">{t.isLive ? '' : fmtTime(t.duration)}</span>
      <TrackMenu track={t} onRemove={onRemove ? () => onRemove(t) : undefined} />
    </li>
  {/each}
  {#if tracks.length > limit}<li class="sentinel" bind:this={sentinel} aria-hidden="true"></li>{/if}
</ol>

<style>
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  @container (max-width: 600px) { .lic, .src { display: none; } }
  @container (max-width: 300px) { .dur { display: none; } }
  .row-item {
    position: relative; display: flex; align-items: center; gap: 14px; container-type: inline-size;
    padding-block: 6px; padding-inline: 10px 8px; border-radius: 10px;
  }
  /* Each row is its own stacking context (container query), so lift the row whose menu is open above the rows below it. */
  .row-item:has(:global(.menu)) { z-index: 20; }
  .idx { width: 26px; flex: none; }
  .meta { flex: 1; min-width: 120px; }
  .dur { width: 48px; flex: none; }
  .row-item:hover, .row-item:focus-within { background: var(--bg-raise); }
  .row-item.current .title { color: var(--accent); }
  .hit { position: absolute; inset: 0; border-radius: inherit; }
  .row-item > :not(.hit) { position: relative; pointer-events: none; }
  .row-item > .fav, .row-item > :global(.menu-root) { pointer-events: auto; }
  .idx { color: var(--text-3); text-align: center; display: grid; place-items: center; font-size: 13px; }
  .row-item:hover .idx { color: var(--text); }
  .meta { display: grid; min-width: 0; }
  .title { font-weight: 550; font-size: 14.5px; }
  .sub { color: var(--text-2); font-size: 13px; }
  .src { font-size: 11.5px; padding: 2px 8px; border-radius: 6px; color: var(--c); background: color-mix(in oklch, var(--c) 14%, transparent); white-space: nowrap; }
  .lic { font-size: 12px; max-width: 150px; }
  .fav { opacity: 0; }
  .row-item:hover .fav, .row-item:focus-within .fav, .fav:focus-visible, .fav.on { opacity: 1; }
  .fav.on { color: var(--accent); }
  .dur { text-align: end; font-size: 13px; }
  .live { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--danger); margin-inline-end: 6px; }
  .saved { display: inline-flex; vertical-align: -2px; color: var(--accent); margin-inline-end: 6px; }
  /* offline, and not saved on this device */
  .row-item.unavailable { opacity: 0.42; }
  .bars { display: inline-flex; gap: 2px; height: 12px; align-items: end; }
  .bars i { width: 3px; background: var(--accent); border-radius: 1px; animation: bar 0.9s ease-in-out infinite alternate; }
  .bars i:nth-child(2) { animation-delay: -0.3s; } .bars i:nth-child(3) { animation-delay: -0.6s; }
  @keyframes bar { from { height: 3px; } to { height: 12px; } }
  .sentinel { height: 1px; }
  @media (max-width: 1100px) { .lic { display: none; } }
  @media (max-width: 720px) {
    .src, .dur, .fav { display: none; }
    .row-item { gap: 10px; }
  }
</style>
