<script lang="ts">
  import { i18n, LOCALES, t } from '../../lib/i18n/i18n.svelte';
  import { player } from '../../lib/stores/player.svelte';
  import { library } from '../../lib/stores/library.svelte';
  import { settings } from '../../lib/stores/settings.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import Icon, { type IconName } from '../Icon.svelte';

  interface Cmd { label: string; hint?: string; icon: IconName; run: () => void }

  let q = $state('');
  let sel = $state(0);
  let input: HTMLInputElement;
  $effect(() => { input?.focus(); });

  const go = (h: string) => () => ui.go(h);
  const base: Cmd[] = $derived([
    { label: t('nav.home'), icon: 'home', run: go('#/') },
    { label: t('nav.library'), icon: 'library', run: go('#/library') },
    { label: t('nav.radio'), icon: 'radio', run: go('#/radio') },
    { label: t('nav.raga'), hint: t('cmd.ragaHint'), icon: 'sun', run: go('#/raga') },
    { label: t('nav.journey'), hint: t('cmd.journeyHint'), icon: 'path', run: go('#/journey') },
    { label: t('cmd.stats'), icon: 'chart', run: go('#/stats') },
    { label: t('nav.settings'), icon: 'settings', run: go('#/settings') },
    { label: t('cmd.playPause'), hint: 'Space', icon: 'play', run: () => player.toggle() },
    { label: t('cmd.nextTrack'), hint: 'Shift →', icon: 'next', run: () => player.next() },
    { label: t('cmd.shuffle'), icon: 'shuffle', run: () => player.toggleShuffle() },
    { label: t('panel.lyrics'), hint: 'L', icon: 'lyrics', run: () => { ui.panel = 'lyrics'; ui.panelOpen = true; } },
    { label: t('panel.queue'), hint: 'Q', icon: 'queue', run: () => { ui.panel = 'queue'; ui.panelOpen = true; } },
    { label: t('cmd.signal'), icon: 'signal', run: () => { ui.panel = 'signal'; ui.panelOpen = true; } },
    { label: t('cmd.eq'), hint: 'E', icon: 'eq', run: () => (ui.eqOpen = true) },
    { label: t('cmd.practice'), icon: 'metronome', run: () => (ui.practiceOpen = true) },
    { label: t('eq.hearingCheck'), icon: 'ear', run: () => (ui.hearingOpen = true) },
    { label: t('cmd.ambient'), hint: 'F', icon: 'expand', run: () => (ui.ambient = true) },
    { label: t('cmd.analyse'), icon: 'sparkle', run: () => player.analyse() },
    { label: t('cmd.sleepTrack'), icon: 'moon', run: () => player.setSleep({ mode: 'track' }) },
    { label: t('cmd.sleep30'), icon: 'moon', run: () => player.setSleep({ mode: 'minutes', endsAt: Date.now() + 30 * 60000 }) },
    { label: settings.crossfade ? t('cmd.crossfadeOff') : t('cmd.crossfadeOn'), icon: 'wave', run: () => (settings.crossfade = settings.crossfade ? 0 : 6) },
    ...LOCALES.filter((l) => l.code !== i18n.locale).map((l): Cmd => ({ label: t('cmd.language', { name: l.name }), icon: 'globe', run: () => void i18n.set(l.code) })),
  ]);

  const results = $derived.by((): Cmd[] => {
    const s = q.trim().toLowerCase();
    if (!s) return base;
    const cmds = base.filter((c) => c.label.toLowerCase().includes(s));
    const lib = [...library.local, ...library.favorites]
      .filter((tr, i, a) => a.findIndex((x) => x.id === tr.id) === i && `${tr.title} ${tr.artist}`.toLowerCase().includes(s))
      .slice(0, 6)
      .map((tr): Cmd => ({ label: tr.title, hint: tr.artist, icon: 'play', run: () => player.playList([tr]) }));
    const pls = library.playlists.filter((p) => p.name.toLowerCase().includes(s))
      .map((p): Cmd => ({ label: p.name, hint: t('cmd.playlist'), icon: 'library', run: go(`#/playlist/${p.id}`) }));
    return [
      { label: t('cmd.searchFor', { q: q.trim() }), icon: 'search', run: go(`#/search?q=${encodeURIComponent(q.trim())}`) },
      ...lib, ...pls, ...cmds,
    ];
  });

  $effect(() => { void q; sel = 0; });

  function key(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); e.preventDefault(); }
    else if (e.key === 'Enter') { run(results[sel]); }
    else if (e.key === 'Escape') ui.palette = false;
  }
  function run(c?: Cmd) { if (!c) return; ui.palette = false; c.run(); }
</script>

<div class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) ui.palette = false; }}>
  <div class="pal surface" role="dialog" aria-modal="true" aria-label={t('cmd.aria')}>
    <div class="field row">
      <Icon name="search" size={18} />
      <input bind:this={input} bind:value={q} onkeydown={key} placeholder={t('cmd.placeholder')} aria-label={t('cmd.aria')} aria-controls="pal-list" aria-activedescendant="pal-{sel}" role="combobox" aria-expanded="true" />
      <kbd>Esc</kbd>
    </div>
    <ul id="pal-list" role="listbox">
      {#each results as c, i}
        <li id="pal-{i}" role="option" aria-selected={i === sel}>
          <button class:sel={i === sel} onmouseenter={() => (sel = i)} onclick={() => run(c)}>
            <Icon name={c.icon} size={17} /><span class="grow ellipsis" dir="auto">{c.label}</span>{#if c.hint}<span class="faint hint ellipsis">{c.hint}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 70; background: rgb(0 0 0 / 0.5); backdrop-filter: blur(4px); display: grid; justify-items: center; align-items: start; padding: 12vh 16px 0; }
  .pal { width: min(620px, 100%); overflow: hidden; box-shadow: 0 40px 100px rgb(0 0 0 / 0.6); }
  .field { padding: 0 16px; border-bottom: 1px solid var(--line-soft); color: var(--text-3); }
  .field input { flex: 1; height: 56px; background: transparent; border: 0; font-size: 16px; color: var(--text); padding: 0 4px; }
  kbd { font: 11px var(--font-ui); padding: 1px 6px; border: 1px solid var(--line); border-radius: 4px; }
  ul { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow: auto; }
  button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; text-align: start; color: var(--text-2); }
  button.sel { background: oklch(25% 0.016 var(--h)); color: var(--text); }
  .hint { font-size: 12.5px; max-width: 40%; }
</style>
