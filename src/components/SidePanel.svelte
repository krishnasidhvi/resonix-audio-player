<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import Icon from './Icon.svelte';
  import NowPlaying from './panel/NowPlaying.svelte';
  import Lyrics from './panel/Lyrics.svelte';
  import Queue from './panel/Queue.svelte';
  import SignalPath from './panel/SignalPath.svelte';

  const tabs = [
    { id: 'now', label: 'Now' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'queue', label: 'Queue' },
    { id: 'signal', label: 'Signal' },
  ] as const;
</script>

<aside class="panel" aria-label="Now playing panel">
  <div class="tabs" role="tablist">
    {#each tabs as tab}
      <button role="tab" aria-selected={ui.panel === tab.id} class:active={ui.panel === tab.id} onclick={() => (ui.panel = tab.id)}>{tab.label}</button>
    {/each}
    <span class="grow"></span>
    <button class="icon-btn" aria-label="Close panel" onclick={() => (ui.panelOpen = false)}><Icon name="close" size={16} /></button>
  </div>
  <div class="body" class:fill={ui.panel === 'lyrics'}>
    {#if ui.panel === 'now'}<NowPlaying />
    {:else if ui.panel === 'lyrics'}<Lyrics />
    {:else if ui.panel === 'queue'}<Queue />
    {:else}<SignalPath />{/if}
  </div>
</aside>

<style>
  .panel { grid-area: panel; display: flex; flex-direction: column; min-height: 0; background: var(--bg-sunk); border-left: 1px solid var(--line-soft); }
  .tabs { display: flex; align-items: center; gap: 2px; padding: 12px 12px 8px 14px; }
  .tabs [role='tab'] { padding: 6px 11px; border-radius: 8px; color: var(--text-3); font-weight: 600; font-size: 13px; }
  .tabs [role='tab']:hover { color: var(--text); }
  .tabs [role='tab'].active { color: var(--text); background: var(--bg-raise); }
  .body { flex: 1; overflow-y: auto; padding: 8px 18px 24px; min-height: 0; }
  .body.fill { overflow: hidden; display: flex; flex-direction: column; }
  @media (max-width: 1280px) {
    .panel { position: fixed; right: 0; top: 0; bottom: var(--bar); width: min(var(--panel), 92vw); z-index: 30; box-shadow: -30px 0 60px rgb(0 0 0 / 0.5); }
  }
  @media (max-width: 900px) { .panel { bottom: 120px; } }
</style>
