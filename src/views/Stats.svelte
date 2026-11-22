<script lang="ts">
  import { db } from '../lib/db';
  import type { PlayEvent } from '../lib/stores/player.svelte';
  import type { SourceId } from '../lib/types';
  import { fmtDuration, fmtHour, t, weekdays, type Key } from '../lib/i18n/i18n.svelte';
  import { sourceName } from '../lib/i18n/labels';

  let plays: PlayEvent[] = $state([]);
  let loaded = $state(false);
  let range: 7 | 30 | 365 | 0 = $state(30);
  db.all<PlayEvent>('plays').then((p) => { plays = p; }).catch(() => {}).finally(() => (loaded = true));

  const inRange = $derived(range ? plays.filter((p) => p.at >= Date.now() - range * 86400000) : plays);
  const total = $derived(inRange.reduce((s, p) => s + p.seconds, 0));

  function top<K extends string>(key: (p: PlayEvent) => K | undefined, n = 8) {
    const m = new Map<K, number>();
    for (const p of inRange) { const k = key(p); if (k) m.set(k, (m.get(k) ?? 0) + p.seconds); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }
  const artists = $derived(top((p) => p.artist));
  const tracks = $derived(top((p) => `${p.title}\u0000${p.artist}`, 8));
  const sources = $derived(top((p) => p.source as SourceId));
  const artistCount = $derived(new Set(inRange.map((p) => p.artist)).size);

  // hour × weekday heatmap (local time), value = minutes
  const DAYS = $derived(weekdays());
  const heat = $derived.by(() => {
    const g = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const p of inRange) { const d = new Date(p.at); g[(d.getDay() + 6) % 7][d.getHours()] += p.seconds / 60; }
    return g;
  });
  const heatMax = $derived(Math.max(1, ...heat.flat()));

  const streak = $derived.by(() => {
    const days = new Set(plays.map((p) => new Date(p.at).toDateString()));
    let n = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  });

  const peakHour = $derived.by(() => {
    const h = new Array(24).fill(0);
    heat.forEach((row) => row.forEach((v, i) => (h[i] += v)));
    const max = Math.max(...h);
    return max > 0 ? h.indexOf(max) : null;
  });
  const hourLabel = fmtHour;
</script>

<div class="page">
  <p class="eyebrow">{t('stats.eyebrow')}</p>
  <h1 class="page-title">{t('stats.title')}</h1>
  <div class="row wrap ranges" role="tablist">
    {#each [[7, 'stats.7d'], [30, 'stats.30d'], [365, 'stats.year'], [0, 'stats.all']] as [v, l]}
      <button role="tab" class="chip" class:active={range === v} aria-selected={range === v} onclick={() => (range = v as typeof range)}>{t(l as Key)}</button>
    {/each}
  </div>

  {#if loaded && !inRange.length}
    <div class="empty section"><h3>{t('stats.empty')}</h3><p>{t('stats.emptyHint')}</p></div>
  {:else if loaded}
    <div class="tiles">
      <div class="tile"><span class="k">{t('stats.time')}</span><span class="v num">{fmtDuration(total)}</span></div>
      <div class="tile"><span class="k">{t('stats.plays')}</span><span class="v num">{inRange.length}</span></div>
      <div class="tile"><span class="k">{t('stats.artists')}</span><span class="v num">{artistCount}</span></div>
      <div class="tile"><span class="k">{t('stats.streak')}</span><span class="v num">{streak}</span></div>
      {#if peakHour !== null}<div class="tile"><span class="k">{t('stats.peak')}</span><span class="v">{hourLabel(peakHour)}</span></div>{/if}
    </div>

    <div class="two">
      <section class="section">
        <div class="section-head"><h2>{t('stats.topArtists')}</h2><span class="faint small">{t('stats.byTime')}</span></div>
        <ul class="bars">
          {#each artists as [name, secs]}
            <li title="{name}: {fmtDuration(secs)}">
              <span class="label ellipsis" dir="auto">{name}</span>
              <span class="track"><i style:width="{(secs / artists[0][1]) * 100}%"></i></span>
              <span class="val num">{fmtDuration(secs)}</span>
            </li>
          {/each}
        </ul>
      </section>
      <section class="section">
        <div class="section-head"><h2>{t('stats.topTracks')}</h2></div>
        <ol class="tops">
          {#each tracks as [key, secs], i}
            {@const [title, artist] = key.split('\u0000')}
            <li><span class="num faint">{i + 1}</span><span class="grow ellipsis" dir="auto">{title}<span class="faint"> · {artist}</span></span><span class="num faint">{fmtDuration(secs)}</span></li>
          {/each}
        </ol>
      </section>
    </div>

    <section class="section">
      <div class="section-head"><h2>{t('stats.when')}</h2><span class="faint small">{t('stats.whenHint')}</span></div>
      <div class="heat" role="table" aria-label={t('stats.heatAria')}>
        <div class="hrow" role="row"><span></span>{#each Array(24) as _, h}<span class="hlabel num" role="columnheader">{h % 3 === 0 ? h : ''}</span>{/each}</div>
        {#each heat as row, d}
          <div class="hrow" role="row">
            <span class="dlabel" role="rowheader">{DAYS[d]}</span>
            {#each row as v, h}
              <span class="cell" role="cell" title={t('stats.cell', { day: DAYS[d], hour: hourLabel(h), min: Math.round(v) })} aria-label={t('stats.cell', { day: DAYS[d], hour: hourLabel(h), min: Math.round(v) })}
                style:background={v ? `oklch(${30 + 55 * (v / heatMax)}% ${0.04 + 0.12 * (v / heatMax)} var(--h))` : 'var(--bg-raise)'}></span>
            {/each}
          </div>
        {/each}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>{t('stats.where')}</h2></div>
      <ul class="bars">
        {#each sources as [src, secs]}
          <li title="{sourceName(src)}: {fmtDuration(secs)}">
            <span class="label">{sourceName(src)}</span>
            <span class="track"><i style:width="{(secs / total) * 100}%"></i></span>
            <span class="val num">{Math.round((secs / total) * 100)}%</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .ranges { gap: 6px; margin: 14px 0 24px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .tile { display: grid; gap: 4px; padding: 16px 18px; background: var(--bg-raise); border: 1px solid var(--line-soft); border-radius: var(--radius); }
  .k { font-size: 12px; color: var(--text-3); }
  .v { font-size: 28px; font-weight: 650; letter-spacing: -0.02em; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .small { font-size: 12.5px; }
  .bars { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  .bars li { display: grid; grid-template-columns: 140px 1fr 70px; gap: 12px; align-items: center; font-size: 13.5px; }
  .track { height: 10px; }
  .track i { display: block; height: 100%; background: var(--accent); border-start-end-radius: 4px; border-end-end-radius: 4px; min-width: 2px; }
  .val { text-align: end; color: var(--text-2); font-size: 12.5px; }
  .tops { list-style: none; padding: 0; margin: 0; display: grid; gap: 2px; font-size: 13.5px; }
  .tops li { display: flex; gap: 12px; padding: 7px 4px; border-bottom: 1px solid var(--line-soft); }
  .heat { display: grid; gap: 3px; overflow-x: auto; }
  .hrow { display: grid; grid-template-columns: 40px repeat(24, minmax(14px, 1fr)); gap: 3px; }
  .cell { aspect-ratio: 1; border-radius: 3px; }
  .hlabel, .dlabel { font-size: 11px; color: var(--text-3); }
  @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
</style>
