<script lang="ts">
  // Full-screen player for phones: opened by tapping the mini player.
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t, type Key } from '../lib/i18n/i18n.svelte';
  import { artistLabel } from '../lib/i18n/labels';
  import { focusScope } from '../lib/a11y';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';
  import Scrubber from './Scrubber.svelte';
  import Lyrics from './panel/Lyrics.svelte';
  import Queue from './panel/Queue.svelte';
  import Similar from './panel/Similar.svelte';

  type Tab = 'now' | 'lyrics' | 'queue';
  let tab: Tab = $state('now');
  const tr = $derived(player.current);
  const close = () => (ui.nowSheet = false);
  /** Overlays that live below the sheet: close the sheet first so they are visible. */
  const openTool = (fn: () => void) => () => { close(); fn(); };
  const tabs: { id: Tab; label: Key }[] = [
    { id: 'now', label: 'panel.now' }, { id: 'lyrics', label: 'panel.lyrics' }, { id: 'queue', label: 'panel.queue' },
  ];
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-label={t('sheet.open')} use:focusScope={{ modal: true, onClose: close }}>
  <header class="row">
    <button class="icon-btn" aria-label={t('sheet.close')} onclick={close}><span class="chev" aria-hidden="true"></span></button>
    <div class="tabs grow" role="tablist">
      {#each tabs as tb}
        <button role="tab" aria-selected={tab === tb.id} class:active={tab === tb.id} onclick={() => (tab = tb.id)}>{t(tb.label)}</button>
      {/each}
    </div>
  </header>

  {#if tab === 'now'}
    <div class="now">
      {#if tr}
        <div class="art"><Artwork src={tr.artwork} alts={tr.artworkAlts} seed={tr.artist + tr.title} radius="16px" /></div>
        <div class="meta row">
          <div class="grow" style="min-width:0">
            <h2 class="ellipsis display" dir="auto">{tr.title}</h2>
            <p class="ellipsis muted" dir="auto">{artistLabel(tr.artist)}</p>
          </div>
          <button class="icon-btn" class:on={library.isFavorite(tr.id)} aria-label={t('player.favourite')} aria-pressed={library.isFavorite(tr.id)} onclick={() => library.toggleFavorite(tr)}>
            <Icon name="heart" size={22} fill={library.isFavorite(tr.id)} />
          </button>
        </div>
        <Scrubber tall />
        <div class="transport row" dir="ltr">
          <button class="icon-btn" class:on={player.shuffle} aria-label={t('player.shuffle')} aria-pressed={player.shuffle} onclick={() => player.toggleShuffle()}><Icon name="shuffle" size={22} /></button>
          <button class="icon-btn big" aria-label={t('player.previous')} onclick={() => player.prev()}><Icon name="prev" size={26} /></button>
          <button class="play" aria-label={player.playing ? t('player.pause') : t('player.play')} onclick={() => player.toggle()}><Icon name={player.playing ? 'pause' : 'play'} size={30} /></button>
          <button class="icon-btn big" aria-label={t('player.next')} onclick={() => player.next()}><Icon name="next" size={26} /></button>
          <button class="icon-btn" class:on={player.repeat !== 'off'} aria-label={t('player.repeat', { mode: t(`repeat.${player.repeat}` as Key) })} onclick={() => player.cycleRepeat()}><Icon name="repeat" size={22} /></button>
        </div>
        <div class="tools row">
          <button class="icon-btn" aria-label={t('player.sound')} onclick={openTool(() => (ui.eqOpen = true))}><Icon name="eq" /></button>
          <button class="icon-btn" aria-label={t('player.practice')} onclick={openTool(() => (ui.practiceOpen = true))}><Icon name="metronome" /></button>
          <button class="icon-btn" aria-label={t('player.ambient')} onclick={openTool(() => (ui.ambient = true))}><Icon name="expand" /></button>
          <button class="icon-btn" aria-label={t('cmd.signal')} onclick={openTool(() => { ui.panel = 'signal'; ui.panelOpen = true; })}><Icon name="signal" /></button>
        </div>
        <div class="similar"><Similar /></div>
      {/if}
    </div>
  {:else if tab === 'lyrics'}
    <div class="fill"><Lyrics /></div>
  {:else}
    <div class="scroll"><Queue /></div>
  {/if}
</div>

<style>
  .sheet {
    position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column;
    background: linear-gradient(180deg, oklch(26% 0.06 var(--h)), var(--bg) 55%);
    padding: max(10px, env(safe-area-inset-top)) 18px max(16px, env(safe-area-inset-bottom));
    animation: up 0.28s var(--ease);
  }
  @keyframes up { from { transform: translateY(6%); opacity: 0; } }
  header { gap: 6px; margin-bottom: 8px; }
  .chev { width: 12px; height: 12px; border-inline-end: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translate(-2px, -2px); }
  .tabs { display: flex; justify-content: center; gap: 2px; margin-inline-end: 36px; }
  .tabs button { padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 14px; color: var(--text-3); }
  .tabs button.active { color: var(--text); background: var(--bg-raise); }
  .now { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-bottom: 12px; }
  .art { width: min(100%, 46vh); align-self: center; box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.7); border-radius: 16px; }
  .meta h2 { font-size: 22px; margin: 4px 0 0; }
  .meta p { margin: 2px 0 0; font-size: 15px; }
  .transport { justify-content: space-between; padding: 0 4px; }
  .icon-btn.big { width: 48px; height: 48px; }
  .play { width: 66px; height: 66px; border-radius: 50%; display: grid; place-items: center; background: var(--text); color: var(--bg); }
  .tools { justify-content: space-around; }
  .similar { margin-top: 6px; }
  .fill { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .scroll { flex: 1; overflow-y: auto; }
</style>
