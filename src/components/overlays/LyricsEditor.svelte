<script lang="ts">
  import { isDesktop, publishToLrclib } from '../../lib/desktop';
  // Tap-to-sync lyrics editor. Step 1: edit the text. Step 2: play the song and tap as each
  // line starts. Saved lyrics are stored on this device and used for this track from then on.
  import { player } from '../../lib/stores/player.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n/i18n.svelte';
  import { focusScope } from '../../lib/a11y';
  import { fetchLyrics, removeLocalLyrics, saveLocalLyrics } from '../../lib/lyrics/lrclib';
  import { activeLine, lrcTime, toLrc } from '../../lib/lyrics/lrc';
  import Icon from '../Icon.svelte';

  const track = player.current!;
  let step: 'text' | 'sync' = $state('text');
  let text = $state('');
  let lines: { t: number | null; text: string }[] = $state([]);
  let cursor = $state(0);
  let isLocal = $state(false);
  let list: HTMLOListElement | undefined = $state();

  // prefill from whatever lyrics we have (yours, or LRCLIB's)
  fetchLyrics(track).then((l) => {
    if (!l) return;
    isLocal = !!l.local;
    if (l.synced) { text = l.lines.map((x) => x.text).join('\n'); lines = l.lines.map((x) => ({ t: x.t, text: x.text })); }
    else text = l.plain ?? '';
  });

  const done = $derived(lines.filter((l) => l.t !== null).length);
  const allTimed = $derived(lines.length > 0 && done === lines.length);
  const playingIdx = $derived(allTimed ? activeLine(lines as { t: number; text: string }[], player.time) : -1);

  function startSync() {
    const fresh = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    // keep earlier timings if the lines didn't change
    const same = fresh.length === lines.length && fresh.every((s, i) => s === lines[i].text);
    lines = same ? lines : fresh.map((s) => ({ t: null, text: s }));
    cursor = same ? lines.findIndex((l) => l.t === null) : 0;
    if (cursor < 0) cursor = lines.length;
    step = 'sync';
  }

  function tap() {
    if (cursor >= lines.length) return;
    lines[cursor].t = Math.round(player.time * 100) / 100;
    cursor++;
    scrollToCursor();
  }
  function undo() {
    if (cursor === 0) return;
    cursor--;
    const prev = lines[cursor].t;
    lines[cursor].t = null;
    if (prev !== null) player.seek(Math.max(0, prev - 3));
    scrollToCursor();
  }
  /** Redo from a given line: clear it and everything after, and jump back a little before it. */
  function redoFrom(i: number) {
    const before = lines[i - 1]?.t ?? 0;
    for (let k = i; k < lines.length; k++) lines[k].t = null;
    cursor = i;
    player.seek(Math.max(0, before - 1));
  }
  function restart() { for (const l of lines) l.t = null; cursor = 0; player.seek(0); }
  function nudge(i: number, d: number) {
    const v = lines[i].t;
    if (v === null) return;
    lines[i].t = Math.max(0, Math.round((v + d) * 100) / 100);
  }
  function scrollToCursor() {
    requestAnimationFrame(() => list?.querySelector(`[data-i="${cursor}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }

  const lrc = () => toLrc(lines.map((l) => ({ t: l.t ?? 0, text: l.text })).sort((a, b) => a.t - b.t), {
    title: track.title, artist: track.artist, album: track.album, duration: track.duration || player.duration,
  });
  async function save() {
    if (!allTimed) return;
    await saveLocalLyrics(track.id, { lrc: lrc() });
    ui.toast(t('lyr.saved'));
    close();
  }
  async function savePlain() {
    await saveLocalLyrics(track.id, { plain: text.trim() });
    ui.toast(t('lyr.saved'));
    close();
  }
  async function useLrclib() { await removeLocalLyrics(track.id); close(); }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lrc()], { type: 'text/plain' }));
    a.download = `${track.artist} - ${track.title}.lrc`.replace(/[\\/:*?"<>|]/g, '_');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  // Desktop app only: publish to LRCLIB (the Rust side solves LRCLIB's proof-of-work)
  let publishing = $state(false);
  let published = $state(false);
  let publishError = $state('');
  async function publish() {
    if (!allTimed || publishing) return;
    if (!confirm(t('lyr.publishConfirm'))) return;
    publishing = true; publishError = '';
    try {
      const sorted = lines.map((l) => ({ t: l.t ?? 0, text: l.text })).sort((a, b) => a.t - b.t);
      await publishToLrclib({
        trackName: track.title,
        artistName: track.artist,
        // LRCLIB requires an album name; singles usually carry the song title as their album
        albumName: track.album || track.title,
        duration: Math.round(track.duration || player.duration),
        syncedLyrics: toLrc(sorted),
        plainLyrics: sorted.map((l) => l.text).join('\n'),
      });
      published = true;
      ui.toast(t('lyr.published'));
    } catch (e) {
      publishError = t('lyr.publishFailed', { error: String((e as Error)?.message ?? e) });
    } finally { publishing = false; }
  }
  async function copy() { await navigator.clipboard.writeText(lrc()); ui.toast(t('lyr.copied')); }
  function close() { ui.lyricsEditor = false; }

  function onKey(e: KeyboardEvent) {
    if (step !== 'sync' || (e.target as HTMLElement).closest('textarea, input')) return;
    if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); tap(); }
    else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
  }
</script>

<div class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) close(); }}>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dialog surface" role="dialog" aria-modal="true" aria-label={t('lyr.title')} tabindex="-1" onkeydown={onKey} use:focusScope={{ modal: true, onClose: close }}>
    <header class="row">
      <div class="grow">
        <p class="eyebrow">{t('lyr.title')}</p>
        <h2 class="ellipsis" dir="auto">{track.title}<span class="faint"> · {track.artist}</span></h2>
      </div>
      <button class="icon-btn" aria-label={t('common.close')} onclick={close}><Icon name="close" size={16} /></button>
    </header>

    {#if step === 'text'}
      <p class="faint small">{t('lyr.textHint')}</p>
      <textarea bind:value={text} rows="14" dir="auto" aria-label={t('lyr.title')}></textarea>
      <div class="row wrap actions">
        <button class="btn primary" disabled={!text.trim()} onclick={startSync}><Icon name="metronome" size={15} /> {t('lyr.startSync')}</button>
        <button class="btn" disabled={!text.trim()} onclick={savePlain}>{t('lyr.savePlain')}</button>
        {#if isLocal}<button class="btn ghost" onclick={useLrclib}>{t('lyr.removeLocal')}</button>{/if}
      </div>
    {:else}
      <p class="faint small">{t('lyr.syncHint')}</p>
      <div class="sync-bar row" dir="ltr">
        <button class="tap" onclick={tap} disabled={cursor >= lines.length}>{t('lyr.tap')}<small class="num">{lrcTime(player.time)}</small></button>
        <div class="row wrap side">
          <button class="icon-btn" aria-label={player.playing ? t('player.pause') : t('player.play')} onclick={() => player.toggle()}><Icon name={player.playing ? 'pause' : 'play'} /></button>
          <button class="btn small" onclick={undo} disabled={cursor === 0}>{t('lyr.undo')}</button>
          <button class="btn small ghost" onclick={restart}>{t('lyr.restart')}</button>
          <span class="faint small num">{done}/{lines.length}</span>
        </div>
      </div>
      <ol class="lines" bind:this={list}>
        {#each lines as l, i (i)}
          <li data-i={i} class:cursor={i === cursor} class:playing={i === playingIdx} class:timed={l.t !== null}>
            <button class="redo" onclick={() => redoFrom(i)} dir="auto">
              <span class="num stamp">{l.t === null ? '--:--.--' : lrcTime(l.t)}</span>
              <span class="txt">{l.text}</span>
            </button>
            {#if l.t !== null}
              <button class="icon-btn n" aria-label={t('lyr.earlier')} title={t('lyr.earlier')} onclick={() => nudge(i, -0.1)}>−</button>
              <button class="icon-btn n" aria-label={t('lyr.later')} title={t('lyr.later')} onclick={() => nudge(i, 0.1)}>+</button>
            {/if}
          </li>
        {/each}
      </ol>
      <div class="row wrap actions">
        <button class="btn primary" disabled={!allTimed} onclick={save} title={allTimed ? '' : t('lyr.notDone', { done, total: lines.length })}>{t('lyr.save')}</button>
        <button class="btn" disabled={!allTimed} onclick={download}>{t('lyr.download')}</button>
        <button class="btn" disabled={!allTimed} onclick={copy}>{t('lyr.copy')}</button>
        <button class="btn ghost" onclick={() => (step = 'text')}>{t('lyr.back')}</button>
        {#if !allTimed}<span class="faint small">{t('lyr.notDone', { done, total: lines.length })}</span>{/if}
      </div>
      <details class="publish">
        <summary>{t('lyr.publishTitle')}</summary>
        {#if isDesktop}
          <p class="faint small">{t('lyr.publishDesktopHint')}</p>
          <div class="row wrap actions">
            <button class="btn" disabled={!allTimed || publishing || published} onclick={publish}>
              {publishing ? t('lyr.publishing') : published ? t('lyr.published') : t('lyr.publish')}
            </button>
            {#if !allTimed}<span class="faint small">{t('lyr.notDone', { done, total: lines.length })}</span>{/if}
          </div>
          {#if publishError}<p class="small err">{publishError}</p>{/if}
        {:else}
          <p class="faint small">{t('lyr.publishHint')} <a href="https://github.com/tranxuanthang/lrcget" target="_blank" rel="noopener">LRCGET</a> · <a href="https://lrclib.net" target="_blank" rel="noopener">lrclib.net</a></p>
        {/if}
      </details>
    {/if}
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 70; background: rgb(0 0 0 / 0.55); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 16px; }
  .dialog { width: min(680px, 100%); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; box-shadow: 0 40px 100px rgb(0 0 0 / 0.6); overflow: hidden; }
  header h2 { margin: 2px 0 0; font-size: 18px; }
  .eyebrow { margin: 0; }
  .small { font-size: 12.5px; margin: 0; }
  textarea { width: 100%; resize: vertical; min-height: 220px; padding: 12px 14px; border-radius: 10px; background: var(--bg-sunk); border: 1px solid var(--line); color: var(--text); font: 15px/1.6 var(--font-ui); }
  textarea:focus { outline: none; border-color: var(--accent); }
  .actions { gap: 8px; }
  .sync-bar { gap: 14px; }
  .tap { width: 120px; height: 72px; border-radius: 16px; background: var(--accent); color: var(--accent-ink); font-weight: 750; font-size: 20px; display: grid; place-items: center; line-height: 1.1; flex: none; }
  .tap small { font-size: 12px; font-weight: 600; opacity: 0.8; }
  .tap:active { transform: scale(0.97); }
  .tap:disabled { opacity: 0.4; }
  .side { gap: 8px; }
  .lines { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; min-height: 160px; display: grid; align-content: start; gap: 2px; }
  .lines li { display: flex; align-items: center; gap: 4px; border-radius: 8px; }
  .lines li.cursor { background: var(--accent-wash); }
  .lines li.playing .txt { color: var(--accent); }
  .redo { flex: 1; min-width: 0; display: flex; gap: 12px; text-align: start; padding: 7px 10px; border-radius: 8px; }
  .redo:hover { background: var(--bg-raise); }
  .stamp { font-size: 12px; color: var(--text-3); flex: none; direction: ltr; }
  .timed .stamp { color: var(--text-2); }
  .txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .n { width: 28px; height: 28px; font-size: 16px; }
  .publish summary { cursor: pointer; font-size: 13px; color: var(--text-2); }
  .publish a { color: var(--accent); }
  .publish .actions { margin-top: 8px; }
  .err { color: var(--danger); margin-top: 6px; }
</style>
