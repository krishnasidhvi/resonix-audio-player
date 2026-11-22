<script lang="ts">
  import { youtube } from '../lib/audio/youtube-player';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  // YouTube requires the embedded player to stay visible and at least 200×200 px while it plays.
  let host: HTMLDivElement;
  let large = $state(false);
  const cur = $derived(player.current);
  const visible = $derived(cur?.source === 'youtube');
  $effect(() => { youtube.attach(host); });
</script>

<div class="dock surface" class:visible class:large class:ambient={ui.ambient && visible} role="region" aria-label={t('yt.dock')}>
  <div class="dock-head row">
    <span class="yt-mark" aria-hidden="true"></span>
    <span class="grow ellipsis" dir="auto">{cur?.source === 'youtube' ? cur.title : ''}</span>
    {#if cur?.pageUrl}<a class="icon-btn" href={cur.pageUrl} target="_blank" rel="noopener" aria-label={t('yt.openOn')} title={t('yt.openOn')}><Icon name="external" size={15} /></a>{/if}
    {#if !ui.ambient}
      <button class="icon-btn" aria-label={large ? t('yt.shrink') : t('yt.enlarge')} title={large ? t('yt.shrink') : t('yt.enlarge')} onclick={() => (large = !large)}><Icon name="expand" size={15} /></button>
    {/if}
  </div>
  <div class="frame" bind:this={host}></div>
</div>

<style>
  .dock {
    position: fixed; z-index: 35; inset-inline-start: calc(var(--sidebar) + 16px); bottom: calc(var(--bar) + 14px);
    width: 356px; display: none; flex-direction: column; overflow: hidden; padding: 0;
    box-shadow: 0 24px 60px rgb(0 0 0 / 0.55);
  }
  .dock.visible { display: flex; }
  .dock.large { width: min(640px, calc(100vw - var(--sidebar) - 48px)); }
  .dock.ambient { z-index: 85; inset-inline-start: 5vw; top: 6vh; bottom: auto; width: min(40vw, 720px); }
  .dock-head { gap: 8px; padding: 4px 6px 4px 12px; font-size: 12.5px; color: var(--text-2); }
  .dock-head .icon-btn { width: 30px; height: 30px; }
  .yt-mark { width: 18px; height: 12px; border-radius: 3px; background: #f00; position: relative; flex: none; }
  .yt-mark::after { content: ''; position: absolute; left: 7px; top: 3px; border-left: 6px solid #fff; border-top: 3px solid transparent; border-bottom: 3px solid transparent; }
  /* 16:9 and never below YouTube's 200 px minimum height */
  .frame { width: 100%; aspect-ratio: 16 / 9; min-height: 200px; background: #000; }
  .frame :global(iframe) { width: 100%; height: 100%; display: block; border: 0; }
  @media (max-width: 720px) {
    .dock, .dock.large { inset-inline: 8px; width: auto; bottom: 190px; }
  }
</style>
