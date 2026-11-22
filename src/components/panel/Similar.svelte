<script lang="ts">
  import { player } from '../../lib/stores/player.svelte';
  import { library } from '../../lib/stores/library.svelte';
  import { similarTo, type Rec } from '../../lib/recommend';
  import { t, type Key } from '../../lib/i18n/i18n.svelte';
  import Artwork from '../Artwork.svelte';
  import Icon from '../Icon.svelte';

  let recs: Rec[] = $state([]);
  let loading = $state(false);
  let radioBusy = $state(false);

  $effect(() => {
    const cur = player.current;
    recs = [];
    if (!cur) return;
    loading = true;
    let cancelled = false;
    // small delay so skipping through tracks doesn't fire a burst of requests
    const timer = setTimeout(() => {
      similarTo($state.snapshot(cur) as typeof cur, library.local, new Set([cur.id]), 8)
        .then((r) => { if (!cancelled) recs = r; })
        .catch(() => {})
        .finally(() => { if (!cancelled) loading = false; });
    }, 600);
    return () => { cancelled = true; clearTimeout(timer); };
  });

  function playNow(r: Rec) { player.playNext(r.track); player.next(); }
  async function radio() { radioBusy = true; try { await player.startRadio(); } catch { /* toast shown by player */ } finally { radioBusy = false; } }
</script>

<section class="similar">
  <div class="head row">
    <h3 class="eyebrow grow">{t('rec.title')}</h3>
    {#if player.current && !player.current.isLive}
      <button class="btn small" onclick={radio} disabled={radioBusy}><Icon name="live" size={15} /> {t('rec.startRadio')}</button>
    {/if}
  </div>
  {#if loading}
    {#each Array(4) as _}<div class="skeleton" style="height:44px;margin:4px 0"></div>{/each}
  {:else if !recs.length}
    <p class="faint note">{t('rec.none')}</p>
  {:else}
    <ul>
      {#each recs as r (r.track.id)}
        <li>
          <button class="hit" aria-label={t('common.playItem', { title: r.track.title })} onclick={() => playNow(r)}></button>
          <Artwork src={r.track.artwork} seed={r.track.artist + r.track.title} size="38px" radius="6px" />
          <span class="meta">
            <span class="ellipsis title" dir="auto">{r.track.title}</span>
            <span class="ellipsis sub" dir="auto">{r.track.artist}</span>
          </span>
          <span class="tag">{t(`rec.reason.${r.reason}` as Key)}</span>
          <button class="icon-btn add" aria-label={t('track.playNext')} title={t('track.playNext')} onclick={() => player.playNext(r.track)}><Icon name="plus" size={16} /></button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .head { margin-bottom: 8px; }
  .head h3 { margin: 0; }
  .note { font-size: 12.5px; margin: 0; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  li { position: relative; display: flex; align-items: center; gap: 10px; padding: 5px 6px; border-radius: 9px; }
  li:hover { background: var(--bg-raise); }
  .hit { position: absolute; inset: 0; border-radius: inherit; }
  li > :not(.hit) { position: relative; pointer-events: none; }
  li > .add { pointer-events: auto; width: 30px; height: 30px; }
  .meta { flex: 1; min-width: 0; display: grid; }
  .title { font-weight: 550; font-size: 13.5px; }
  .sub { font-size: 12px; color: var(--text-2); }
  .tag { font-size: 11px; }
</style>
