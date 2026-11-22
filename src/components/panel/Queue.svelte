<script lang="ts">
  import { player } from '../../lib/stores/player.svelte';
  import { library } from '../../lib/stores/library.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmtTime } from '../../lib/util';
  import { fmtDate, fmtDuration, t } from '../../lib/i18n/i18n.svelte';
  import Artwork from '../Artwork.svelte';
  import Icon from '../Icon.svelte';

  let dragFrom: number | null = $state(null);
  let dragOver: number | null = $state(null);

  const remaining = $derived(player.queue.slice(player.index + 1).reduce((s, t) => s + (t.duration || 0), 0));

  /** Alt+ArrowUp / Alt+ArrowDown moves the focused track. */
  function reorderKey(e: KeyboardEvent, i: number) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const to = e.key === 'ArrowUp' ? i - 1 : i + 1;
    if (to < 0 || to >= player.queue.length) return;
    player.move(i, to);
    requestAnimationFrame(() => (document.querySelectorAll<HTMLElement>('.q .hit')[to])?.focus());
  }

  function drop(i: number) {
    if (dragFrom !== null && dragFrom !== i) player.move(dragFrom, i);
    dragFrom = dragOver = null;
  }
  function save() {
    const name = prompt(t('queue.savePrompt'), t('queue.defaultName', { date: fmtDate(new Date()) }));
    if (name) { library.createPlaylist(name, player.queue); ui.toast(t('toast.saved', { name })); }
  }
</script>

{#if !player.queue.length}
  <div class="empty"><h3>{t('queue.empty')}</h3><p>{t('queue.emptyHint')}</p></div>
{:else}
  <div class="head row">
    <span class="faint small grow">{t('queue.upNext', { count: player.queue.length - player.index - 1 })}{#if remaining} · {fmtDuration(remaining)}{/if}</span>
    <button class="btn small ghost" onclick={() => player.harmonicShuffle()} disabled={player.queue.length - player.index < 3}>{t('harm.button')}</button>
    <button class="btn small ghost" onclick={save}>{t('queue.save')}</button>
  </div>
  <p id="q-reorder" class="sr-only">{t('queue.reorderHint')}</p>
  <ol class="q">
    {#each player.queue as tr, i (tr.id + i)}
      <li
        class:cur={i === player.index}
        class:past={i < player.index}
        class:over={dragOver === i}
        draggable="true"
        ondragstart={() => (dragFrom = i)}
        ondragover={(e) => { e.preventDefault(); dragOver = i; }}
        ondragleave={() => (dragOver = null)}
        ondrop={() => drop(i)}
      >
        <button class="hit" aria-label={t('common.playItem', { title: tr.title })} aria-describedby="q-reorder" onclick={() => player.load(i)} onkeydown={(e) => reorderKey(e, i)}></button>
        <span class="grip" aria-hidden="true">⋮⋮</span>
        <Artwork src={tr.artwork} seed={tr.artist + tr.title} size="36px" radius="6px" />
        <span class="meta grow">
          <span class="ellipsis t" dir="auto">{tr.title}</span>
          <span class="ellipsis a" dir="auto">{tr.artist}</span>
        </span>
        <span class="num faint small">{tr.isLive ? t('queue.live') : fmtTime(tr.duration)}</span>
        {#if i !== player.index}
          <button class="icon-btn x" aria-label={t('queue.remove', { title: tr.title })} onclick={() => player.removeAt(i)}><Icon name="close" size={15} /></button>
        {/if}
      </li>
    {/each}
  </ol>
{/if}

<style>
  .head { margin-bottom: 8px; }
  .small { font-size: 12.5px; }
  .q { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  li { position: relative; display: flex; align-items: center; gap: 10px; padding: 6px 6px; border-radius: 9px; border-top: 2px solid transparent; }
  li:hover { background: var(--bg-raise); }
  li.cur { background: var(--accent-wash); }
  li.cur .t { color: var(--accent); }
  li.past { opacity: 0.5; }
  li.over { border-top-color: var(--accent); }
  .hit { position: absolute; inset: 0; }
  li > :not(.hit) { position: relative; pointer-events: none; }
  li > .x { pointer-events: auto; width: 28px; height: 28px; }
  .grip { color: var(--text-3); font-size: 10px; letter-spacing: -2px; cursor: grab; }
  .meta { display: grid; min-width: 0; }
  .t { font-weight: 550; font-size: 13.5px; }
  .a { font-size: 12px; color: var(--text-2); }
</style>
