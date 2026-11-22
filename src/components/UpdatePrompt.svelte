<script lang="ts">
  // Desktop only: checks GitHub releases for a newer signed build and offers to install it.
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import type { Update } from '@tauri-apps/plugin-updater';

  let update: Update | null = $state(null);
  let phase: 'ready' | 'downloading' | 'error' = $state('ready');
  let progress = $state(0);
  let dismissed = $state(false);

  onMount(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    const timer = setTimeout(async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        update = await check();
      } catch (e) {
        console.warn('Update check failed', e);
      }
    }, 3000);
    return () => clearTimeout(timer);
  });

  async function install() {
    if (!update) return;
    phase = 'downloading';
    let total = 0, done = 0;
    try {
      await update.downloadAndInstall((ev) => {
        if (ev.event === 'Started') total = ev.data.contentLength ?? 0;
        else if (ev.event === 'Progress') { done += ev.data.chunkLength; if (total) progress = Math.round((done / total) * 100); }
      });
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (e) {
      console.error('Update failed', e);
      phase = 'error';
    }
  }
</script>

{#if update && !dismissed}
  <div class="update" role="dialog" aria-live="polite" aria-label={t('update.title')}>
    <strong>{t('update.available', { version: update.version })}</strong>
    {#if phase === 'downloading'}
      <p class="muted">{progress ? t('update.downloadingPct', { pct: progress }) : t('update.downloading')}</p>
    {:else}
      {#if phase === 'error'}<p class="err">{t('update.failed')}</p>{/if}
      <div class="actions">
        <button class="primary" onclick={install}>{t('update.install')}</button>
        <button onclick={() => (dismissed = true)}>{t('update.later')}</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .update {
    position: fixed; right: 16px; bottom: calc(var(--bar) + 16px); z-index: 101;
    width: min(320px, calc(100vw - 32px)); padding: 14px 16px; border-radius: var(--radius);
    background: var(--bg-raise); color: var(--text); border: 1px solid var(--line);
    box-shadow: 0 10px 30px rgb(0 0 0 / 0.4); display: grid; gap: 8px; font-size: 13.5px;
  }
  p { margin: 0; }
  .err { color: var(--danger); }
  .actions { display: flex; gap: 8px; }
  button { padding: 7px 12px; border-radius: var(--radius-s); border: 1px solid var(--line); background: transparent; color: inherit; font: inherit; font-weight: 550; cursor: pointer; }
  button.primary { background: var(--accent); color: var(--accent-ink); border-color: transparent; }
</style>
