<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import Artwork from './Artwork.svelte';
  import Icon from './Icon.svelte';

  let { title, subtitle, artwork, seed, href, onplay, round = false, badge }: {
    title: string; subtitle?: string; artwork?: string; seed: string; href?: string;
    onplay?: () => void; round?: boolean; badge?: string;
  } = $props();
</script>

<div class="card">
  <div class="cover">
    <Artwork src={artwork} {seed} radius={round ? '50%' : 'var(--radius)'} />
    {#if badge}<span class="badge">{badge}</span>{/if}
    {#if onplay}
      <button class="play" aria-label={t('common.playItem', { title })} onclick={(e) => { e.preventDefault(); e.stopPropagation(); onplay(); }}><Icon name="play" size={20} /></button>
    {/if}
  </div>
  {#if href}
    <a class="title ellipsis" {href} dir="auto">{title}</a>
  {:else}
    <button class="title ellipsis" onclick={onplay}>{title}</button>
  {/if}
  {#if subtitle}<div class="sub ellipsis" dir="auto">{subtitle}</div>{/if}
</div>

<style>
  .card { position: relative; display: grid; gap: 4px; min-width: 0; width: 100%; }
  :global(.scroll-x) > .card { width: 176px; }
  .cover { position: relative; margin-bottom: 8px; transition: transform 0.25s var(--ease); }
  .card:hover .cover { transform: translateY(-3px); }
  .title { font-weight: 600; text-decoration: none; text-align: start; display: block; }
  .title::after { content: ''; position: absolute; inset: 0; }
  .sub { color: var(--text-2); font-size: 13px; }
  .play {
    position: absolute; inset-inline-end: 10px; bottom: 10px; z-index: 2; width: 44px; height: 44px; border-radius: 50%;
    display: grid; place-items: center; background: var(--accent); color: var(--accent-ink);
    box-shadow: 0 8px 22px rgb(0 0 0 / 0.45); opacity: 0; transform: translateY(6px) scale(0.92);
    transition: all 0.2s var(--ease);
  }
  .card:hover .play, .play:focus-visible { opacity: 1; transform: none; }
  .badge { position: absolute; inset-inline-start: 8px; top: 8px; z-index: 1; font-size: 10.5px; font-weight: 650; letter-spacing: 0.04em; padding: 3px 7px; border-radius: 6px; background: rgb(0 0 0 / 0.6); backdrop-filter: blur(6px); }
  @media (hover: none) { .play { opacity: 1; transform: none; } }
</style>
