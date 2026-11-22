<script lang="ts">
  import Similar from './Similar.svelte';
  import { canLinkOut, spotifyUrl, youtubeMusicUrl } from '../../lib/external';
  import { t as tt } from '../../lib/i18n/i18n.svelte';
  import { keyLabel, licenceLabel, sourceName } from '../../lib/i18n/labels';
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
  $effect(() => { if (!a?.camelot) return; allAnalyses().then((x) => (pool = x)).catch(() => {}); });
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
    <h2 class="display title" dir="auto">{t.title}</h2>
    <p class="artist" dir="auto">{t.artist}{#if t.album}<span class="faint"> · {t.album}</span>{/if}</p>

    <div class="credits surface">
      <div class="row">
        <span class="dot" style:background={SOURCES[t.source].color}></span>
        <span class="grow">{tt('now.from', { source: sourceName(t.source) })}</span>
        {#if t.pageUrl}<a class="btn small ghost" href={t.pageUrl} target="_blank" rel="noopener">{tt('now.source')} <Icon name="external" size={14} /></a>{/if}
      </div>
      {#if t.license}
        <div class="lic">
          {#if t.license.url}<a href={t.license.url} target="_blank" rel="noopener">{licenceLabel(t.license)}</a>{:else}{licenceLabel(t.license)}{/if}
          {#if t.license.name.startsWith('CC')}<span class="faint"> · {tt('now.credit', { artist: t.artist })}</span>{/if}
        </div>
      {/if}
      {#if canLinkOut(t)}
        <div class="out row wrap">
          <a href={youtubeMusicUrl(t)} target="_blank" rel="noopener">{tt('track.openYouTubeMusic')} <Icon name="external" size={12} /></a>
          <a href={spotifyUrl(t)} target="_blank" rel="noopener">{tt('track.openSpotify')} <Icon name="external" size={12} /></a>
        </div>
      {/if}
    </div>

    <section class="sound">
      <div class="section-head"><h3 class="eyebrow">{tt('now.soundProfile')}</h3>
        {#if !a && !t.isLive && t.source !== 'youtube'}
          <button class="btn small" onclick={() => player.analyse()} disabled={player.analysing}>
            {#if player.analysing}{tt('now.analysing')}{:else}<Icon name="sparkle" size={15} /> {tt('now.analyse')}{/if}
          </button>
        {/if}
      </div>
      {#if a}
        <div class="stats">
          <div><span class="k">{tt('now.tempo')}</span><span class="v num">{a.bpm ?? '—'}<small> BPM</small></span></div>
          <div><span class="k">{tt('now.key')}</span><span class="v">{keyLabel(a.key)}</span><small class="faint">{a.camelot ?? ''}</small></div>
          <div><span class="k">{tt('now.loudness')}</span><span class="v num">{a.lufs}<small> LUFS</small></span></div>
          <div><span class="k">{tt('now.energy')}</span><span class="v num">{Math.round(a.energy * 100)}<small>%</small></span>
            <span class="meter"><i style:width="{a.energy * 100}%"></i></span></div>
        </div>
        {#if player.normDb !== 0}<p class="faint note">{tt('now.matched', { db: (player.normDb > 0 ? '+' : '') + player.normDb.toFixed(1) })}</p>{/if}
      {:else if player.analysisError}
        <p class="faint note">{player.analysisError}</p>
      {:else if t.isLive}
        <p class="faint note">{tt('now.liveNoAnalysis')}</p>
      {:else}
        <p class="faint note">{tt('now.analyseHint')}</p>
      {/if}
    </section>

    {#if harmonic.length}
      <section>
        <h3 class="eyebrow">{tt('now.mixesWell')}</h3>
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
    <Similar />
  </div>
{:else}
  <div class="empty">
    <h3>{tt('now.nothing')}</h3>
    <p>{tt('now.nothingHint')}</p>
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
  .out { gap: 14px; padding-top: 4px; border-top: 1px solid var(--line-soft); margin-top: 2px; }
  .out a { color: var(--text-2); text-decoration: none; font-size: 12.5px; display: inline-flex; gap: 4px; align-items: center; }
  .out a:hover { color: var(--text); }
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
  .harm button { width: 100%; display: flex; align-items: center; gap: 6px; text-align: start; padding: 8px 10px; border-radius: 8px; font-size: 13px; }
  .harm button:hover { background: var(--bg-raise); }
</style>
