<script lang="ts">
  import { safeUrl } from '../lib/a11y';
  import type { Track } from '../lib/types';
  import { settings } from '../lib/stores/settings.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { player } from '../lib/stores/player.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { db } from '../lib/db';
  import { jamendoKey, jamendoPopular } from '../lib/sources/jamendo';
  import { SOURCES } from '../lib/sources';
  import { i18n, LOCALES, t, type Key } from '../lib/i18n/i18n.svelte';
  import { sourceBlurb, sourceName } from '../lib/i18n/labels';
  import Icon from '../components/Icon.svelte';

  let jkey = $state(localStorage.getItem('jamendo_client_id') ?? '');
  let ykey = $state(localStorage.getItem('youtube_api_key') ?? '');
  let ysaved = $state(false);
  function saveYouTubeKey() { localStorage.setItem('youtube_api_key', ykey.trim()); ysaved = true; setTimeout(() => (ysaved = false), 2500); }
  let jstatus: Key | 'error' | '' = $state('');
  let jerror = $state('');

  async function saveKey() {
    localStorage.setItem('jamendo_client_id', jkey.trim());
    if (!jkey.trim()) { jstatus = 'settings.removed'; return; }
    jstatus = 'settings.checking';
    try { await jamendoPopular(); jstatus = 'settings.connected'; } catch (e) { jstatus = 'error'; jerror = (e as Error).message; }
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
      for (const tr of (data.favorites ?? []).map(cleanTrack)) if (tr && !library.isFavorite(tr.id)) library.toggleFavorite(tr);
      for (const p of data.playlists ?? []) library.createPlaylist(String(p.name ?? 'Playlist'), (p.tracks ?? []).map(cleanTrack).filter(Boolean));
      ui.toast(t('settings.restored'));
    } catch { ui.toast(t('settings.badBackup'), 'error'); }
  }
  let importInput: HTMLInputElement | undefined = $state();
  /** A backup file is untrusted input: keep only plausible tracks and only http(s) links. */
  function cleanTrack(x: Track): Track {
    if (!x || typeof x.id !== 'string' || typeof x.title !== 'string') return null as unknown as Track;
    return { ...x, pageUrl: safeUrl(x.pageUrl), streamUrl: safeUrl(x.streamUrl), artwork: safeUrl(x.artwork), artworkAlts: undefined };
  }
  async function clearAnalysis() { await db.clear('analysis'); ui.toast(t('settings.analysisCleared')); }
  async function clearStats() { if (confirm(t('settings.deleteHistoryConfirm'))) { await db.clear('plays'); ui.toast(t('settings.historyDeleted')); } }

  const SHORTCUTS: [string, Key][] = [
    ['Space', 'keys.playPause'], ['Shift + → / ←', 'keys.nextPrev'], ['→ / ←', 'keys.seek'], ['↑ / ↓', 'keys.volume'],
    ['Ctrl/⌘ + K', 'keys.palette'], ['L', 'keys.lyrics'], ['Q', 'keys.queue'], ['E', 'keys.eq'], ['F', 'keys.ambient'],
    ['M', 'keys.mute'], ['S', 'keys.shuffle'], ['R', 'keys.repeat'], ['[ / ]', 'keys.loop'], ['/', 'keys.search'],
  ];
</script>

