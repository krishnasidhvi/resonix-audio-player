<script lang="ts">
  import { engine } from '../../lib/audio/engine';
  import { player } from '../../lib/stores/player.svelte';
  import { settings } from '../../lib/stores/settings.svelte';
  import { SOURCES } from '../../lib/sources';
  import Visualizer from '../Visualizer.svelte';

  const t = $derived(player.current);
  const bypass = $derived(player.bypassed);
  const rate = $derived(player.playing ? engine.ctx?.sampleRate : engine.ctx?.sampleRate);
  const eqActive = $derived(settings.eqEnabled && (settings.eq.some((g) => g !== 0) || !!settings.hearingEq));

  interface Stage { name: string; detail: string; state: 'on' | 'off' | 'warn' }
  const stages = $derived.by((): Stage[] => {
    if (!t) return [];
    const s: Stage[] = [
      { name: 'Source', detail: `${SOURCES[t.source].name}${t.format ? ' · ' + t.format : ''}${t.bitrate ? ' · ' + Math.round(t.bitrate > 5000 ? t.bitrate / 1000 : t.bitrate) + ' kbps' : ''}`, state: 'on' },
      { name: 'Decode', detail: 'Browser decoder', state: 'on' },
    ];
    if (bypass) {
      s.push({ name: 'Processing bypassed', detail: "This host doesn't allow browser audio processing (no CORS), so EQ, loudness matching, crossfeed and the visualizer are off for this stream. It plays untouched.", state: 'warn' });
    } else {
      s.push(
        { name: 'Mix rate', detail: rate ? `${rate.toLocaleString()} Hz. The browser resamples everything to the device rate.` : 'Starts with playback', state: 'on' },
        { name: 'Loudness match', detail: !settings.normalize ? 'Off' : player.analysis ? `${player.normDb > 0 ? '+' : ''}${player.normDb.toFixed(1)} dB → ${settings.normTarget} LUFS` : 'Waiting for analysis', state: settings.normalize && player.analysis ? 'on' : 'off' },
        { name: 'Equaliser', detail: eqActive ? `${settings.eqPreset}${settings.hearingEq ? ' + hearing profile' : ''}` : 'Flat / off', state: eqActive ? 'on' : 'off' },
        { name: 'Crossfeed', detail: settings.crossfeed > 0 ? `${Math.round(settings.crossfeed * 100)}%` : 'Off', state: settings.crossfeed > 0 ? 'on' : 'off' },
      );
    }
    if (player.rate !== 1) s.push({ name: 'Tempo', detail: `${Math.round(player.rate * 100)}%, pitch kept`, state: 'on' });
    s.push({ name: 'Volume', detail: `${Math.round(settings.volume * 100)}%`, state: 'on' });
    s.push({ name: 'Output', detail: 'System audio device', state: 'on' });
    return s;
  });
</script>

{#if !t}
  <div class="empty"><h3>No signal</h3><p>Play something to see every stage your audio passes through.</p></div>
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
    <p class="faint note">Everything shown here is measured or set in this app. Browsers can't do bit-perfect or exclusive-mode output, so the desktop app is where that belongs.</p>
  </div>
{/if}

<style>
  .viz { padding: 10px; margin-bottom: 18px; }
  .chain { list-style: none; margin: 0; padding: 0; }
  li { position: relative; display: flex; gap: 14px; padding: 0 0 16px; }
  li:not(:last-child)::before { content: ''; position: absolute; left: 5px; top: 14px; bottom: 0; width: 2px; background: var(--line); }
  .node { flex: none; width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; border: 2px solid var(--line); background: var(--bg); position: relative; z-index: 1; }
  li.on .node { border-color: var(--accent); background: var(--accent); }
  li.warn .node { border-color: var(--danger); background: var(--danger); }
  li.off strong { color: var(--text-3); }
  strong { font-weight: 600; font-size: 13.5px; }
  p { margin: 2px 0 0; color: var(--text-2); font-size: 12.5px; }
  li.warn p { color: var(--text); }
  .note { font-size: 12px; }
</style>
