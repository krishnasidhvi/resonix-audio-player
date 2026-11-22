<script lang="ts">
  import { i18n, t as tt } from '../../lib/i18n/i18n.svelte';
  import { eqPresetLabel, sourceName } from '../../lib/i18n/labels';
  import { engine } from '../../lib/audio/engine';
  import { player } from '../../lib/stores/player.svelte';
  import { settings } from '../../lib/stores/settings.svelte';
  import Visualizer from '../Visualizer.svelte';

  const t = $derived(player.current);
  const bypass = $derived(player.bypassed);
  // re-read when playback state changes; the AudioContext is created on first play
  const rate = $derived((void player.playing, engine.ctx?.sampleRate));
  const eqActive = $derived(settings.eqEnabled && (settings.eq.some((g) => g !== 0) || !!settings.hearingEq));

  interface Stage { name: string; detail: string; state: 'on' | 'off' | 'warn' }
  const stages = $derived.by((): Stage[] => {
    if (!t) return [];
    const s: Stage[] = [
      { name: tt('signal.source'), detail: `${sourceName(t.source)}${t.format ? ' · ' + t.format : ''}${t.bitrate ? ' · ' + Math.round(t.bitrate > 5000 ? t.bitrate / 1000 : t.bitrate) + ' kbps' : ''}`, state: 'on' },
      { name: tt('signal.decode'), detail: tt('signal.decoder'), state: 'on' },
    ];
    if (bypass) {
      s.push({ name: tt('signal.bypassed'), detail: tt('signal.bypassedDetail'), state: 'warn' });
    } else {
      s.push(
        { name: tt('signal.mixRate'), detail: rate ? tt('signal.mixRateDetail', { rate: rate.toLocaleString(i18n.locale) }) : tt('signal.startsWithPlayback'), state: 'on' },
        { name: tt('signal.loudness'), detail: !settings.normalize ? tt('common.off') : player.analysis ? `${player.normDb > 0 ? '+' : ''}${player.normDb.toFixed(1)} dB → ${settings.normTarget} LUFS` : tt('signal.waiting'), state: settings.normalize && player.analysis ? 'on' : 'off' },
        { name: tt('signal.eq'), detail: eqActive ? (settings.hearingEq ? tt('signal.plusHearing', { preset: eqPresetLabel(settings.eqPreset) }) : eqPresetLabel(settings.eqPreset)) : tt('signal.flat'), state: eqActive ? 'on' : 'off' },
        { name: tt('signal.crossfeed'), detail: settings.crossfeed > 0 ? `${Math.round(settings.crossfeed * 100)}%` : tt('common.off'), state: settings.crossfeed > 0 ? 'on' : 'off' },
      );
    }
    if (player.rate !== 1) s.push({ name: tt('signal.tempo'), detail: tt('signal.tempoDetail', { pct: Math.round(player.rate * 100) }), state: 'on' });
    s.push({ name: tt('signal.volume'), detail: `${Math.round(settings.volume * 100)}%`, state: 'on' });
    s.push({ name: tt('signal.output'), detail: tt('signal.outputDetail'), state: 'on' });
    return s;
  });
</script>

{#if !t}
  <div class="empty"><h3>{tt('signal.empty')}</h3><p>{tt('signal.emptyHint')}</p></div>
{:else}
  <div class="sig">
    {#if !bypass}<div class="viz surface"><Visualizer bands={48} height={72} /></div>{/if}
    <ol class="chain">
      {#each stages as s}
        <li class={s.state}>
          <span class="node"></span>
          <div><strong>{s.name}</strong><p>{s.detail}</p></div>
        </li>
      {/each}
    </ol>
    <p class="faint note">{tt('signal.note')}</p>
  </div>
{/if}

<style>
  .viz { padding: 10px; margin-bottom: 18px; }
  .chain { list-style: none; margin: 0; padding: 0; }
  li { position: relative; display: flex; gap: 14px; padding: 0 0 16px; }
  li:not(:last-child)::before { content: ''; position: absolute; inset-inline-start: 5px; top: 14px; bottom: 0; width: 2px; background: var(--line); }
  .node { flex: none; width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; border: 2px solid var(--line); background: var(--bg); position: relative; z-index: 1; }
  li.on .node { border-color: var(--accent); background: var(--accent); }
  li.warn .node { border-color: var(--danger); background: var(--danger); }
  li.off strong { color: var(--text-3); }
  strong { font-weight: 600; font-size: 13.5px; }
  p { margin: 2px 0 0; color: var(--text-2); font-size: 12.5px; }
  li.warn p { color: var(--text); }
  .note { font-size: 12px; }
</style>
