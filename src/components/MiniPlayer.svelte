<script lang="ts">
  // Rendered inside the pop-out (Document Picture-in-Picture) window.
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import { artistLabel } from '../lib/i18n/labels';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';
  import Scrubber from './Scrubber.svelte';

  const tr = $derived(player.current);
  // YouTube's player must stay visible in the main window, so it isn't controlled from here
  const youtube = $derived(tr?.source === 'youtube');
  let root: HTMLDivElement;
  $effect(() => {
    const doc = root.ownerDocument;
    doc.title = tr ? `${tr.title} · ${tr.artist}` : t('pip.title');
    const key = (e: KeyboardEvent) => {
      if (youtube) return;
      if (e.key === ' ') { e.preventDefault(); player.toggle(); }
      else if (e.key === 'ArrowRight' && e.shiftKey) player.next();
      else if (e.key === 'ArrowLeft' && e.shiftKey) player.prev();
    };
    doc.addEventListener('keydown', key);
    return () => doc.removeEventListener('keydown', key);
  });
</script>

<div class="mini" bind:this={root}>
  {#if tr}
    <div class="art"><Artwork src={tr.artwork} alts={tr.artworkAlts} seed={tr.artist + tr.title} radius="12px" /></div>
    <div class="meta row">
      <div class="grow" style="min-width:0">
        <div class="title ellipsis" dir="auto">{tr.title}</div>
        <div class="artist ellipsis" dir="auto">{artistLabel(tr.artist)}</div>
      </div>
      <button class="icon-btn" class:on={library.isFavorite(tr.id)} aria-label={t('player.favourite')} aria-pressed={library.isFavorite(tr.id)} onclick={() => library.toggleFavorite(tr)}>
        <Icon name="heart" size={18} fill={library.isFavorite(tr.id)} />
      </button>
    </div>
    {#if youtube}
      <p class="note">{t('pip.youtube')}</p>
    {:else}
      <Scrubber />
      <div class="transport row" dir="ltr">
        <button class="icon-btn" aria-label={t('player.previous')} onclick={() => player.prev()}><Icon name="prev" size={20} /></button>
        <button class="play" aria-label={player.playing ? t('player.pause') : t('player.play')} onclick={() => player.toggle()}><Icon name={player.playing ? 'pause' : 'play'} size={24} /></button>
        <button class="icon-btn" aria-label={t('player.next')} onclick={() => player.next()}><Icon name="next" size={20} /></button>
      </div>
    {/if}
  {:else}
    <p class="note">{t('now.nothing')}</p>
  {/if}
</div>

<style>
  :global(body) { margin: 0; background: var(--bg); overflow: hidden; }
  .mini { height: 100vh; display: flex; flex-direction: column; gap: 10px; padding: 14px; box-sizing: border-box;
    background: linear-gradient(180deg, oklch(24% 0.06 var(--h)), var(--bg) 70%); }
  .art { width: min(100%, calc(100vh - 170px)); align-self: center; }
  .title { font-weight: 650; font-size: 15px; }
  .artist { color: var(--text-2); font-size: 13px; }
  .transport { justify-content: center; gap: 18px; }
  .play { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: var(--text); color: var(--bg); }
  .note { color: var(--text-2); font-size: 13px; margin: 0; }
</style>
