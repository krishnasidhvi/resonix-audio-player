<script lang="ts">
  import YouTube from './views/YouTube.svelte';
  import YouTubeDock from './components/YouTubeDock.svelte';
  import Cinematic from './components/Cinematic.svelte';
  import { player } from './lib/stores/player.svelte';
  import { library } from './lib/stores/library.svelte';
  import { settings } from './lib/stores/settings.svelte';
  import { ui } from './lib/stores/ui.svelte';
  import { importFiles } from './lib/sources/local';
  import { artworkHue, hueOf } from './lib/util';
  import { t } from './lib/i18n/i18n.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import PlayerBar from './components/PlayerBar.svelte';
  import SidePanel from './components/SidePanel.svelte';
  import EqPanel from './components/overlays/EqPanel.svelte';
  import PracticePanel from './components/overlays/PracticePanel.svelte';
  import HearingCheck from './components/overlays/HearingCheck.svelte';
  import CommandPalette from './components/overlays/CommandPalette.svelte';
  import Ambient from './components/overlays/Ambient.svelte';
  import Home from './views/Home.svelte';
  import Search from './views/Search.svelte';
  import Library from './views/Library.svelte';
  import Playlist from './views/Playlist.svelte';
  import Album from './views/Album.svelte';
  import Radio from './views/Radio.svelte';
  import RagaClock from './views/RagaClock.svelte';
  import Journey from './views/Journey.svelte';
  import Stats from './views/Stats.svelte';
  import Settings from './views/Settings.svelte';

  void library.load();
  let dragging = $state(false);

  // Accent hue follows the artwork (or a stable hue from the title when the image isn't readable).
  $effect(() => {
    const cur = player.current;
    if (settings.accent !== 'artwork' || !cur) { document.documentElement.style.setProperty('--h', '285'); return; }
    const fallback = hueOf(cur.artist + cur.title);
    document.documentElement.style.setProperty('--h', String(fallback));
    if (cur.artwork) artworkHue(cur.artwork).then((h) => { if (h !== null && player.current?.id === cur.id) document.documentElement.style.setProperty('--h', String(h)); });
  });
  $effect(() => { document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion); });
  $effect(() => { const cur = player.current; document.title = cur ? `${cur.title} · ${cur.artist}` : 'Resonix'; });

  function typing(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
  }
  function onKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.palette = !ui.palette; return; }
    if (e.key === 'Escape') { ui.eqOpen = ui.practiceOpen = ui.palette = ui.hearingOpen = false; if (ui.ambient) ui.ambient = false; return; }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || ui.palette) return;
    const k = e.key;
    if (k === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); player.toggle(); }
    else if (k === 'ArrowRight' && e.shiftKey) player.next();
    else if (k === 'ArrowLeft' && e.shiftKey) player.prev();
    else if (k === 'ArrowRight' && !(e.target as HTMLElement).closest('[role=slider]')) player.seek(player.time + 5);
    else if (k === 'ArrowLeft' && !(e.target as HTMLElement).closest('[role=slider]')) player.seek(player.time - 5);
    else if (k === 'ArrowUp') { e.preventDefault(); player.setVolume(Math.min(1, settings.volume + 0.05)); }
    else if (k === 'ArrowDown') { e.preventDefault(); player.setVolume(Math.max(0, settings.volume - 0.05)); }
    else if (k === 'l') { ui.panel = 'lyrics'; ui.panelOpen = true; }
    else if (k === 'q') { ui.panel = 'queue'; ui.panelOpen = true; }
    else if (k === 'e') ui.eqOpen = !ui.eqOpen;
    else if (k === 'f' && player.current) ui.ambient = !ui.ambient;
    else if (k === 'm') player.setVolume(settings.volume ? 0 : 0.8);
    else if (k === 's') player.toggleShuffle();
    else if (k === 'r') player.cycleRepeat();
    else if (k === '[') player.setLoopPoint('a');
    else if (k === ']') player.setLoopPoint('b');
    else if (k === '/') { e.preventDefault(); ui.go('#/search'); }
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!files.length) return;
    const tracks = await importFiles(files, () => {});
    if (!tracks.length) return ui.toast(t('toast.noAudio'), 'error');
    await library.addLocal(tracks);
    ui.toast(t('toast.addedToLibrary', { count: tracks.length }));
    player.playList(tracks, 0);
  }
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files');
</script>

<svelte:window onkeydown={onKey} />

<div
  class="app"
  class:panel-open={ui.panelOpen}
  role="application"
  ondragover={(e) => { if (hasFiles(e)) { e.preventDefault(); dragging = true; } }}
  ondragleave={(e) => { if (!e.relatedTarget) dragging = false; }}
  ondrop={onDrop}
