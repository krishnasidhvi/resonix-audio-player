<script lang="ts">
  import { player } from '../../lib/stores/player.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmtTime } from '../../lib/util';
  import Icon from '../Icon.svelte';

  const rates = [0.5, 0.6, 0.75, 0.85, 0.9, 1, 1.1, 1.25, 1.5];
</script>

<div class="sheet surface" role="dialog" aria-label="Practice mode">
  <div class="row head">
    <h2>Practice</h2>
    <span class="faint small grow">Slow a passage down without changing its pitch, then loop it.</span>
    <button class="icon-btn" aria-label="Close" onclick={() => (ui.practiceOpen = false)}><Icon name="close" size={16} /></button>
  </div>
  <div>
    <p class="eyebrow">Tempo · {Math.round(player.rate * 100)}%{#if player.analysis?.bpm} ≈ {Math.round(player.analysis.bpm * player.rate)} BPM{/if}</p>
    <div class="row wrap rates">
      {#each rates as r}<button class="chip num" class:active={player.rate === r} onclick={() => player.setRate(r)}>{r}×</button>{/each}
    </div>
  </div>
  <div>
    <p class="eyebrow">A–B loop</p>
    <div class="row wrap">
      <button class="btn small" onclick={() => player.setLoopPoint('a')} disabled={!player.current || player.current.isLive}>Set A{#if player.loopA !== null} · {fmtTime(player.loopA)}{/if}</button>
      <button class="btn small" onclick={() => player.setLoopPoint('b')} disabled={player.loopA === null}>Set B{#if player.loopB !== null} · {fmtTime(player.loopB)}{/if}</button>
      {#if player.loopA !== null}<button class="btn small ghost" onclick={() => player.clearLoop()}>Clear loop</button>{/if}
    </div>
    <p class="faint small">Press <kbd>[</kbd> and <kbd>]</kbd> to set A and B while listening. The loop shows on the waveform.</p>
  </div>
</div>

<style>
  .sheet { position: fixed; right: 16px; bottom: calc(var(--bar) + 12px); z-index: 45; width: min(460px, calc(100vw - 32px)); padding: 18px 20px; box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); display: grid; gap: 16px; }
  .head h2 { margin: 0 8px 0 0; font-size: 18px; }
  .small { font-size: 12.5px; }
  .eyebrow { margin: 0 0 8px; }
  .rates { gap: 6px; }
  kbd { font: 11px var(--font-ui); padding: 1px 5px; border: 1px solid var(--line); border-radius: 4px; }
</style>
