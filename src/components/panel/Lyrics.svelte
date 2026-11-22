<script lang="ts">
  import { t as tt } from '../../lib/i18n/i18n.svelte';
  import { player } from '../../lib/stores/player.svelte';
  import { settings } from '../../lib/stores/settings.svelte';
  import { fetchLyrics, type Lyrics } from '../../lib/lyrics/lrclib';
  import { activeLine } from '../../lib/lyrics/lrc';
  import { hasIndicScript, transliterate } from '../../lib/lyrics/translit';

  let { big = false }: { big?: boolean } = $props();

  let lyrics = $state<Lyrics | null>(null);
  let loading = $state(false);
  let offset = $state(0);
  let scroller: HTMLDivElement | undefined = $state();
  let userScrolled = $state(false);
  let scrollTimer = 0;

  $effect(() => {
    const t = player.current;
    lyrics = null;
    offset = 0;
    if (!t) return;
    loading = true;
    let cancelled = false;
    fetchLyrics(t).then((l) => { if (!cancelled) { lyrics = l; loading = false; } });
    return () => { cancelled = true; };
  });

  const indic = $derived(!!lyrics && hasIndicScript(lyrics.synced ? lyrics.lines.map((l) => l.text).join(' ') : lyrics.plain ?? ''));
  const show = (s: string) => (indic && settings.transliterate ? transliterate(s) : s);
  const now = $derived(player.time + offset);
  const idx = $derived(lyrics?.synced ? activeLine(lyrics.lines, now) : -1);

  $effect(() => {
    if (idx < 0 || !scroller || userScrolled) return;
    const el = scroller.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    if (el) scroller.scrollTo({ top: el.offsetTop - scroller.clientHeight * 0.38, behavior: settings.reduceMotion ? 'auto' : 'smooth' });
  });

  function onWheel() {
    userScrolled = true;
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => (userScrolled = false), 4000);
  }

  function wordProgress(i: number, wi: number): number {
    const line = lyrics!.lines[i];
    const w = line.words!;
    const start = w[wi].t, end = w[wi + 1]?.t ?? lyrics!.lines[i + 1]?.t ?? start + 0.6;
    return Math.min(1, Math.max(0, (now - start) / (end - start)));
  }
</script>

<div class="lyrics" class:big>
  {#if !player.current}
    <p class="faint pad">{tt('lyrics.idle')}</p>
  {:else if loading}
    <div class="pad">{#each Array(6) as _, i}<div class="skeleton" style:height="22px" style:width="{60 + ((i * 37) % 35)}%" style:margin="14px 0"></div>{/each}</div>
  {:else if !lyrics}
    {@const parts = tt('lyrics.contribute').split('{link}')}
    <div class="pad">
      <p class="muted">{tt('lyrics.none')}</p>
      <p class="faint small">{parts[0]}<a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>{parts[1] ?? ''}</p>
    </div>
  {:else if lyrics.instrumental}
    <p class="pad muted">{tt('lyrics.instrumental')}</p>
  {:else}
    <div class="tools row">
      {#if lyrics.synced}
        <span class="faint small">{tt('lyrics.timing')}</span>
        <button class="chip" onclick={() => (offset -= 0.5)} aria-label={tt('lyrics.earlier')}>−0.5s</button>
        <span class="small num">{offset > 0 ? '+' : ''}{offset.toFixed(1)}s</span>
        <button class="chip" onclick={() => (offset += 0.5)} aria-label={tt('lyrics.later')}>+0.5s</button>
      {:else}<span class="faint small">{tt('lyrics.notSynced')}</span>{/if}
      <span class="grow"></span>
      {#if indic}
        <button class="chip" class:active={settings.transliterate} aria-pressed={settings.transliterate} onclick={() => (settings.transliterate = !settings.transliterate)}>{tt('lyrics.latin')}</button>
      {/if}
    </div>
    <div class="scroller" role="region" aria-label={tt('panel.lyrics')} bind:this={scroller} onwheel={onWheel} ontouchmove={onWheel}>
      {#if lyrics.synced}
        {#each lyrics.lines as line, i (i)}
          <button
            class="line"
            class:active={i === idx}
            class:past={i < idx}
            data-i={i}
            dir="auto"
            onclick={() => player.seek(line.t - offset + 0.01)}
          >
            {#if line.words && i === idx}
              {#each line.words as w, wi}<span class="w" style:--p={wordProgress(i, wi)}>{show(w.text)}</span>{/each}
            {:else}
              {show(line.text) || '♪'}
            {/if}
          </button>
        {/each}
      {:else}
        <pre class="plain" dir="auto">{show(lyrics.plain ?? '')}</pre>
      {/if}
      <p class="credit faint small">{tt('lyrics.via')}</p>
    </div>
  {/if}
</div>

<style>
  .lyrics { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .pad { padding: 8px 2px; }
  .small { font-size: 12.5px; }
  .small a { color: var(--accent); }
  .tools { gap: 6px; padding: 0 0 10px; }
  .tools .chip { height: 26px; padding: 0 9px; font-size: 12px; }
  .scroller { overflow-y: auto; flex: 1; min-height: 0; padding: 20% 0 40%; mask-image: linear-gradient(transparent, #000 12%, #000 80%, transparent); }
  .line {
    display: block; width: 100%; text-align: start; padding: 6px 0; font-size: 21px; font-weight: 650; line-height: 1.3;
    color: var(--text-3); transition: color 0.3s, transform 0.3s var(--ease), opacity 0.3s; transform-origin: left center;
  }
  .line:hover { color: var(--text-2); }
  :global([dir='rtl']) .line { transform-origin: right center; }
  .line.past { opacity: 0.55; }
  .line.active { color: var(--text); transform: scale(1.03); }
  .w {
    background: linear-gradient(90deg, var(--text) calc(var(--p) * 100%), var(--text-3) calc(var(--p) * 100%));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .big .line { font-size: clamp(26px, 3.4vw, 44px); padding: 10px 0; }
  .big .line.active { color: #fff; }
  .plain { white-space: pre-wrap; font: 16px/1.7 var(--font-ui); color: var(--text-2); margin: 0; }
  .credit { margin-top: 24px; }
</style>
