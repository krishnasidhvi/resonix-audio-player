<script lang="ts">
  import { settings } from '../lib/stores/settings.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { db } from '../lib/db';
  import { jamendoKey, jamendoPopular } from '../lib/sources/jamendo';
  import { SOURCES } from '../lib/sources';
  import Icon from '../components/Icon.svelte';

  let jkey = $state(localStorage.getItem('jamendo_client_id') ?? '');
  let jstatus = $state('');

  async function saveKey() {
    localStorage.setItem('jamendo_client_id', jkey.trim());
    if (!jkey.trim()) { jstatus = 'Removed'; return; }
    jstatus = 'Checking…';
    try { await jamendoPopular(); jstatus = 'Connected ✓'; } catch (e) { jstatus = (e as Error).message; }
  }

  function backup() {
    const data = { version: 2, exported: new Date().toISOString(), favorites: $state.snapshot(library.favorites), playlists: $state.snapshot(library.playlists), settings: $state.snapshot(settings) };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `resonix-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  async function restore(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      for (const t of data.favorites ?? []) if (!library.isFavorite(t.id)) library.toggleFavorite(t);
      for (const p of data.playlists ?? []) library.createPlaylist(p.name, p.tracks);
      ui.toast('Backup restored');
    } catch { ui.toast('That file is not a Resonix backup', 'error'); }
  }
  async function clearAnalysis() { await db.clear('analysis'); ui.toast('Analysis cache cleared'); }
  async function clearStats() { if (confirm('Delete all listening history?')) { await db.clear('plays'); ui.toast('Listening history deleted'); } }

  const SHORTCUTS = [
    ['Space', 'Play / pause'], ['Shift + → / ←', 'Next / previous track'], ['→ / ←', 'Seek 5 s'], ['↑ / ↓', 'Volume'],
    ['Ctrl/⌘ + K', 'Command palette'], ['L', 'Lyrics'], ['Q', 'Queue'], ['E', 'Equaliser'], ['F', 'Ambient mode'],
    ['M', 'Mute'], ['S', 'Shuffle'], ['R', 'Repeat'], ['[ / ]', 'Set loop A / B'], ['/', 'Search'],
  ];
</script>

<div class="page narrow">
  <p class="eyebrow">Settings</p>
  <h1 class="page-title">Make it yours</h1>

  <section class="section group">
    <h2>Playback</h2>
    <label class="field"><span>Crossfade<small>{settings.crossfade ? `${settings.crossfade} seconds` : 'Off: tracks play back to back with no gap'}</small></span>
      <input type="range" min="0" max="12" step="1" bind:value={settings.crossfade} style:--fill="{(settings.crossfade / 12) * 100}%" /></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.normalize} onchange={() => player.applyNormalization()} /><span>Match loudness<small>Analysed tracks are levelled to {settings.normTarget} LUFS so nothing jumps out.</small></span></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.autoAnalyse} /><span>Analyse local files automatically<small>Tempo, key, loudness and waveform, computed on this device when a local file plays.</small></span></label>
    <button class="btn small" onclick={() => (ui.hearingOpen = true)}><Icon name="ear" size={15} /> {settings.hearingEq ? 'Redo hearing check' : 'Run hearing check'}</button>
  </section>

  <section class="section group">
    <h2>Lyrics & display</h2>
    <label class="switch"><input type="checkbox" bind:checked={settings.transliterate} /><span>Show Indic lyrics in Latin letters<small>Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali and more, transliterated on the fly.</small></span></label>
    <label class="switch"><input type="checkbox" onchange={(e) => (settings.accent = e.currentTarget.checked ? 'artwork' : 'fixed')} checked={settings.accent === 'artwork'} /><span>Tint the app from the artwork</span></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.reduceMotion} /><span>Reduce motion</span></label>
  </section>

  <section class="section group">
    <h2>Sources</h2>
    <ul class="sources">
      {#each Object.values(SOURCES) as s}
        <li><span class="dot" style:background={s.color}></span><strong>{s.name}</strong><span class="faint">{s.blurb}</span>{#if s.url}<a href={s.url} target="_blank" rel="noopener" class="faint"><Icon name="external" size={13} /></a>{/if}</li>
      {/each}
    </ul>
    <div class="field">
      <span>Jamendo client ID<small>Free from <a href="https://devportal.jamendo.com" target="_blank" rel="noopener">devportal.jamendo.com</a>. Adds Jamendo's full catalogue to search. It's stored only in this browser.</small></span>
      <div class="row"><input type="text" bind:value={jkey} placeholder="e.g. a1b2c3d4" class="grow" /><button class="btn" onclick={saveKey}>Save</button></div>
      {#if jstatus}<small class:ok={jstatus.includes('✓')}>{jstatus}</small>{:else if jamendoKey()}<small class="ok">Key set</small>{/if}
    </div>
    <p class="faint small">Resonix only plays music its sources offer openly: artist-uploaded streams on Audius, Creative Commons and public-domain items on the Internet Archive and Openverse, and live radio. Each track shows its licence and links back to the source. When you reuse CC music, credit the artist as its licence asks.</p>
  </section>

  <section class="section group">
    <h2>Your data</h2>
    <p class="faint small">Everything (library, playlists, favourites, history, analysis) lives in this browser. There's no account and no server.</p>
    <div class="row wrap">
      <button class="btn small" onclick={backup}>Export backup</button>
      <label class="btn small">Import backup<input type="file" accept="application/json" hidden onchange={(e) => restore(e.currentTarget.files)} /></label>
      <button class="btn small ghost" onclick={clearAnalysis}>Clear analysis cache</button>
      <button class="btn small ghost danger" onclick={clearStats}>Delete listening history</button>
    </div>
  </section>

  <section class="section group">
    <h2>Keyboard</h2>
    <dl class="keys">{#each SHORTCUTS as [k, v]}<dt><kbd>{k}</kbd></dt><dd>{v}</dd>{/each}</dl>
  </section>

  <p class="faint small about">Resonix 2.0 · open source (MIT) · lyrics from LRCLIB · no tracking.</p>
</div>

<style>
  .narrow { max-width: 760px; }
  .group { display: grid; gap: 16px; padding-bottom: 28px; border-bottom: 1px solid var(--line-soft); }
  h2 { margin: 0; font-size: 18px; }
  .field { display: grid; gap: 8px; }
  .field span, .switch span { display: grid; gap: 2px; font-weight: 550; }
  small { font-weight: 400; color: var(--text-3); font-size: 12.5px; }
  small a { color: var(--accent); }
  small.ok { color: var(--ok); }
  .switch { display: flex; gap: 12px; align-items: flex-start; cursor: pointer; }
  .switch input { accent-color: var(--accent); width: 18px; height: 18px; margin-top: 2px; flex: none; }
  .small { font-size: 13px; margin: 0; }
  .sources { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13.5px; }
  .sources li { display: flex; align-items: center; gap: 10px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .danger { color: var(--danger); }
  .keys { display: grid; grid-template-columns: auto 1fr; gap: 8px 18px; margin: 0; font-size: 13.5px; }
  dd { margin: 0; color: var(--text-2); }
  kbd { font: 12px var(--font-ui); padding: 2px 7px; border: 1px solid var(--line); border-radius: 5px; background: var(--bg-raise); }
  .about { margin-top: 28px; }
</style>
