<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { fmtTime } from '../lib/util';

  let { tall = false }: { tall?: boolean } = $props();

  let canvas: HTMLCanvasElement;
  let box: HTMLDivElement;
  let width = $state(0);
  let hoverX: number | null = $state(null);
  let dragging = $state(false);
  let dragT = $state(0);

  const dur = $derived(player.duration);
  const time = $derived(dragging ? dragT : player.time);
  const frac = $derived(dur ? Math.min(1, time / dur) : 0);
  const a = $derived(player.analysis);
  const live = $derived(player.current?.isLive ?? false);
  const h = $derived(tall ? 56 : 30);

  $effect(() => {
    // redraw when any of these change
    void [width, frac, a, player.loopA, player.loopB, h];
    draw();
  });

  function draw() {
    if (!canvas || !width) return;
    const dpr = devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    const g = canvas.getContext('2d')!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, width, h);
    const css = getComputedStyle(canvas);
    const accent = css.getPropertyValue('--accent').trim() || '#b9a';
    const dim = css.getPropertyValue('--line').trim() || '#444';
    const muted = css.getPropertyValue('--text-3').trim() || '#999';
    const mid = h / 2;
    if (a?.wave?.length) {
      const n = a.wave.length;
      const bw = width / n;
      for (let i = 0; i < n; i++) {
        const x = i * bw;
        const amp = Math.max(1, a.wave[i] * (h / 2 - 2));
        const played = i / n < frac;
        g.globalAlpha = played ? 1 : 0.28 + a.heat[i] * 0.5;
        g.fillStyle = played ? accent : muted;
        g.fillRect(x, mid - amp, Math.max(1, bw - 0.6), amp * 2);
      }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = dim;
      g.fillRect(0, mid - 2, width, 4);
      g.fillStyle = accent;
      g.fillRect(0, mid - 2, live ? width : width * frac, 4);
    }
    if (dur && player.loopA !== null) {
      const x1 = (player.loopA / dur) * width;
      const x2 = player.loopB !== null ? (player.loopB / dur) * width : x1 + 2;
      g.fillStyle = accent;
      g.globalAlpha = 0.18;
      g.fillRect(x1, 0, x2 - x1, h);
      g.globalAlpha = 1;
      g.fillRect(x1, 0, 1.5, h);
      if (player.loopB !== null) g.fillRect(x2 - 1.5, 0, 1.5, h);
    }
  }

  function timeAt(clientX: number) {
    const r = box.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * dur;
  }
  function down(e: PointerEvent) {
    if (!dur || live) return;
    dragging = true;
    dragT = timeAt(e.clientX);
    box.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    const r = box.getBoundingClientRect();
    hoverX = e.clientX - r.left;
    if (dragging) dragT = timeAt(e.clientX);
  }
  function up() {
    if (dragging) player.seek(dragT);
    dragging = false;
  }
  function key(e: KeyboardEvent) {
    if (!dur) return;
    const step = e.shiftKey ? 30 : 5;
    if (e.key === 'ArrowRight') { player.seek(player.time + step); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { player.seek(player.time - step); e.preventDefault(); }
    else if (e.key === 'Home') player.seek(0);
  }
</script>

<div class="scrub" class:tall dir="ltr">
  <span class="time num">{live ? t('common.live') : fmtTime(time)}</span>
  <div
    class="track"
    bind:this={box}
    bind:clientWidth={width}
    style:height="{h}px"
    role="slider"
    tabindex="0"
    aria-label={t('scrub.seek')}
    aria-valuemin={0}
    aria-valuemax={Math.round(dur)}
    aria-valuenow={Math.round(time)}
    aria-valuetext={fmtTime(time)}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointerleave={() => (hoverX = null)}
    onkeydown={key}
  >
    <canvas bind:this={canvas} style:width="{width}px" style:height="{h}px"></canvas>
    {#if hoverX !== null && dur && !live}
      <span class="tip num" style:left="{hoverX}px">{fmtTime((hoverX / width) * dur)}</span>
    {/if}
    {#if a && dur && a.peakSection > 0}
      <button
        class="peak"
        style:left="{(a.peakSection / dur) * 100}%"
        title={t('scrub.peak', { time: fmtTime(a.peakSection) })}
        aria-label={t('scrub.peak', { time: fmtTime(a.peakSection) })}
        onpointerdown={(e) => e.stopPropagation()}
        onclick={() => player.seek(a.peakSection)}
      ></button>
    {/if}
  </div>
  <span class="time num right">{live ? '' : fmtTime(dur)}</span>
</div>

<style>
  .scrub { display: flex; align-items: center; gap: 12px; width: 100%; }
  .time { font-size: 12px; color: var(--text-3); width: 44px; flex: none; }
  .right { text-align: right; }
  .track { position: relative; flex: 1; cursor: pointer; touch-action: none; }
  canvas { display: block; }
  .tip {
    position: absolute; top: -26px; transform: translateX(-50%); pointer-events: none;
    font-size: 11.5px; padding: 2px 7px; border-radius: 6px; background: var(--text); color: var(--bg);
  }
  .peak {
    position: absolute; top: -7px; width: 12px; height: 12px; margin-left: -6px;
    border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
    background: var(--accent); box-shadow: 0 0 0 3px var(--bg);
    opacity: 0.85; transition: transform 0.15s, opacity 0.15s;
  }
  .peak:hover { opacity: 1; transform: rotate(-45deg) scale(1.25); }
</style>
