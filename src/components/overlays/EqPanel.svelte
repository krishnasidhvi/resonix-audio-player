<script lang="ts">
  import { t } from '../../lib/i18n/i18n.svelte';
  import { eqPresetLabel } from '../../lib/i18n/labels';
  import { EQ_FREQS } from '../../lib/audio/engine';
  import { player } from '../../lib/stores/player.svelte';
  import { EQ_PRESETS, effectiveEq, settings } from '../../lib/stores/settings.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import Icon from '../Icon.svelte';

  const W = 560, H = 150, MIN = 20, MAX = 20000, RANGE = 12;
  const x = (f: number) => (Math.log10(f / MIN) / Math.log10(MAX / MIN)) * W;
  const y = (db: number) => H / 2 - (db / RANGE) * (H / 2 - 8);

  /** Magnitude response (dB) of the 10 RBJ biquads, same shapes the engine uses. */
  function response(gains: number[]): string {
    const fs = 48000;
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const f = MIN * (MAX / MIN) ** (i / 160);
      const w = (2 * Math.PI * f) / fs;
      let total = 0;
      EQ_FREQS.forEach((f0, k) => {
        const A = 10 ** (gains[k] / 40), w0 = (2 * Math.PI * f0) / fs, alpha = Math.sin(w0) / (2 * 1.1), c = Math.cos(w0);
        let b0, b1, b2, a0, a1, a2;
        if (k === 0 || k === EQ_FREQS.length - 1) {
          // Web Audio shelves ignore Q and use slope S = 1 → alpha = sin(w0)/2 · √2
          const sq = 2 * Math.sqrt(A) * (Math.sin(w0) / 2) * Math.SQRT2, s = k === 0 ? 1 : -1;
          // low shelf (s=1) / high shelf (s=-1)
          b0 = A * ((A + 1) - s * (A - 1) * c + sq); b1 = s * 2 * A * ((A - 1) - s * (A + 1) * c); b2 = A * ((A + 1) - s * (A - 1) * c - sq);
          a0 = (A + 1) + s * (A - 1) * c + sq; a1 = -s * 2 * ((A - 1) + s * (A + 1) * c); a2 = (A + 1) + s * (A - 1) * c - sq;
        } else {
          b0 = 1 + alpha * A; b1 = -2 * c; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * c; a2 = 1 - alpha / A;
        }
        const re = (b: number[]) => b[0] + b[1] * Math.cos(w) + b[2] * Math.cos(2 * w);
        const im = (b: number[]) => -(b[1] * Math.sin(w) + b[2] * Math.sin(2 * w));
        const num = Math.hypot(re([b0, b1, b2]), im([b0, b1, b2])), den = Math.hypot(re([a0, a1, a2]), im([a0, a1, a2]));
        total += 20 * Math.log10(num / den);
      });
      pts.push(`${x(f).toFixed(1)},${y(Math.max(-RANGE, Math.min(RANGE, total))).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  const curve = $derived(response(effectiveEq()));

  function set(i: number, v: number) { settings.eq[i] = v; settings.eqPreset = 'Custom'; player.applyEq(); }
  function preset(name: string) { settings.eq = EQ_PRESETS[name].slice(); settings.eqPreset = name; player.applyEq(); }
  const label = (f: number) => (f >= 1000 ? `${f / 1000}k` : `${f}`);
</script>

<div class="sheet surface" role="dialog" aria-label={t('player.sound')}>
  <div class="row head">
    <h2>{t('eq.title')}</h2>
    <label class="switch"><input type="checkbox" bind:checked={settings.eqEnabled} onchange={() => player.applyEq()} /> {t('eq.on')}</label>
    <span class="grow"></span>
    <button class="btn small" onclick={() => { ui.hearingOpen = true; ui.eqOpen = false; }}><Icon name="ear" size={15} /> {t('eq.hearingCheck')}</button>
    <button class="icon-btn" aria-label={t('common.close')} onclick={() => (ui.eqOpen = false)}><Icon name="close" size={16} /></button>
  </div>
  {#if player.bypassed}<p class="warn">{t('eq.bypassWarn')}</p>{/if}

  <div class="presets row wrap">
    {#each Object.keys(EQ_PRESETS) as p}<button class="chip" class:active={settings.eqPreset === p} onclick={() => preset(p)}>{eqPresetLabel(p)}</button>{/each}
    {#if settings.eqPreset === 'Custom'}<span class="chip active">{eqPresetLabel('Custom')}</span>{/if}
  </div>

  <svg viewBox="0 0 {W} {H}" class="curve" style="direction: ltr" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" x2={W} y1={y(0)} y2={y(0)} class="zero" />
    {#each [100, 1000, 10000] as f}<line x1={x(f)} x2={x(f)} y1="0" y2={H} class="grid" />{/each}
    <polyline points="0,{H} {curve} {W},{H}" class="fill" />
    <polyline points={curve} class="line" />
  </svg>

  <div class="bands" dir="ltr">
    {#each EQ_FREQS as f, i}
      <div class="band">
        <span class="db num">{settings.eq[i] > 0 ? '+' : ''}{settings.eq[i].toFixed(1)}</span>
        <input type="range" min="-12" max="12" step="0.5" value={settings.eq[i]} aria-label={t('eq.bandGain', { freq: label(f) })} oninput={(e) => set(i, +e.currentTarget.value)} ondblclick={() => set(i, 0)} />
        <span class="f num">{label(f)}</span>
      </div>
    {/each}
  </div>
  {#if settings.hearingEq}<p class="faint small">{t('eq.hearingNote')} <button class="link" onclick={() => { settings.hearingEq = null; player.applyEq(); }}>{t('eq.removeIt')}</button></p>{/if}

  <div class="extras">
    <label>
      <span>{t('eq.crossfeed')} <small class="faint">{t('eq.crossfeedHint')}</small></span>
      <input type="range" min="0" max="1" step="0.05" bind:value={settings.crossfeed} style:--fill="{settings.crossfeed * 100}%" oninput={() => player.applyCrossfeed()} />
    </label>
    <label>
      <span>{t('eq.crossfade')} <small class="faint">{settings.crossfade ? t('eq.seconds', { count: settings.crossfade }) : t('eq.crossfadeOff')}</small></span>
      <input type="range" min="0" max="12" step="1" bind:value={settings.crossfade} style:--fill="{(settings.crossfade / 12) * 100}%" />
    </label>
    <label class="switch"><input type="checkbox" bind:checked={settings.normalize} onchange={() => player.applyNormalization()} /> {t('eq.matchLoudness', { target: settings.normTarget })}</label>
  </div>
</div>

<style>
  .sheet { position: fixed; inset-inline-end: 16px; bottom: calc(var(--bar) + 12px); z-index: 45; width: min(620px, calc(100vw - 32px)); padding: 18px 20px; box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); display: grid; gap: 14px; max-height: calc(100vh - var(--bar) - 40px); overflow: auto; }
  .head h2 { margin: 0; margin-inline-end: 12px; font-size: 18px; }
  .switch { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); cursor: pointer; }
  .switch input { accent-color: var(--accent); width: 16px; height: 16px; }
  .warn { margin: 0; font-size: 12.5px; color: var(--danger); }
  .presets { gap: 6px; }
  .curve { width: 100%; height: 130px; background: var(--bg-sunk); border-radius: 10px; }
  .zero { stroke: var(--line); stroke-dasharray: 3 4; }
  .grid { stroke: var(--line-soft); }
  .fill { fill: var(--accent-wash); stroke: none; }
  .line { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }
  .bands { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
  .band { display: grid; justify-items: center; gap: 6px; }
  .band input { writing-mode: vertical-lr; direction: rtl; width: 18px; height: 120px; }
  .band input::-webkit-slider-runnable-track { width: 4px; height: auto; background: var(--line); }
  .band input::-webkit-slider-thumb { margin-top: 0; margin-left: -4.5px; }
  .db { font-size: 11px; color: var(--text-2); }
  .f { font-size: 11px; color: var(--text-3); }
  .extras { display: grid; gap: 12px; border-top: 1px solid var(--line-soft); padding-top: 14px; }
  .extras label:not(.switch) { display: grid; gap: 4px; font-size: 13px; }
  .small { font-size: 12px; margin: 0; }
  .link { color: var(--accent); text-decoration: underline; }
</style>
