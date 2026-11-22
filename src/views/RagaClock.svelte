<script lang="ts">
  import { fmtClock, t } from '../lib/i18n/i18n.svelte';
  import { licenceLabel, moodLabel, praharDesc, praharLabel, seasonLabel, traditionLabel } from '../lib/i18n/labels';
  import { PRAHARS, RAGAS, praharAt, ragaQuery, ragasAt, seasonalAt, type Raga } from '../lib/raga';
  import { archiveSearch } from '../lib/sources/archive';
  import type { Album } from '../lib/sources/album';
  import Card from '../components/Card.svelte';

  let now = $state(new Date());
  $effect(() => { const i = setInterval(() => (now = new Date()), 30000); return () => clearInterval(i); });

  const prahar = $derived(praharAt(now));
  const current = $derived(ragasAt(now));
  const season = $derived(seasonalAt(now));
  let picked: Raga | null = $state(null);
  const focus = $derived(picked ?? current[0] ?? null);

  let albums: Album[] = $state([]);
  let loading = $state(false);
  $effect(() => {
    const r = focus;
    if (!r) return;
    loading = true;
    archiveSearch(ragaQuery(r.name)).then((a) => { if (focus === r) albums = a; }).catch(() => (albums = [])).finally(() => (loading = false));
  });

  // ---- dial geometry: midnight at top, clockwise
  const C = 200, R = 160;
  const ang = (h: number) => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const pt = (h: number, r: number) => [C + r * Math.cos(ang(h)), C + r * Math.sin(ang(h))];
  function arc(h0: number, h1: number, r: number) {
    if (h1 <= h0) h1 += 24;
    const [x0, y0] = pt(h0, r), [x1, y1] = pt(h1, r);
    return `M${x0} ${y0} A${r} ${r} 0 ${h1 - h0 > 12 ? 1 : 0} 1 ${x1} ${y1}`;
  }
  const hourNow = $derived(now.getHours() + now.getMinutes() / 60);
  const hand = $derived(pt(hourNow, R + 20));
  // stack ragas on rings so overlapping windows don't collide
  const rings = (() => {
    const placed: { raga: Raga; ring: number }[] = [];
    for (const r of RAGAS) {
      let ring = 0;
      const overlaps = (a: Raga, b: Raga) => {
        const s = (x: Raga) => { const e = x.hours[1] <= x.hours[0] ? x.hours[1] + 24 : x.hours[1]; return [x.hours[0], e]; };
        const [a0, a1] = s(a), [b0, b1] = s(b);
        return a0 < b1 && b0 < a1;
      };
      while (placed.some((p) => p.ring === ring && overlaps(p.raga, r))) ring++;
      placed.push({ raga: r, ring });
    }
    return placed;
  })();
</script>

