<script lang="ts">
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
  const base: Cmd[] = [
    { label: 'Home', icon: 'home', run: go('#/') },
    { label: 'Library', icon: 'library', run: go('#/library') },
    { label: 'Radio', icon: 'radio', run: go('#/radio') },
    { label: 'Raga clock', hint: "What to hear at this hour", icon: 'sun', run: go('#/raga') },
    { label: 'Journey', hint: 'Draw a path through moods', icon: 'path', run: go('#/journey') },
    { label: 'Listening stats', icon: 'chart', run: go('#/stats') },
    { label: 'Settings', icon: 'settings', run: go('#/settings') },
    { label: 'Play / pause', hint: 'Space', icon: 'play', run: () => player.toggle() },
    { label: 'Next track', hint: 'Shift →', icon: 'next', run: () => player.next() },
    { label: 'Toggle shuffle', icon: 'shuffle', run: () => player.toggleShuffle() },
    { label: 'Lyrics', hint: 'L', icon: 'lyrics', run: () => { ui.panel = 'lyrics'; ui.panelOpen = true; } },
    { label: 'Queue', hint: 'Q', icon: 'queue', run: () => { ui.panel = 'queue'; ui.panelOpen = true; } },
    { label: 'Signal path', icon: 'signal', run: () => { ui.panel = 'signal'; ui.panelOpen = true; } },
    { label: 'Equaliser', hint: 'E', icon: 'eq', run: () => (ui.eqOpen = true) },
    { label: 'Practice mode', icon: 'metronome', run: () => (ui.practiceOpen = true) },
    { label: 'Hearing check', icon: 'ear', run: () => (ui.hearingOpen = true) },
    { label: 'Ambient mode', hint: 'F', icon: 'expand', run: () => (ui.ambient = true) },
    { label: 'Analyse current track', icon: 'sparkle', run: () => player.analyse() },
    { label: 'Sleep after this track', icon: 'moon', run: () => player.setSleep({ mode: 'track' }) },
    { label: 'Sleep in 30 minutes', icon: 'moon', run: () => player.setSleep({ mode: 'minutes', endsAt: Date.now() + 30 * 60000 }) },
    { label: `Crossfade: ${settings.crossfade ? 'turn off' : '6 seconds'}`, icon: 'wave', run: () => (settings.crossfade = settings.crossfade ? 0 : 6) },
  ];

  const results = $derived.by((): Cmd[] => {
    const s = q.trim().toLowerCase();
    if (!s) return base;
    const cmds = base.filter((c) => c.label.toLowerCase().includes(s));
    const lib = [...library.local, ...library.favorites]
      .filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i && `${t.title} ${t.artist}`.toLowerCase().includes(s))
      .slice(0, 6)
      .map((t): Cmd => ({ label: t.title, hint: t.artist, icon: 'play', run: () => player.playList([t]) }));
    const pls = library.playlists.filter((p) => p.name.toLowerCase().includes(s))
      .map((p): Cmd => ({ label: p.name, hint: 'Playlist', icon: 'library', run: go(`#/playlist/${p.id}`) }));
    return [
      { label: `Search everywhere for “${q.trim()}”`, icon: 'search', run: go(`#/search?q=${encodeURIComponent(q.trim())}`) },
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
  <div class="pal surface" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="field row">
      <Icon name="search" size={18} />
      <input bind:this={input} bind:value={q} onkeydown={key} placeholder="Search music, jump anywhere, run a command…" aria-label="Command" aria-controls="pal-list" aria-activedescendant="pal-{sel}" role="combobox" aria-expanded="true" />
      <kbd>Esc</kbd>
    </div>
    <ul id="pal-list" role="listbox">
      {#each results as c, i}
        <li id="pal-{i}" role="option" aria-selected={i === sel}>
          <button class:sel={i === sel} onmouseenter={() => (sel = i)} onclick={() => run(c)}>
            <Icon name={c.icon} size={17} /><span class="grow ellipsis">{c.label}</span>{#if c.hint}<span class="faint hint ellipsis">{c.hint}</span>{/if}
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
  button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; text-align: left; color: var(--text-2); }
  button.sel { background: oklch(25% 0.016 var(--h)); color: var(--text); }
  .hint { font-size: 12.5px; max-width: 40%; }
</style>
