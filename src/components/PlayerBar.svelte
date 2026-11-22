<script lang="ts">
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { settings } from '../lib/stores/settings.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t, type Key } from '../lib/i18n/i18n.svelte';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';
  import Scrubber from './Scrubber.svelte';

  const tr = $derived(player.current);
  let sleepOpen = $state(false);
  let lastVol = 0.8;

  let now = $state(Date.now());
  $effect(() => { const i = setInterval(() => (now = Date.now()), 15000); return () => clearInterval(i); });
  const sleepLabel = $derived.by(() => {
    const s = player.sleep;
    if (!s) return '';
    if (s.mode === 'track') return t('sleep.endShort');
    return t('sleep.minShort', { count: Math.max(1, Math.round((s.endsAt - now) / 60000)) });
  });

  function setSleep(min: number | 'track' | null) {
    sleepOpen = false;
    if (min === null) player.setSleep(null);
    else if (min === 'track') player.setSleep({ mode: 'track' });
    else player.setSleep({ mode: 'minutes', endsAt: Date.now() + min * 60000 });
    if (min !== null) ui.toast(min === 'track' ? t('sleep.toastTrack') : t('sleep.toastMinutes', { count: min }));
  }
  function toggleMute() {
    if (settings.volume > 0) { lastVol = settings.volume; player.setVolume(0); } else player.setVolume(lastVol || 0.8);
  }
  function showPanel(p: typeof ui.panel) {
    if (ui.panelOpen && ui.panel === p) ui.panelOpen = false;
    else { ui.panel = p; ui.panelOpen = true; }
  }
</script>

