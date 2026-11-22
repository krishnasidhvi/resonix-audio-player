<script lang="ts">
  import { hash } from '../lib/util';

  let { src, seed, size = '100%', radius = 'var(--radius-s)', alt = '' }: {
    src?: string; seed: string; size?: string; radius?: string; alt?: string;
  } = $props();

  let failed = $state(false);
  $effect(() => { void src; failed = false; });

  // Generated cover: two hues from the seed, a soft orb and concentric arcs.
  const h = $derived(hash(seed));
  const h1 = $derived(h % 360);
  const h2 = $derived((h1 + 40 + ((h >> 9) % 100)) % 360);
  const cx = $derived(25 + ((h >> 4) % 50));
  const cy = $derived(25 + ((h >> 12) % 50));
  const rings = $derived(3 + ((h >> 20) % 4));
</script>

<div class="art" style:width={size} style:border-radius={radius}>
  {#if src && !failed}
    <img {src} {alt} loading="lazy" decoding="async" onerror={() => (failed = true)} />
  {:else}
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="g{h}" cx="{cx}%" cy="{cy}%" r="75%">
          <stop offset="0" stop-color="oklch(72% 0.15 {h1})" />
          <stop offset="1" stop-color="oklch(26% 0.07 {h2})" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#g{h})" />
      {#each Array(rings) as _, i}
        <circle cx={cx} cy={cy} r={14 + i * 13} fill="none" stroke="oklch(95% 0.03 {h1} / {0.22 - i * 0.03})" stroke-width="0.7" />
      {/each}
    </svg>
  {/if}
</div>

<style>
  .art { aspect-ratio: 1; overflow: hidden; background: var(--bg-raise); flex: none; position: relative; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.05); }
  img, svg { width: 100%; height: 100%; object-fit: cover; display: block; }
</style>