>
  <Sidebar />
  {#if settings.cinematic !== 'off' && !ui.ambient}<div class="cine-layer"><Cinematic /></div>{/if}
  <main id="main" class="main" class:over-cine={settings.cinematic !== 'off'} class:dock-open={player.current?.source === 'youtube'}>
    {#key ui.route.name === 'search' ? 'search' : JSON.stringify(ui.route)}
      {#if ui.route.name === 'home'}<Home />
      {:else if ui.route.name === 'search'}<Search q={ui.route.q} />
      {:else if ui.route.name === 'library'}<Library tab={ui.route.tab} />
      {:else if ui.route.name === 'playlist'}<Playlist id={ui.route.id} />
      {:else if ui.route.name === 'album'}<Album id={ui.route.id} />
      {:else if ui.route.name === 'radio'}<Radio />
      {:else if ui.route.name === 'youtube'}<YouTube url={ui.route.url} />
      {:else if ui.route.name === 'raga'}<RagaClock />
      {:else if ui.route.name === 'journey'}<Journey />
      {:else if ui.route.name === 'stats'}<Stats />
      {:else if ui.route.name === 'settings'}<Settings />{/if}
    {/key}
  </main>
  {#if ui.panelOpen}<SidePanel />{/if}
  <PlayerBar />
</div>

<YouTubeDock />

{#if ui.eqOpen}<EqPanel />{/if}
{#if ui.practiceOpen}<PracticePanel />{/if}
{#if ui.hearingOpen}<HearingCheck />{/if}
{#if ui.palette}<CommandPalette />{/if}
{#if ui.ambient}<Ambient />{/if}

{#if dragging}
  <div class="drop" aria-hidden="true"><div><strong class="display">{t('drop.title')}</strong><p class="muted">{t('drop.hint')}</p></div></div>
{/if}

<div class="toasts" role="status" aria-live="polite">
  {#each ui.toasts as t (t.id)}<div class="toast" class:error={t.kind === 'error'}>{t.text}</div>{/each}
</div>

<style>
  .app {
    height: 100dvh; display: grid;
    grid-template-columns: var(--sidebar) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas: 'side main' 'bar bar';
  }
  .app.panel-open { grid-template-columns: var(--sidebar) minmax(0, 1fr) var(--panel); grid-template-areas: 'side main panel' 'bar bar bar'; }
  .main { grid-area: main; overflow-y: auto; min-height: 0; position: relative; z-index: 1; background: radial-gradient(1200px 500px at 30% -10%, oklch(30% 0.06 var(--h) / 0.55), transparent 70%), var(--bg); transition: background 1s; }
  .main.dock-open { padding-bottom: 240px; }
  .cine-layer { grid-area: main; position: relative; overflow: hidden; background: var(--bg); }
  /* scrim keeps text readable over the moving scene */
  .main.over-cine { background: linear-gradient(180deg, oklch(12% 0.02 var(--h) / 0.5), oklch(12% 0.02 var(--h) / 0.72) 40%, oklch(12% 0.02 var(--h) / 0.8)); }
  .drop { position: fixed; inset: 10px; z-index: 90; border: 2px dashed var(--accent); border-radius: 20px; background: oklch(12% 0.03 var(--h) / 0.85); display: grid; place-items: center; text-align: center; pointer-events: none; }
  .drop strong { font-size: 28px; }
  .toasts { position: fixed; left: 50%; bottom: calc(var(--bar) + 16px); transform: translateX(-50%); z-index: 100; display: grid; gap: 8px; justify-items: center; pointer-events: none; }
  .toast { padding: 10px 16px; border-radius: 10px; background: var(--text); color: var(--bg); font-weight: 550; font-size: 13.5px; box-shadow: 0 10px 30px rgb(0 0 0 / 0.4); animation: pop 0.25s var(--ease); max-width: min(560px, 90vw); }
  .toast.error { background: var(--danger); color: #1a0505; }
  @keyframes pop { from { opacity: 0; transform: translateY(8px); } }
  @media (max-width: 1280px) { .app.panel-open { grid-template-columns: var(--sidebar) minmax(0, 1fr); grid-template-areas: 'side main' 'bar bar'; } }
  @media (max-width: 1100px) { .app, .app.panel-open { --sidebar: 72px; } }
  @media (max-width: 720px) {
    .app, .app.panel-open { grid-template-columns: 1fr; grid-template-rows: minmax(0, 1fr) auto auto; grid-template-areas: 'main' 'bar' 'side'; }
  }
</style>
