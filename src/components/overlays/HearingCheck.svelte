<script lang="ts">
  // A quick hearing check: finds the quietest level you hear at 7 frequencies, then gives
  // a gentle boost where your hearing is weaker relative to your own average. It's a
  // listening preference, not a medical test.
  import { EQ_FREQS, engine } from '../../lib/audio/engine';
  import { player } from '../../lib/stores/player.svelte';
  import { settings } from '../../lib/stores/settings.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import Icon from '../Icon.svelte';

  const TEST = [250, 500, 1000, 2000, 4000, 8000, 12000];
  const START = -30, STEP = 6, FLOOR = -90;

  let step: 'intro' | 'test' | 'done' = $state('intro');
  let fi = $state(0);
  let level = $state(START);
  let heardAt: number[] = $state([]);
  let result: number[] = $state([]);

  function playTone() { engine.tone(TEST[fi], level, 1.1); }

  function begin() {
    engine.pause();
    step = 'test'; fi = 0; level = START; heardAt = [];
    setTimeout(playTone, 300);
  }

  function answer(heard: boolean) {
    if (heard && level - STEP >= FLOOR) { level -= STEP; setTimeout(playTone, 350); return; }
    heardAt.push(heard ? level : level + STEP); // last level that was heard
    if (fi + 1 < TEST.length) { fi++; level = START; setTimeout(playTone, 500); }
    else finish();
  }

  function finish() {
    const sorted = [...heardAt].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // threshold above your median → boost half the difference, max +8 dB
    const boostAt = (f: number) => {
      const i = TEST.findIndex((t) => t >= f);
      const thr = i === -1 ? heardAt[heardAt.length - 1] : i === 0 ? heardAt[0] : heardAt[i];
      return Math.min(8, Math.max(0, (thr - median) * 0.5));
    };
    result = EQ_FREQS.map((f) => Math.round(boostAt(f) * 2) / 2);
    step = 'done';
  }

  function apply() { settings.hearingEq = result; player.applyEq(); ui.hearingOpen = false; ui.toast('Hearing profile applied'); }
</script>

<div class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) ui.hearingOpen = false; }}>
  <div class="dialog surface" role="dialog" aria-modal="true" aria-label="Hearing check">
    <button class="icon-btn close" aria-label="Close" onclick={() => (ui.hearingOpen = false)}><Icon name="close" size={16} /></button>
    {#if step === 'intro'}
      <Icon name="ear" size={34} />
      <h2 class="display">Tune the sound to your ears</h2>
      <p class="muted">Put on the headphones you usually use and find a quiet spot. You'll hear short tones that get quieter. Tell us whether you can still hear each one. It takes about two minutes.</p>
      <p class="faint small">This sets a listening preference. It is not a medical hearing test.</p>
      <button class="btn primary" onclick={begin}>Start</button>
    {:else if step === 'test'}
      <p class="eyebrow">Tone {fi + 1} of {TEST.length} · {TEST[fi] >= 1000 ? TEST[fi] / 1000 + ' kHz' : TEST[fi] + ' Hz'}</p>
      <div class="progress"><i style:width="{(fi / TEST.length) * 100}%"></i></div>
      <h2 class="display">Can you hear the tone?</h2>
      <div class="row center">
        <button class="btn" onclick={() => answer(false)}>No</button>
        <button class="btn primary" onclick={() => answer(true)}>Yes, I hear it</button>
      </div>
      <button class="btn ghost small" onclick={playTone}>Play again</button>
    {:else}
      <h2 class="display">Your profile</h2>
      <div class="bars">
        {#each result as g, i}
          <div class="b"><span class="num">{g ? '+' + g : '0'}</span><i style:height="{8 + g * 10}px"></i><small class="num">{EQ_FREQS[i] >= 1000 ? EQ_FREQS[i] / 1000 + 'k' : EQ_FREQS[i]}</small></div>
        {/each}
      </div>
      <p class="muted small">{result.some((g) => g > 0) ? 'Gentle boosts where your hearing was weaker than your own average. Your EQ presets still work on top.' : 'Your hearing was even across the range, so no compensation is needed.'}</p>
      <div class="row center">
        <button class="btn" onclick={begin}>Redo</button>
        <button class="btn primary" onclick={apply} disabled={!result.some((g) => g > 0)}>Apply</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 60; background: rgb(0 0 0 / 0.6); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 16px; }
  .dialog { position: relative; width: min(480px, 100%); padding: 30px 28px; display: grid; gap: 14px; justify-items: center; text-align: center; box-shadow: 0 40px 100px rgb(0 0 0 / 0.6); }
  .close { position: absolute; top: 10px; right: 10px; }
  h2 { margin: 0; font-size: 26px; }
  p { margin: 0; }
  .small { font-size: 12.5px; }
  .center { justify-content: center; }
  .progress { width: 100%; height: 4px; background: var(--line); border-radius: 3px; overflow: hidden; }
  .progress i { display: block; height: 100%; background: var(--accent); transition: width 0.3s; }
  .bars { display: flex; gap: 8px; align-items: flex-end; height: 120px; }
  .b { display: grid; justify-items: center; gap: 4px; font-size: 11px; color: var(--text-2); }
  .b i { width: 18px; background: var(--accent); border-radius: 4px; }
</style>
