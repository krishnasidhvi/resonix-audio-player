<script lang="ts">
  import { focusScope } from '../../lib/a11y';
  import { t } from '../../lib/i18n/i18n.svelte';
  import { player } from '../../lib/stores/player.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmtTime } from '../../lib/util';
  import Icon from '../Icon.svelte';

  const rates = [0.5, 0.6, 0.75, 0.85, 0.9, 1, 1.1, 1.25, 1.5];
</script>

<div class="sheet surface" role="dialog" aria-label={t('cmd.practice')} use:focusScope={{ onClose: () => (ui.practiceOpen = false) }}>
  <div class="row head">
    <h2>{t('practice.title')}</h2>
    <span class="faint small grow">{t('practice.hint')}</span>
    <button class="icon-btn" aria-label={t('common.close')} onclick={() => (ui.practiceOpen = false)}><Icon name="close" size={16} /></button>
  </div>
  <div>
    <p class="eyebrow">{t('practice.tempo', { pct: Math.round(player.rate * 100) })}{#if player.analysis?.bpm} {t('practice.approxBpm', { bpm: Math.round(player.analysis.bpm * player.rate) })}{/if}</p>
    <div class="row wrap rates" dir="ltr">
      {#each rates as r}<button class="chip num" class:active={player.rate === r} onclick={() => player.setRate(r)}>{r}×</button>{/each}
    </div>
  </div>
  <div>
    <p class="eyebrow">{t('practice.loop')}</p>
    <div class="row wrap">
      <button class="btn small" onclick={() => player.setLoopPoint('a')} disabled={!player.current || player.current.isLive}>{t('practice.setA')}{#if player.loopA !== null} · {fmtTime(player.loopA)}{/if}</button>
      <button class="btn small" onclick={() => player.setLoopPoint('b')} disabled={player.loopA === null}>{t('practice.setB')}{#if player.loopB !== null} · {fmtTime(player.loopB)}{/if}</button>
      {#if player.loopA !== null}<button class="btn small ghost" onclick={() => player.clearLoop()}>{t('practice.clear')}</button>{/if}
    </div>
    <p class="faint small">{t('practice.keys')}</p>
  </div>
</div>

<style>
  .sheet { position: fixed; inset-inline-end: 16px; bottom: calc(var(--bar) + 12px); z-index: 45; width: min(460px, calc(100vw - 32px)); padding: 18px 20px; box-shadow: 0 30px 80px rgb(0 0 0 / 0.6); display: grid; gap: 16px; }
  .head h2 { margin: 0; margin-inline-end: 8px; font-size: 18px; }
  .small { font-size: 12.5px; }
  .eyebrow { margin: 0 0 8px; }
  .rates { gap: 6px; }
</style>