<div class="page narrow">
  <p class="eyebrow">{t('nav.settings')}</p>
  <h1 class="page-title">{t('settings.title')}</h1>

  <section class="section group">
    <h2 id="lang-heading" class="row"><Icon name="globe" size={18} /> {t('settings.language')}</h2>
    <div class="langs" role="radiogroup" aria-labelledby="lang-heading">
      {#each LOCALES as l}
        <button role="radio" class="chip" class:active={l.code === i18n.locale} aria-checked={l.code === i18n.locale} lang={l.code} dir={l.rtl ? 'rtl' : 'ltr'}
          onclick={() => i18n.set(l.code)}>{l.name}</button>
      {/each}
    </div>
    <p class="faint small">{t('settings.languageHint')}</p>
  </section>

  <section class="section group">
    <h2>{t('settings.playback')}</h2>
    <label class="field"><span>{t('settings.crossfade')}<small>{settings.crossfade ? t('settings.crossfadeOn', { count: settings.crossfade }) : t('settings.crossfadeOff')}</small></span>
      <input type="range" min="0" max="12" step="1" bind:value={settings.crossfade} style:--fill="{(settings.crossfade / 12) * 100}%" /></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.normalize} onchange={() => player.applyNormalization()} /><span>{t('settings.normalize')}<small>{t('settings.normalizeHint', { target: settings.normTarget })}</small></span></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.autoAnalyse} /><span>{t('settings.autoAnalyse')}<small>{t('settings.autoAnalyseHint')}</small></span></label>
    <label class="switch"><input type="checkbox" bind:checked={settings.autoplay} /><span>{t('settings.autoplay')}<small>{t('settings.autoplayHint')}</small></span></label>
    <button class="btn small" onclick={() => (ui.hearingOpen = true)}><Icon name="ear" size={15} /> {settings.hearingEq ? t('settings.hearingRedo') : t('settings.hearingRun')}</button>
  </section>

  <section class="section group">
    <h2>{t('settings.display')}</h2>
    <label class="switch"><input type="checkbox" bind:checked={settings.transliterate} /><span>{t('settings.translit')}<small>{t('settings.translitHint')}</small></span></label>
    <label class="switch"><input type="checkbox" onchange={(e) => (settings.accent = e.currentTarget.checked ? 'artwork' : 'fixed')} checked={settings.accent === 'artwork'} /><span>{t('settings.tint')}</span></label>
    <div class="field">
      <span id="cine-label">{t('settings.cinematic')}<small>{t('settings.cinematicHint')}</small></span>
      <div class="langs" role="radiogroup" aria-labelledby="cine-label">
        {#each ['off', 'subtle', 'vivid'] as const as m}
          <button role="radio" class="chip" class:active={settings.cinematic === m} aria-checked={settings.cinematic === m} onclick={() => (settings.cinematic = m)}>{t(`cinematic.${m}`)}</button>
        {/each}
      </div>
    </div>
    <label class="switch"><input type="checkbox" bind:checked={settings.reduceMotion} /><span>{t('settings.reduceMotion')}</span></label>
  </section>

  <section class="section group">
    <h2>{t('settings.sources')}</h2>
    <ul class="sources">
      {#each Object.values(SOURCES) as s}
        <li><span class="dot" style:background={s.color}></span><strong>{sourceName(s.id)}</strong><span class="faint">{sourceBlurb(s.id)}</span>{#if s.url}<a href={s.url} target="_blank" rel="noopener" class="faint" aria-label={s.name}><Icon name="external" size={13} /></a>{/if}</li>
      {/each}
    </ul>
    <div class="field">
      <span>{t('settings.jamendoKey')}<small>{t('settings.jamendoHint')} <a href="https://devportal.jamendo.com" target="_blank" rel="noopener">devportal.jamendo.com</a></small></span>
      <div class="row"><input type="text" bind:value={jkey} placeholder="a1b2c3d4" class="grow" dir="ltr" /><button class="btn" onclick={saveKey}>{t('common.save')}</button></div>
      {#if jstatus === 'error'}<small>{jerror}</small>
      {:else if jstatus}<small class:ok={jstatus === 'settings.connected'}>{t(jstatus)}</small>
      {:else if jamendoKey()}<small class="ok">{t('settings.keySet')}</small>{/if}
    </div>
    <div class="field">
      <span>{t('settings.ytKey')}<small>{t('settings.ytKeyHint')} <a href="https://developers.google.com/youtube/v3/getting-started" target="_blank" rel="noopener">developers.google.com</a></small></span>
      <div class="row"><input type="password" bind:value={ykey} placeholder="AIza…" class="grow" dir="ltr" autocomplete="off" /><button class="btn" onclick={saveYouTubeKey}>{t('common.save')}</button></div>
      {#if ysaved}<small class="ok">{t('settings.keySet')}</small>{/if}
    </div>
    <p class="faint small">{t('settings.sourcesNote')}</p>
  </section>

  <section class="section group">
    <h2>{t('settings.data')}</h2>
    <p class="faint small">{t('settings.dataNote')}</p>
    <div class="row wrap">
      <button class="btn small" onclick={backup}>{t('settings.export')}</button>
      <button class="btn small" onclick={() => importInput?.click()}>{t('settings.import')}</button>
      <input bind:this={importInput} type="file" accept="application/json" hidden onchange={(e) => restore(e.currentTarget.files)} />
      <button class="btn small ghost" onclick={clearAnalysis}>{t('settings.clearAnalysis')}</button>
      <button class="btn small ghost danger" onclick={clearStats}>{t('settings.deleteHistory')}</button>
    </div>
  </section>

  <section class="section group">
    <h2>{t('settings.keyboard')}</h2>
    <label class="switch"><input type="checkbox" bind:checked={settings.shortcuts} /><span>{t('settings.shortcuts')}<small>{t('settings.shortcutsHint')}</small></span></label>
    <dl class="keys">{#each SHORTCUTS as [k, v]}<dt><kbd>{k}</kbd></dt><dd>{t(v)}</dd>{/each}</dl>
  </section>

  <p class="faint small about">{t('settings.about')}</p>
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
  kbd { direction: ltr; unicode-bidi: isolate; font: 12px var(--font-ui); padding: 2px 7px; border: 1px solid var(--line); border-radius: 5px; background: var(--bg-raise); }
  .langs { display: flex; flex-wrap: wrap; gap: 8px; }
  .langs .chip { height: 36px; padding: 0 16px; font-size: 14px; }
  .about { margin-top: 28px; }
</style>
