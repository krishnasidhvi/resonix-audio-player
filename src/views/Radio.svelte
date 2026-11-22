<script lang="ts">
  import { i18n, regionName, t, td } from '../lib/i18n/i18n.svelte';
  import { radioSearch, RADIO_MOODS, RADIO_SHELVES, type RadioQuery } from '../lib/sources/radio';
  import type { Key } from '../lib/i18n/i18n.svelte';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { debounce } from '../lib/util';
  import Card from '../components/Card.svelte';

  const region = (() => { try { return new Intl.Locale(navigator.language).maximize().region; } catch { return undefined; } })();
  // labels are functions so they follow the current language
  const presets: { id: string; label: () => string; q: RadioQuery }[] = [
    { id: 'top', label: () => t('radio.mostPlayed'), q: {} },
    ...(region ? [{ id: 'near', label: () => t('radio.nearYou', { region: regionName(region) }), q: { countrycode: region } }] : []),
    ...RADIO_SHELVES.map((sh) => ({ id: sh.id, label: () => t(('radio.shelf.' + sh.id) as Key), q: sh.q as RadioQuery })),
    ...RADIO_MOODS.map((m) => ({ id: m.label, label: () => td(`radio.mood.${m.label}`, m.label), q: m.q })),
  ];
  // start on the shelf for the interface language (te/hi/ta) or the listener's region
  const langShelf = ({ te: 'te', hi: 'bolly', ta: 'ta' } as Record<string, string>)[i18n.locale];
  let active = $state(Math.max(0, langShelf ? presets.findIndex((p) => p.id === langShelf) : region ? 1 : 0));
  let name = $state('');
  let stations: Track[] = $state([]);
  let loading = $state(true);
  let error = $state('');

  let version = 0;
  async function load(q: RadioQuery) {
    const v = ++version;
    loading = true; error = '';
    try { const r = await radioSearch({ ...q, limit: 60 }); if (v === version) stations = r; }
    catch (e) { if (v === version) { error = (e as Error).message; stations = []; } }
    finally { if (v === version) loading = false; }
  }
  $effect(() => { if (!name) void load(presets[active].q); });
  // bring the starting chip into view (it may be off-screen in the scrolling row on phones)
  $effect(() => { void active; queueMicrotask(() => document.querySelector('main .bar .chip.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })); });
  const byName = debounce((v: string) => { if (v.trim().length > 1 && v === name) void load({ name: v.trim() }); }, 400);
</script>

<div class="page">
  <p class="eyebrow">{t('radio.eyebrow')}</p>
  <h1 class="page-title">{t('radio.title')}</h1>
  <p class="muted lead">{t('radio.lead')}</p>
  <div class="row wrap bar">
    <input type="search" placeholder={t('radio.stationName')} bind:value={name} oninput={() => byName(name)} aria-label={t('radio.searchAria')} />
    {#each presets as p, i}<button class="chip" class:active={!name && active === i} onclick={() => { name = ''; version++; active = i; }}>{p.label()}</button>{/each}
  </div>
  {#if loading}
    <div class="grid-cards">{#each Array(12) as _}<div class="skeleton" style="aspect-ratio:1"></div>{/each}</div>
  {:else if error}<p class="faint">{t('radio.down', { error })}</p>
  {:else if !stations.length}<div class="empty"><h3>{t('radio.none')}</h3></div>
  {:else}
    <div class="grid-cards stations">
      {#each stations as s, i (s.id)}
        <Card title={s.title} subtitle={[s.artist, s.format && s.bitrate ? `${s.format} ${s.bitrate}k` : s.format].filter(Boolean).join(' · ')} artwork={s.artwork} seed={s.title} onplay={() => player.playList(stations, i)} round fit="contain" badge={t('common.live')} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .lead { max-width: 640px; margin: 6px 0 0; }
  .bar { gap: 6px; margin: 20px 0 24px; }
  .bar input { width: 220px; margin-inline-end: 6px; }
  .grid-cards.stations { grid-template-columns: repeat(auto-fill, minmax(138px, 1fr)); gap: 18px 14px; }
  @media (max-width: 720px) {
    /* one scrollable row of filters instead of five wrapped rows */
    .bar { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 6px; margin-inline: -16px; padding-inline: 16px; scrollbar-width: none; }
    .bar > * { flex: none; }
  }
</style>
