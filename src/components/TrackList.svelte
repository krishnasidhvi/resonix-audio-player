<script lang="ts">
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { SOURCES } from '../lib/sources';
  import { fmtTime } from '../lib/util';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';
  import TrackMenu from './TrackMenu.svelte';

  let { tracks, showSource = false, numbered = false, onRemove }: {
    tracks: Track[]; showSource?: boolean; numbered?: boolean; onRemove?: (t: Track) => void;
  } = $props();

  const isCurrent = (t: Track) => player.current?.id === t.id;
</script>

<ol class="list" role="list">
  {#each tracks as t, i (t.id + ':' + i)}
    {@const cur = isCurrent(t)}
    <li class="row-item" class:current={cur}>
      <button class="hit" aria-label="Play {t.title} by {t.artist}" ondblclick={() => player.playList(tracks, i)} onclick={() => player.playList(tracks, i)}></button>
      <span class="idx num">
        {#if cur && player.playing}
          <span class="bars" aria-label="Playing"><i></i><i></i><i></i></span>
        {:else if numbered}{i + 1}{:else}<Icon name="play" size={14} />{/if}
      </span>
      <Artwork src={t.artwork} seed={t.artist + t.title} size="42px" radius="7px" />
      <span class="meta">
        <span class="title ellipsis">{t.title}</span>
        <span class="sub ellipsis">
          {#if t.isLive}<span class="live">LIVE</span>{/if}
          {t.artist}{#if t.album && !t.isLive}<span class="faint"> · {t.album}</span>{/if}
        </span>
      </span>
      {#if showSource}
        <span class="src" style:--c={SOURCES[t.source].color}>{SOURCES[t.source].name}</span>
      {/if}
      {#if t.license}<span class="lic ellipsis faint" title={t.license.name}>{t.license.name}</span>{/if}
      <button class="icon-btn fav" class:on={library.isFavorite(t.id)} aria-label={library.isFavorite(t.id) ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={library.isFavorite(t.id)} onclick={() => library.toggleFavorite(t)}>
        <Icon name="heart" size={17} fill={library.isFavorite(t.id)} />
      </button>
      <span class="dur num faint">{t.isLive ? '' : fmtTime(t.duration)}</span>
      <TrackMenu track={t} onRemove={onRemove ? () => onRemove(t) : undefined} />
    </li>
  {/each}
</ol>

<style>
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  @container (max-width: 600px) { .lic, .src { display: none; } }
  @container (max-width: 300px) { .dur { display: none; } }
  .row-item {
    position: relative; display: flex; align-items: center; gap: 14px; container-type: inline-size;
    padding: 6px 8px 6px 10px; border-radius: 10px;
  }
  .idx { width: 26px; flex: none; }
  .meta { flex: 1; min-width: 120px; }
  .dur { width: 48px; flex: none; }
  .row-item:hover { background: var(--bg-raise); }
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
  .row-item:hover .fav, .fav.on { opacity: 1; }
  .fav.on { color: var(--accent); }
  .dur { text-align: right; font-size: 13px; }
  .live { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--danger); margin-right: 6px; }
  .bars { display: inline-flex; gap: 2px; height: 12px; align-items: end; }
  .bars i { width: 3px; background: var(--accent); border-radius: 1px; animation: bar 0.9s ease-in-out infinite alternate; }
  .bars i:nth-child(2) { animation-delay: -0.3s; } .bars i:nth-child(3) { animation-delay: -0.6s; }
  @keyframes bar { from { height: 3px; } to { height: 12px; } }
  @media (max-width: 1100px) { .lic { display: none; } }
  @media (max-width: 720px) {
    .src, .dur, .fav { display: none; }
    .row-item { gap: 10px; }
  }
</style>
