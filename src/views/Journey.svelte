<script lang="ts">
  import { allAnalyses } from '../lib/audio/analysis';
  import type { Analysis, Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { fmtDuration, t } from '../lib/i18n/i18n.svelte';
  import Icon from '../components/Icon.svelte';

  const W = 800, H = 460, PAD = 36;
  const BPM_MIN = 60, BPM_MAX = 180;

  let items: Analysis[] = $state([]);
  let loaded = $state(false);
  allAnalyses().then((a) => { items = a.filter((x) => x.bpm); }).catch(() => {}).finally(() => (loaded = true));

  const px = (bpm: number) => PAD + ((Math.min(BPM_MAX, Math.max(BPM_MIN, bpm)) - BPM_MIN) / (BPM_MAX - BPM_MIN)) * (W - 2 * PAD);
  const py = (energy: number) => H - PAD - energy * (H - 2 * PAD);

  let path: [number, number][] = $state([]);
  let drawing = $state(false);
  let count = $state(12);
  let svg: SVGSVGElement | undefined = $state();
  let hover: Analysis | null = $state(null);

  function toSvg(e: PointerEvent): [number, number] {
    const r = svg!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }
  function down(e: PointerEvent) { drawing = true; path = [toSvg(e)]; svg!.setPointerCapture(e.pointerId); }
  function move(e: PointerEvent) {
    if (!drawing) return;
    const p = toSvg(e), last = path[path.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 6) path = [...path, p];
  }
  function up() { drawing = false; }

  /** Evenly spaced samples along the drawn polyline. */
  function sample(pts: [number, number][], n: number): [number, number][] {
    if (pts.length < 2) return pts;
    const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    const out: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      let d = (k / Math.max(1, n - 1)) * total, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const f = seg[i] ? d / seg[i] : 0;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
    }
    return out;
  }

  const route = $derived.by((): Analysis[] => {
    if (path.length < 2 || !items.length) return [];
    const used = new Set<string>();
    const picks: Analysis[] = [];
    for (const [x, y] of sample(path, Math.min(count, items.length))) {
      let best: Analysis | null = null, bd = Infinity;
      for (const a of items) {
        if (used.has(a.track!.id)) continue;
        const d = Math.hypot(px(a.bpm!) - x, py(a.energy) - y);
        if (d < bd) { bd = d; best = a; }
      }
      if (best) { used.add(best.track!.id); picks.push(best); }
    }
    return picks;
  });
  const routeTracks = $derived(route.map((a) => a.track!) as Track[]);
  const routeTime = $derived(routeTracks.reduce((s, t) => s + (t.duration || 0), 0));

  function preset(kind: 'down' | 'up' | 'arc') {
    const n = 24;
    path = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const e = kind === 'down' ? 0.9 - 0.75 * t : kind === 'up' ? 0.15 + 0.75 * t : 0.25 + 0.6 * Math.sin(Math.PI * t);
      const b = kind === 'down' ? 150 - 70 * t : kind === 'up' ? 80 + 70 * t : 90 + 50 * Math.sin(Math.PI * t);
      return [px(b), py(e)] as [number, number];
    });
  }
</script>

