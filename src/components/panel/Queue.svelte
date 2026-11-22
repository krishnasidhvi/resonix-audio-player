<script lang="ts">
  import { player } from '../../lib/stores/player.svelte';
  import { library } from '../../lib/stores/library.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmtDuration, fmtTime } from '../../lib/util';
  import Artwork from '../Artwork.svelte';
  import Icon from '../Icon.svelte';

  let dragFrom: number | null = $state(null);
  let dragOver: number | null = $state(null);

  const remaining = $derived(player.queue.slice(player.index + 1).reduce((s, t) => s + (t.duration || 0), 0));

  function drop(i: number) {
    if (dragFrom !== null && dragFrom !== i) player.move(dragFrom, i);
    dragFrom = dragOver = null;
  }
  function save() {
    const name = prompt('Save queue as playlist', 'Queue ' + new Date().toLocaleDateString());
    if (name) { library.createPlaylist(name, player.queue); ui.toast(`Saved "${name}"`); }
  }
</script>

{#if !player.queue.length}
  <div class="empty"><h3>Queue is empty</h3><p>Use “Play next” or “Add to queue” from any track’s ⋯ menu.</p></div>
{:else}
  <div class="head row">
    <span class="faint small grow">{player.queue.length - player.index - 1} up next{#if remaining} · {fmtDuration(remaining)}{/if}</span>
    <button class="btn small ghost" onclick={save}>Save as playlist</button>
  </div>
  <ol class="q">
    {#each player.queue as t, i (t.id + i)}
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
        <button class="hit" aria-label="Play {t.title}" onclick={() => player.load(i)}></button>
        <span class="grip" aria-hidden="true">⋮⋮</span>
        <Artwork src={t.artwork} seed={t.artist + t.title} size="36px" radius="6px" />
        <span class="meta grow">
          <span class="ellipsis t">{t.title}</span>
          <span class="ellipsis a">{t.artist}</span>
        </span>
        <span class="num faint small">{t.isLive ? 'live' : fmtTime(t.duration)}</span>
        {#if i !== player.index}
          <button class="icon-btn x" aria-label="Remove {t.title} from queue" onclick={() => player.removeAt(i)}><Icon name="close" size={15} /></button>
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
