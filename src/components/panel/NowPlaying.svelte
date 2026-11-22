<script lang="ts">
  import { player } from '../../lib/stores/player.svelte';
  import { allAnalyses } from '../../lib/audio/analysis';
  import { camelotCompatible } from '../../lib/audio/analysis-core';
  import { SOURCES } from '../../lib/sources';
  import type { Analysis } from '../../lib/types';
  import Artwork from '../Artwork.svelte';
  import Icon from '../Icon.svelte';

  const t = $derived(player.current);
  const a = $derived(player.analysis);

  // Harmonic suggestions: analysed tracks in a compatible key and within ±6% tempo.
  let pool: Analysis[] = $state([]);
  $effect(() => { void a; allAnalyses().then((x) => (pool = x)); });
  const harmonic = $derived.by(() => {
    if (!a?.camelot || !t) return [];
    return pool
      .filter((x) => x.track && x.track.id !== t.id && x.camelot && camelotCompatible(a.camelot!, x.camelot)
        && (!a.bpm || !x.bpm || Math.abs(x.bpm - a.bpm) / a.bpm <= 0.06))
      .slice(0, 5);
  });
</script>

{#if t}
  <div class="now">
    <div class="cover"><Artwork src={t.artwork} seed={t.artist + t.title} radius="var(--radius)" alt="" /></div>
    <h2 class="display title">{t.title}</h2>
    <p class="artist">{t.artist}{#if t.album}<span class="faint"> · {t.album}</span>{/if}</p>

    <div class="credits surface">
      <div class="row">
        <span class="dot" style:background={SOURCES[t.source].color}></span>
        <span class="grow">From <strong>{SOURCES[t.source].name}</strong></span>
        {#if t.pageUrl}<a class="btn small ghost" href={t.pageUrl} target="_blank" rel="noopener">Source <Icon name="external" size={14} /></a>{/if}
      </div>
      {#if t.license}
        <div class="lic">
          {#if t.license.url}<a href={t.license.url} target="_blank" rel="noopener">{t.license.name}</a>{:else}{t.license.name}{/if}
          {#if t.license.name.startsWith('CC')}<span class="faint"> · credit: {t.artist}</span>{/if}
        </div>
      {/if}
    </div>

    <section class="sound">
      <div class="section-head"><h3 class="eyebrow">Sound profile</h3>
        {#if !a && !t.isLive}
          <button class="btn small" onclick={() => player.analyse()} disabled={player.analysing}>
            {#if player.analysing}Analysing…{:else}<Icon name="sparkle" size={15} /> Analyse{/if}
          </button>
        {/if}
      </div>
      {#if a}
        <div class="stats">
          <div><span class="k">Tempo</span><span class="v num">{a.bpm ?? '—'}<small> BPM</small></span></div>
          <div><span class="k">Key</span><span class="v">{a.key ?? '—'}</span><small class="faint">{a.camelot ?? ''}</small></div>
          <div><span class="k">Loudness</span><span class="v num">{a.lufs}<small> LUFS</small></span></div>
          <div><span class="k">Energy</span><span class="v num">{Math.round(a.energy * 100)}<small>%</small></span>
            <span class="meter"><i style:width="{a.energy * 100}%"></i></span></div>
        </div>
        {#if player.normDb !== 0}<p class="faint note">Loudness matched: {player.normDb > 0 ? '+' : ''}{player.normDb.toFixed(1)} dB</p>{/if}
      {:else if player.analysisError}
        <p class="faint note">{player.analysisError}</p>
      {:else if t.isLive}
        <p class="faint note">Live stream: tempo and key aren't available.</p>
      {:else}
        <p class="faint note">Analysing finds the tempo, musical key and loudness, draws the waveform, and marks the loudest section. It runs on this device; nothing is uploaded.</p>
      {/if}
    </section>

    {#if harmonic.length}
      <section>
        <h3 class="eyebrow">Mixes well next</h3>
        <ul class="harm">
          {#each harmonic as h (h.track!.id)}
            <li>
              <button onclick={() => player.playNext(h.track!)}>
                <span class="ellipsis grow">{h.track!.title}<span class="faint"> · {h.track!.artist}</span></span>
                <span class="tag">{h.camelot}</span><span class="tag num">{h.bpm}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{:else}
  <div class="empty">
    <h3>Nothing playing</h3>
    <p>Start a track and its artwork, credits and sound profile appear here.</p>
  </div>
{/if}

<style>
  .now { display: grid; gap: 14px; }
  .cover { width: 100%; box-shadow: 0 30px 60px -20px oklch(10% 0.05 var(--h) / 0.9); border-radius: var(--radius); }
  .title { font-size: 26px; line-height: 1.1; margin: 6px 0 0; }
  .artist { margin: 0; color: var(--text-2); font-size: 15px; }
  .credits { padding: 12px 14px; display: grid; gap: 6px; font-size: 13px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .lic { color: var(--text-2); }
  .lic a { color: var(--accent); }
  .section-head { margin-bottom: 8px; }
  h3.eyebrow { margin: 0 0 8px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stats > div { display: grid; gap: 2px; padding: 10px 12px; background: var(--bg-raise); border-radius: 10px; }
  .k { font-size: 11.5px; color: var(--text-3); }
  .v { font-size: 18px; font-weight: 600; }
  .v small { font-size: 11px; color: var(--text-3); font-weight: 500; }
  .meter { height: 4px; background: var(--line); border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .meter i { display: block; height: 100%; background: var(--accent); }
  .note { font-size: 12.5px; margin: 8px 0 0; }
  .harm { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .harm button { width: 100%; display: flex; align-items: center; gap: 6px; text-align: left; padding: 8px 10px; border-radius: 8px; font-size: 13px; }
  .harm button:hover { background: var(--bg-raise); }
</style>