<div class="page">
  <p class="eyebrow">{t('nav.discover')}</p>
  <h1 class="page-title">{t('nav.journey')}</h1>
  <p class="muted lead">{t('journey.lead')}</p>

  {#if loaded && items.length < 3}
    <div class="empty section">
      <Icon name="path" size={30} />
      <h3>{t('journey.emptyTitle')}</h3>
      <p>{t('journey.emptyHint')}</p>
      <a class="btn primary" href="#/library/files">{t('journey.goLibrary')}</a>
    </div>
  {:else if loaded}
    <div class="layout">
      <div class="map surface">
        <svg bind:this={svg} viewBox="0 0 {W} {H}" role="img" aria-label={t('journey.mapAria')}
          onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
          {#each [80, 100, 120, 140, 160] as b}<line x1={px(b)} x2={px(b)} y1={PAD} y2={H - PAD} class="grid" /><text x={px(b)} y={H - 12} class="axis" text-anchor="middle">{b}</text>{/each}
          {#each [0.25, 0.5, 0.75] as e}<line x1={PAD} x2={W - PAD} y1={py(e)} y2={py(e)} class="grid" />{/each}
          <text x={W - PAD} y={H - 12} class="axis strong" text-anchor="end">{t('journey.axisTempo')}</text>
          <text x={14} y={PAD} class="axis strong" transform="rotate(-90 14 {PAD})" text-anchor="end">{t('journey.axisEnergy')}</text>
          {#each items as a (a.track!.id)}
            <circle cx={px(a.bpm!)} cy={py(a.energy)} r={route.includes(a) ? 7 : 4.5} class="dot" class:picked={route.includes(a)} role="img" aria-label="{a.track!.title}, {a.bpm} BPM"
              onpointerenter={() => (hover = a)} onpointerleave={() => (hover = null)} />
          {/each}
          {#if path.length > 1}<polyline points={path.map((p) => p.join(',')).join(' ')} class="line" />{/if}
          {#if route.length > 1}<polyline points={route.map((a) => `${px(a.bpm!)},${py(a.energy)}`).join(' ')} class="route" />{/if}
          {#if hover}<text x={Math.min(W - 200, px(hover.bpm!) + 10)} y={py(hover.energy) - 10} class="tip">{hover.track!.title} · {hover.bpm} BPM</text>{/if}
        </svg>
        {#if path.length < 2}<p class="hint">{t('journey.draw')}</p>{/if}
      </div>

      <div class="side">
        <div class="row wrap presets">
          <button class="chip" onclick={() => preset('down')}>{t('journey.down')}</button>
          <button class="chip" onclick={() => preset('up')}>{t('journey.up')}</button>
          <button class="chip" onclick={() => preset('arc')}>{t('journey.arc')}</button>
          {#if path.length}<button class="chip" onclick={() => (path = [])}>{t('common.clear')}</button>{/if}
        </div>
        <label class="count">{t('journey.tracks')} <input type="range" min="4" max="40" bind:value={count} style:--fill="{((count - 4) / 36) * 100}%" /> <span class="num">{count}</span></label>
        {#if route.length}
          <div class="row"><span class="faint grow">{t('count.tracks', { count: route.length })}{#if routeTime} · {fmtDuration(routeTime)}{/if}</span>
            <button class="btn primary small" onclick={() => player.playList(routeTracks, 0)}><Icon name="play" size={14} /> {t('journey.play')}</button></div>
          <ol class="route-list">
            {#each route as a, i (a.track!.id)}
              <li><span class="num faint">{i + 1}</span><span class="ellipsis grow" dir="auto">{a.track!.title}<span class="faint"> · {a.track!.artist}</span></span><span class="tag num">{a.bpm}</span></li>
            {/each}
          </ol>
        {:else}
          <p class="faint">{t('journey.onMap', { count: items.length })}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .lead { max-width: 680px; margin: 6px 0 0; }
  .layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; margin-top: 24px; align-items: start; }
  .map { position: relative; padding: 8px; }
  svg { width: 100%; height: auto; touch-action: none; cursor: crosshair; display: block; direction: ltr; }
  .grid { stroke: var(--line-soft); }
  .axis { font-size: 11px; fill: var(--text-3); }
  .axis.strong { fill: var(--text-2); }
  .dot { fill: var(--text-3); transition: r 0.2s; }
  .dot.picked { fill: var(--accent); }
  .line { fill: none; stroke: var(--text); stroke-opacity: 0.3; stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; }
  .route { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 4 4; }
  .tip { font-size: 12px; fill: var(--text); paint-order: stroke; stroke: var(--bg); stroke-width: 4px; }
  .hint { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: var(--text-3); pointer-events: none; font-size: 15px; }
  .presets { gap: 6px; margin-bottom: 14px; }
  .count { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 13px; color: var(--text-2); }
  .count input { flex: 1; }
  .route-list { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 2px; max-height: 360px; overflow: auto; font-size: 13px; }
  .route-list li { display: flex; gap: 10px; align-items: center; padding: 6px 4px; }
  @media (max-width: 1000px) { .layout { grid-template-columns: 1fr; } }
</style>
