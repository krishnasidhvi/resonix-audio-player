<script lang="ts">
  import { radioSearch, RADIO_MOODS, type RadioQuery } from '../lib/sources/radio';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { debounce } from '../lib/util';
  import Card from '../components/Card.svelte';

  const region = (() => { try { return new Intl.Locale(navigator.language).maximize().region; } catch { return undefined; } })();
  const regionName = region ? new Intl.DisplayNames([navigator.language], { type: 'region' }).of(region) : undefined;

  const presets: { label: string; q: RadioQuery }[] = [
    { label: 'Most played', q: {} },
    ...(region ? [{ label: `Near you (${regionName})`, q: { countrycode: region } }] : []),
    ...RADIO_MOODS,
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
  <p class="eyebrow">Radio Browser · community directory</p>
  <h1 class="page-title">Live radio</h1>
  <p class="muted lead">Tens of thousands of stations, listed by volunteers. Only stations with secure (HTTPS) streams are shown, because browsers block the rest on secure sites.</p>
  <div class="row wrap bar">
    <input type="search" placeholder="Station name" bind:value={name} oninput={() => byName(name)} aria-label="Search stations" />
    {#each presets as p, i}<button class="chip" class:active={!name && active === i} onclick={() => { name = ''; active = i; }}>{p.label}</button>{/each}
  </div>
  {#if loading}
    <div class="grid-cards">{#each Array(12) as _}<div class="skeleton" style="aspect-ratio:1"></div>{/each}</div>
  {:else if error}<p class="faint">Radio Browser is unreachable ({error}).</p>
  {:else if !stations.length}<div class="empty"><h3>No secure stations found</h3></div>
  {:else}
    <div class="grid-cards">
      {#each stations as s, i (s.id)}
        <Card title={s.title} subtitle={[s.artist, s.format && s.bitrate ? `${s.format} ${s.bitrate}k` : s.format].filter(Boolean).join(' · ')} artwork={s.artwork} seed={s.title} onplay={() => player.playList(stations, i)} round badge="LIVE" />
      {/each}
    </div>
  {/if}
</div>

<style>
  .lead { max-width: 640px; margin: 6px 0 0; }
  .bar { gap: 6px; margin: 20px 0 24px; }
  .bar input { width: 220px; margin-right: 6px; }
</style>