<div class="page">
  <p class="eyebrow">{t('raga.eyebrow')}</p>
  <h1 class="page-title">{t('nav.raga')}</h1>
  <p class="muted lead">{t('raga.lead')}</p>

  <div class="layout">
    <svg viewBox="0 0 400 400" class="dial" role="group" aria-label={t('raga.dialAria', { prahar: praharLabel(prahar.label) })}>
      <circle cx={C} cy={C} r={R + 26} class="face" />
      {#each PRAHARS as p}
        {@const [lx, ly] = pt((p.hours[0] + p.hours[1]) / 2, R + 38)}
        {@const [tx, ty] = pt(p.hours[0], R + 14)}
        <path d={arc(p.hours[0], p.hours[1], R + 14)} class="prahar" class:now={p === prahar} />
        <text x={lx} y={ly} class="plabel" class:now={p === prahar} text-anchor="middle" dominant-baseline="middle">{praharLabel(p.label)}</text>
        <circle cx={tx} cy={ty} r="2" class="tick" />
      {/each}
      {#each rings as { raga, ring } (raga.name)}
        <path
          d={arc(raga.hours[0], raga.hours[1], R - 14 - ring * 13)}
          class="raga {raga.tradition}"
          class:on={focus?.name === raga.name}
          role="button"
          tabindex="0"
          aria-label="{raga.name}, {traditionLabel(raga.tradition)}"
          onclick={() => (picked = raga)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); picked = raga; } }}
        ><title>{raga.name} · {moodLabel(raga.name, raga.mood)}</title></path>
      {/each}
      <line x1={C} y1={C} x2={hand[0]} y2={hand[1]} class="hand" />
      <circle cx={C} cy={C} r="54" class="hub" />
      <text x={C} y={C - 6} text-anchor="middle" class="time num">{fmtClock(now)}</text>
      <text x={C} y={C + 16} text-anchor="middle" class="hub-label">{praharLabel(prahar.label)}</text>
    </svg>

    <div class="side">
      <p class="eyebrow">{t('raga.now', { desc: praharDesc(prahar.label, prahar.description) })}</p>
      <ul class="ragas">
        {#each current as r (r.name)}
          <li><button class:on={focus?.name === r.name} onclick={() => (picked = r)}>
            <strong class="display">{r.name}</strong>
            <span class="faint">{traditionLabel(r.tradition)}{r.thaat ? ' · ' + t('raga.thaat', { name: r.thaat }) : ''}</span>
            <span class="mood">{moodLabel(r.name, r.mood)}</span>
          </button></li>
        {:else}<li class="faint">{t('raga.noneNow')}</li>{/each}
      </ul>
      {#if season}
        <p class="season surface"><span class="eyebrow">{t('raga.season', { season: seasonLabel(season.label) })}</span><br />{t('raga.seasonHint', { ragas: season.ragas.join(', ') })}
          {#each season.ragas as s}<button class="chip" onclick={() => (picked = { name: s, tradition: 'Hindustani', hours: [0, 24], mood: season!.label })}>{s}</button>{/each}
        </p>
      {/if}
      <div class="legend row"><span class="sw Hindustani"></span>{traditionLabel('Hindustani')} <span class="sw Carnatic"></span>{traditionLabel('Carnatic')}</div>
    </div>
  </div>

  {#if focus}
    <section class="section">
      <div class="section-head"><h2>{t('raga.recordings', { name: focus.name })}</h2><span class="faint small">{t('raga.recordingsHint')}</span></div>
      {#if loading}<div class="scroll-x">{#each Array(6) as _}<div class="skeleton" style="width:176px;height:220px"></div>{/each}</div>
      {:else if albums.length}
        <div class="scroll-x">{#each albums as a (a.id)}<Card title={a.title} subtitle={a.artist} artwork={a.artwork} seed={a.id} href="#/album/{encodeURIComponent(a.id)}" badge={licenceLabel(a.license)} />{/each}</div>
      {:else}<p class="faint">{t('raga.noRecordings', { name: focus.name })} <a href="#/search?q={encodeURIComponent('raga ' + focus.name)}">{t('raga.searchAll')}</a></p>{/if}
    </section>
  {/if}
</div>

<style>
  .lead { max-width: 680px; margin: 6px 0 0; }
  .layout { display: grid; grid-template-columns: minmax(300px, 460px) 1fr; gap: 40px; align-items: center; margin-top: 24px; }
  .dial { width: 100%; height: auto; overflow: visible; direction: ltr; }
  .face { fill: var(--bg-sunk); stroke: var(--line-soft); }
  .prahar { fill: none; stroke: var(--line); stroke-width: 6; stroke-linecap: butt; }
  .prahar.now { stroke: var(--accent); }
  .plabel { font-size: 10px; fill: var(--text-3); letter-spacing: 0.04em; }
  .plabel.now { fill: var(--accent); font-weight: 700; }
  .tick { fill: var(--bg); }
  .raga { fill: none; stroke-width: 8; stroke-linecap: round; cursor: pointer; opacity: 0.5; transition: opacity 0.2s, stroke-width 0.2s; outline: none; }
  .raga.Hindustani { stroke: oklch(74% 0.13 var(--h)); }
  .raga.Carnatic { stroke: oklch(78% 0.12 calc(var(--h) + 150)); }
  .raga:hover { opacity: 0.9; }
  .raga:focus-visible { opacity: 1; stroke: var(--text); stroke-width: 12; }
  .raga.on { opacity: 1; stroke-width: 11; }
  .hand { stroke: var(--text); stroke-width: 2; stroke-linecap: round; }
  .hub { fill: var(--bg-raise); stroke: var(--line); }
  .time { font-size: 20px; font-weight: 650; fill: var(--text); }
  .hub-label { font-size: 11px; fill: var(--text-3); }
  .ragas { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
  .ragas button { width: 100%; display: grid; text-align: start; gap: 2px; padding: 14px 16px; border-radius: 12px; background: var(--bg-raise); border: 1px solid var(--line-soft); }
  .ragas button.on { border-color: var(--accent); background: linear-gradient(135deg, var(--accent-wash), transparent), var(--bg-raise); }
  .ragas strong { font-size: 22px; }
  .mood { color: var(--text-2); font-size: 13.5px; }
  .season { margin-top: 16px; padding: 14px 16px; font-size: 13.5px; line-height: 1.8; }
  .season .chip { height: 26px; margin-inline-end: 4px; }
  .legend { gap: 8px; margin-top: 14px; font-size: 12.5px; color: var(--text-2); }
  .sw { width: 18px; height: 6px; border-radius: 3px; margin-inline-start: 8px; }
  .sw.Hindustani { background: oklch(74% 0.13 var(--h)); }
  .sw.Carnatic { background: oklch(78% 0.12 calc(var(--h) + 150)); }
  .small { font-size: 12.5px; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .dial { max-width: 420px; margin: 0 auto; } }
</style>
