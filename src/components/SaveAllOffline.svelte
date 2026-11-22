<script lang="ts">
  // "Save all for offline" for an album or playlist: saves its openly licensed tracks one by one.
  import type { Track } from '../lib/types';
  import { canSaveOffline, offline } from '../lib/stores/offline.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n/i18n.svelte';
  import Icon from './Icon.svelte';

  let { tracks }: { tracks: Track[] } = $props();

  const eligible = $derived(tracks.filter(canSaveOffline).length);
  const left = $derived(offline.unsaved(tracks));
  // this list's own run (another list may be saving at the same time)
  let mine = $state(false);

  async function saveAll() {
    mine = true;
    try {
      const { saved, total } = await offline.saveAll(tracks);
      if (total) ui.toast(t('offline.savedAll', { done: saved, total }), saved < total ? 'error' : undefined);
    } catch (e) {
      ui.toast((e as Error).message, 'error');
    } finally { mine = false; }
  }
</script>

{#if eligible}
  {#if mine && offline.batch}
    <button class="btn" onclick={() => offline.stopBatch()} aria-live="polite">
      <Icon name="download" size={15} /> {t('offline.savingAll', { done: Math.min(offline.batch.done + 1, offline.batch.total), total: offline.batch.total })}
      <span class="faint">· {t('offline.stop')}</span>
    </button>
  {:else if left}
    <button class="btn ghost" onclick={saveAll} disabled={!!offline.batch || !offline.online}>
      <Icon name="download" size={15} /> {t('offline.saveAll')}
    </button>
  {:else}
    <span class="btn ghost done" role="status"><Icon name="download" size={15} /> {t('offline.badge')}</span>
  {/if}
{/if}

<style>
  .done { color: var(--accent); cursor: default; }
</style>