<footer class="bar">
  <div class="now">
    {#if tr}
      <button class="art-btn" aria-label={t('player.openNow')} onclick={() => showPanel('now')}>
        <Artwork src={tr.artwork} seed={tr.artist + tr.title} size="56px" radius="9px" />
      </button>
      <div class="meta">
        <div class="title ellipsis" dir="auto">{tr.title}</div>
        <div class="artist ellipsis" dir="auto">{tr.artist}</div>
      </div>
      <button class="icon-btn" class:on={library.isFavorite(tr.id)} aria-label={t('player.favourite')} aria-pressed={library.isFavorite(tr.id)} onclick={() => library.toggleFavorite(tr)}>
        <Icon name="heart" size={18} fill={library.isFavorite(tr.id)} />
      </button>
    {:else}
      <p class="idle faint">{t('player.idle')}</p>
    {/if}
  </div>

  <div class="center">
    <!-- media controls keep left-to-right order in every language -->
    <div class="transport" dir="ltr">
      <button class="icon-btn" class:on={player.shuffle} aria-label={t('player.shuffle')} aria-pressed={player.shuffle} onclick={() => player.toggleShuffle()}><Icon name="shuffle" size={18} /></button>
      <button class="icon-btn" aria-label={t('player.previous')} onclick={() => player.prev()}><Icon name="prev" size={18} /></button>
      <button class="play" aria-label={player.playing ? t('player.pause') : t('player.play')} onclick={() => player.toggle()} disabled={!player.queue.length}>
        {#if player.buffering}<span class="spin"></span>{/if}
        <Icon name={player.playing ? 'pause' : 'play'} size={22} />
      </button>
      <button class="icon-btn" aria-label={t('player.next')} onclick={() => player.next()}><Icon name="next" size={18} /></button>
      <button class="icon-btn rep" class:on={player.repeat !== 'off'} aria-label={t('player.repeat', { mode: t(`repeat.${player.repeat}` as Key) })} onclick={() => player.cycleRepeat()}>
        <Icon name="repeat" size={18} />{#if player.repeat === 'one'}<span class="one">1</span>{/if}
      </button>
    </div>
    <Scrubber />
  </div>

  <div class="tools">
    <button class="icon-btn" class:on={ui.panelOpen && ui.panel === 'lyrics'} aria-label={t('panel.lyrics')} onclick={() => showPanel('lyrics')}><Icon name="lyrics" size={18} /></button>
    <button class="icon-btn" class:on={ui.panelOpen && ui.panel === 'queue'} aria-label={t('panel.queue')} onclick={() => showPanel('queue')}><Icon name="queue" size={18} /></button>
    <button class="icon-btn" class:on={ui.eqOpen} aria-label={t('player.sound')} onclick={() => (ui.eqOpen = !ui.eqOpen)}><Icon name="eq" size={18} /></button>
    <button class="icon-btn" class:on={ui.practiceOpen || player.rate !== 1 || player.loopA !== null} aria-label={t('player.practice')} onclick={() => (ui.practiceOpen = !ui.practiceOpen)}><Icon name="metronome" size={18} /></button>
    <div class="sleep">
      <button class="icon-btn" class:on={!!player.sleep} aria-label={t('sleep.title')} aria-expanded={sleepOpen} onclick={() => (sleepOpen = !sleepOpen)}><Icon name="moon" size={18} /></button>
      {#if sleepLabel}<span class="sleep-label num">{sleepLabel}</span>{/if}
      {#if sleepOpen}
        <div class="pop surface" role="menu">
          <span class="eyebrow">{t('sleep.title')}</span>
          {#each [15, 30, 45, 60, 90] as m}<button role="menuitem" onclick={() => setSleep(m)}>{t('sleep.minutes', { count: m })}</button>{/each}
          <button role="menuitem" onclick={() => setSleep('track')}>{t('sleep.endOfTrack')}</button>
          {#if player.sleep}<button role="menuitem" class="faint" onclick={() => setSleep(null)}>{t('sleep.off')}</button>{/if}
        </div>
      {/if}
    </div>
    <div class="vol" dir="ltr">
      <button class="icon-btn" aria-label={settings.volume ? t('player.mute') : t('player.unmute')} onclick={toggleMute}><Icon name={settings.volume ? 'volume' : 'mute'} size={18} /></button>
      <input type="range" min="0" max="1" step="0.01" aria-label={t('player.volume')} value={settings.volume} style:--fill="{settings.volume * 100}%" oninput={(e) => player.setVolume(+e.currentTarget.value)} />
    </div>
    <button class="icon-btn" aria-label={t('player.ambient')} onclick={() => (ui.ambient = true)} disabled={!tr}><Icon name="expand" size={18} /></button>
    <button class="icon-btn panel-btn" class:on={ui.panelOpen} aria-label={t('player.togglePanel')} onclick={() => (ui.panelOpen = !ui.panelOpen)}><Icon name="panel" size={18} /></button>
  </div>
</footer>

<style>
  .bar {
    grid-area: bar; display: grid; grid-template-columns: minmax(200px, 1fr) minmax(320px, 1.6fr) minmax(200px, 1fr);
    align-items: center; gap: 24px; padding: 0 18px; height: var(--bar);
    background: var(--bg-sunk); border-top: 1px solid var(--line-soft); position: relative; z-index: 20;
  }
  .now { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .art-btn { border-radius: 9px; flex: none; }
  .meta { min-width: 0; display: grid; }
  .title { font-weight: 600; }
  .artist { color: var(--text-2); font-size: 13px; }
  .idle { margin: 0; font-size: 13px; }
  .center { display: grid; gap: 4px; justify-items: center; }
  .transport { display: flex; align-items: center; gap: 10px; }
  .play {
    position: relative; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center;
    background: var(--text); color: var(--bg); transition: transform 0.12s;
  }
  .play:hover { transform: scale(1.06); }
  .play:disabled { opacity: 0.4; transform: none; }
  .spin { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .rep { position: relative; }
  .one { position: absolute; font-size: 9px; font-weight: 800; top: 6px; right: 5px; }
  .tools { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
  .vol { display: flex; align-items: center; width: 140px; }
  .vol input { flex: 1; }
  .sleep { position: relative; display: flex; align-items: center; }
  .sleep-label { font-size: 11px; color: var(--accent); margin-right: 4px; }
  .pop { position: absolute; bottom: 48px; inset-inline-end: -40px; padding: 8px; display: grid; min-width: 180px; box-shadow: 0 18px 50px rgb(0 0 0 / 0.5); }
  .pop .eyebrow { padding: 4px 10px 6px; }
  .pop button { text-align: start; padding: 8px 10px; border-radius: 7px; }
  .pop button:hover { background: oklch(25% 0.015 var(--h)); }
  @media (max-width: 1100px) {
    .vol { width: 96px; }
    .bar { gap: 14px; }
  }
  @media (max-width: 900px) {
    .bar { grid-template-columns: 1fr auto; grid-template-rows: auto auto; height: auto; padding: 8px 12px; gap: 6px 12px; }
    .center { grid-column: 1 / -1; grid-row: 2; }
    .tools .vol, .tools .panel-btn { display: none; }
  }
</style>
