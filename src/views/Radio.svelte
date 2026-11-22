<script lang="ts">
  import { regionName, t, td } from '../lib/i18n/i18n.svelte';
  import { radioSearch, RADIO_MOODS, RADIO_SHELVES, type RadioQuery } from '../lib/sources/radio';
  import type { Key } from '../lib/i18n/i18n.svelte';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { debounce } from '../lib/util';
  import Card from '../components/Card.svelte';

  const region = (() => { try { return new Intl.Locale(navigator.language).maximize().region; } catch { return undefined; } })();
  // labels are functions so they follow the current language
  const presets: { label: () => string; q: RadioQuery }[] = [
    { label: () => t('radio.mostPlayed'), q: {} },
    ...(region ? [{ label: () => t('radio.nearYou', { region: regionName(region) }), q: { countrycode: region } }] : []),
    ...RADIO_SHELVES.map((sh) => ({ label: () => t(('radio.shelf.' + sh.id) as Key), q: sh.q as RadioQuery })),
    ...RADIO_MOODS.map((m) => ({ label: () => td(`radio.mood.${m.label}`, m.label), q: m.q })),
  ];
  let active = $state(0);
  let name = $state('');
  let stations: Track[] = $state([]);
  let loading = $state(true);
  let error = $state('');

  async function load(q: RadioQuery) {
    loading = true; error = '';
    try { stations = await radioSearch({ ...q, limit: 60 }); }
    catch (e) { error = (e as Error).message; stations = []; }
    finally { loading = false; }
  }
  $effect(() => { if (!name) void load(presets[active].q); });
  const byName = debounce((v: string) => { if (v.trim().length > 1) void load({ name: v.trim() }); }, 400);
</script>

<div class="page">
  <p class="eyebrow">{t('radio.eyebrow')}</p>
  <h1 class="page-title">{t('radio.title')}</h1>
  <p class="muted lead">{t('radio.lead')}</p>
  <div class="row wrap bar">
    <input type="search" placeholder={t('radio.stationName')} bind:value={name} oninput={() => byName(name)} aria-label={t('radio.searchAria')} />
    {#each presets as p, i}<button class="chip" class:active={!name && active === i} onclick={() => { name = ''; active = i; }}>{p.label()}</button>{/each}
  </div>
  {#if loading}
    <div class="grid-cards">{#each Array(12) as _}<div class="skeleton" style="aspect-ratio:1"></div>{/each}</div>
  {:else if error}<p class="faint">{t('radio.down', { error })}</p>
  {:else if !stations.length}<div class="empty"><h3>{t('radio.none')}</h3></div>
  {:else}
    <div class="grid-cards">
      {#each stations as s, i (s.id)}
        <Card title={s.title} subtitle={[s.artist, s.format && s.bitrate ? `${s.format} ${s.bitrate}k` : s.format].filter(Boolean).join(' · ')} artwork={s.artwork} seed={s.title} onplay={() => player.playList(stations, i)} round badge={t('common.live')} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .lead { max-width: 640px; margin: 6px 0 0; }
  .bar { gap: 6px; margin: 20px 0 24px; }
  .bar input { width: 220px; margin-inline-end: 6px; }
</style>
