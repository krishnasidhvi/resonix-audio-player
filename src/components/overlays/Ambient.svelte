<script lang="ts">
  import Cinematic from '../Cinematic.svelte';
  import { t as tt } from '../../lib/i18n/i18n.svelte';
  import { player } from '../../lib/stores/player.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import Artwork from '../Artwork.svelte';
  import Icon from '../Icon.svelte';
  import Lyrics from '../panel/Lyrics.svelte';
  import Scrubber from '../Scrubber.svelte';
  import Visualizer from '../Visualizer.svelte';

  const t = $derived(player.current);
  let root: HTMLDivElement;
  let idle = $state(false);
  let timer = 0;
  function wake() { idle = false; clearTimeout(timer); timer = window.setTimeout(() => (idle = true), 3000); }
  $effect(() => {
    wake();
    // whole page, not just this overlay, so the YouTube player (if any) stays visible
    document.documentElement.requestFullscreen?.().catch(() => {});
    const onFs = () => { if (!document.fullscreenElement) ui.ambient = false; };
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  });
</script>

<div class="amb" class:idle bind:this={root} onpointermove={wake} role="dialog" tabindex="-1" aria-modal="true" aria-label={tt('ambient.aria')}>
  {#if t}
    <div class="bg"><Cinematic variant="ambient" /></div>
    <div class="grid">
      <div class="left">
        {#if t.source === 'youtube'}<div class="video-slot"></div>{:else}<div class="art"><Artwork src={t.artwork} seed={t.artist + t.title} radius="18px" /></div>{/if}
        <h1 class="display" dir="auto">{t.title}</h1>
        <p dir="auto">{t.artist}</p>
        <div class="viz"><Visualizer bands={56} height={64} mirror /></div>
      </div>
      <div class="right"><Lyrics big /></div>
    </div>
    <div class="controls" dir="ltr">
      <Scrubber tall />
      <div class="row center">
        <button class="icon-btn" aria-label={tt('player.previous')} onclick={() => player.prev()}><Icon name="prev" /></button>
        <button class="play" aria-label={player.playing ? tt('player.pause') : tt('player.play')} onclick={() => player.toggle()}><Icon name={player.playing ? 'pause' : 'play'} size={26} /></button>
        <button class="icon-btn" aria-label={tt('player.next')} onclick={() => player.next()}><Icon name="next" /></button>
      </div>
    </div>
  {/if}
  <button class="icon-btn close" aria-label={tt('ambient.exit')} onclick={() => (ui.ambient = false)}><Icon name="close" /></button>
</div>

<style>
  .amb { position: fixed; inset: 0; z-index: 80; background: oklch(10% 0.03 var(--h)); display: flex; flex-direction: column; padding: 5vh 5vw 3vh; overflow: hidden; cursor: default; }
  .amb.idle { cursor: none; }
  .amb.idle .controls, .amb.idle .close { opacity: 0; }
  .bg { position: absolute; inset: 0; }
  .bg::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgb(0 0 0 / 0.15), rgb(0 0 0 / 0.55)); }
  .grid { position: relative; flex: 1; display: grid; grid-template-columns: minmax(260px, 0.8fr) 1.2fr; gap: 6vw; min-height: 0; align-items: center; }
  .left { display: grid; gap: 10px; align-content: center; }
  .video-slot { width: min(40vw, 720px); aspect-ratio: 16 / 9; min-height: 200px; }
  .art { width: min(38vh, 100%); box-shadow: 0 40px 90px rgb(0 0 0 / 0.6); border-radius: 18px; }
  h1 { font-size: clamp(28px, 3.4vw, 52px); margin: 16px 0 0; line-height: 1.05; }
  p { margin: 0; font-size: 18px; color: rgb(255 255 255 / 0.75); }
  .viz { width: min(38vh, 100%); margin-top: 18px; }
  .right { height: 70vh; min-height: 0; }
  .controls { position: relative; display: grid; gap: 10px; transition: opacity 0.4s; }
  .center { justify-content: center; gap: 18px; }
  .play { width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: #111; }
  .close { position: absolute; top: 18px; inset-inline-end: 18px; transition: opacity 0.4s; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .right { height: 40vh; } .art { width: 30vh; } }
</style>
