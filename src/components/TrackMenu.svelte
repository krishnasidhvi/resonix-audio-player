<script lang="ts">
  import { canLinkOut, spotifyUrl, youtubeMusicUrl } from '../lib/external';
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Track } from '../lib/types';
  import { player } from '../lib/stores/player.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import Icon from './Icon.svelte';

  let { track, onRemove }: { track: Track; onRemove?: () => void } = $props();
  let open = $state(false);
  let root: HTMLDivElement;

  function close(e: MouseEvent) { if (!root.contains(e.target as Node)) open = false; }
  $effect(() => {
    if (!open) return;
    addEventListener('pointerdown', close, true);
    return () => removeEventListener('pointerdown', close, true);
  });

  const act = (fn: () => void) => () => { fn(); open = false; };
  function newPlaylist() {
    const name = prompt(t('playlist.namePrompt'), t('playlist.defaultName'));
    if (name) { library.createPlaylist(name, [track]); ui.toast(t('toast.created', { name })); }
  }
</script>

<div class="menu-root" bind:this={root}>
  <button class="icon-btn" aria-label={t('track.more', { title: track.title })} aria-expanded={open} onclick={(e) => { e.stopPropagation(); open = !open; }}>
    <Icon name="more" />
  </button>
  {#if open}
    <div class="menu surface" role="menu">
      <button role="menuitem" onclick={act(() => player.playNext(track))}>{t('track.playNext')}</button>
      <button role="menuitem" onclick={act(() => player.enqueue([track]))}>{t('track.addQueue')}</button>
      <button role="menuitem" onclick={act(() => library.toggleFavorite(track))}>{library.isFavorite(track.id) ? t('track.unfav') : t('track.fav')}</button>
      <div class="sep"></div>
      <span class="label">{t('track.addToPlaylist')}</span>
      {#each library.playlists as p (p.id)}
        <button role="menuitem" onclick={act(() => { library.addToPlaylist(p.id, [track]); ui.toast(t('toast.addedTo', { name: p.name })); })}>{p.name}</button>
      {/each}
      <button role="menuitem" onclick={act(newPlaylist)}><Icon name="plus" size={15} /> {t('track.newPlaylist')}</button>
      <button role="menuitem" onclick={act(() => player.startRadio(track))}>{t('cmd.startRadio')}</button>
      {#if canLinkOut(track)}
        <div class="sep"></div>
        <a role="menuitem" href={youtubeMusicUrl(track)} target="_blank" rel="noopener">{t('track.openYouTubeMusic')} <Icon name="external" size={14} /></a>
        <a role="menuitem" href={spotifyUrl(track)} target="_blank" rel="noopener">{t('track.openSpotify')} <Icon name="external" size={14} /></a>
      {/if}
      {#if track.pageUrl}
        <div class="sep"></div>
        <a role="menuitem" href={track.pageUrl} target="_blank" rel="noopener">{t('track.openSource')} <Icon name="external" size={14} /></a>
      {/if}
      {#if onRemove}
        <div class="sep"></div>
        <button role="menuitem" class="danger" onclick={act(onRemove)}>{t('common.remove')}</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .menu-root { position: relative; }
  .menu {
    position: absolute; inset-inline-end: 0; top: 100%; z-index: 40; min-width: 220px; padding: 6px;
    display: grid; box-shadow: 0 18px 50px rgb(0 0 0 / 0.5); max-height: 360px; overflow: auto;
  }
  .menu button, .menu a {
    display: flex; align-items: center; gap: 8px; text-align: start; text-decoration: none;
    padding: 8px 10px; border-radius: 7px; font-size: 13.5px;
  }
  .menu button:hover, .menu a:hover { background: oklch(25% 0.015 var(--h)); }
  .sep { height: 1px; background: var(--line-soft); margin: 5px 4px; }
  .label { font-size: 11px; color: var(--text-3); padding: 4px 10px; text-transform: uppercase; letter-spacing: 0.08em; }
  .danger { color: var(--danger); }
</style>
