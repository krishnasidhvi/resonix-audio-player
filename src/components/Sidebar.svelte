<script lang="ts">
  import { focusScope } from '../lib/a11y';
  import { ui } from '../lib/stores/ui.svelte';
  import { library } from '../lib/stores/library.svelte';
  import { i18n, LOCALES, t, type Key } from '../lib/i18n/i18n.svelte';
  import Icon, { type IconName } from './Icon.svelte';

  const nav: { hash: string; route: string; label: Key; icon: IconName }[] = [
    { hash: '#/', route: 'home', label: 'nav.home', icon: 'home' },
    { hash: '#/search', route: 'search', label: 'nav.search', icon: 'search' },
    { hash: '#/library', route: 'library', label: 'nav.library', icon: 'library' },
    { hash: '#/radio', route: 'radio', label: 'nav.radio', icon: 'radio' },
    { hash: '#/youtube', route: 'youtube', label: 'nav.youtube', icon: 'video' },
    { hash: '#/server', route: 'server', label: 'srv.nav', icon: 'server' },
  ];
  const discover: { hash: string; route: string; label: Key; icon: IconName }[] = [
    { hash: '#/raga', route: 'raga', label: 'nav.raga', icon: 'sun' },
    { hash: '#/journey', route: 'journey', label: 'nav.journey', icon: 'path' },
    { hash: '#/stats', route: 'stats', label: 'nav.stats', icon: 'chart' },
  ];
  function newPlaylist() {
    const name = prompt(t('playlist.namePrompt'), t('playlist.defaultName'));
    if (name) { const p = library.createPlaylist(name); ui.go(`#/playlist/${p.id}`); }
  }

  let langOpen = $state(false);
  let langRoot: HTMLDivElement | undefined = $state();
  const current = $derived(LOCALES.find((l) => l.code === i18n.locale)!);
  $effect(() => {
    if (!langOpen) return;
    const close = (e: PointerEvent) => { if (!langRoot?.contains(e.target as Node)) langOpen = false; };
    addEventListener('pointerdown', close, true);
    return () => removeEventListener('pointerdown', close, true);
  });
</script>

<nav class="side" aria-label={t('nav.main')}>
  <a class="brand" href="#/" aria-label={t('nav.homeAria')}>
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" stroke-width="2.2"/><path d="M9 16h2.5l2-6 3 12 2.5-9 1.5 3H23" fill="none" stroke="var(--text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="display">Resonix</span>
  </a>

  <button class="search-trigger" onclick={() => (ui.palette = true)}>
    <Icon name="search" size={16} /><span class="grow ellipsis">{t('nav.searchOrJump')}</span><kbd>Ctrl K</kbd>
  </button>

  <ul>
    {#each nav as n}
      <li><a href={n.hash} class:active={ui.route.name === n.route} aria-current={ui.route.name === n.route ? 'page' : undefined} title={t(n.label)}><Icon name={n.icon} size={19} /><span class="ellipsis">{t(n.label)}</span></a></li>
    {/each}
  </ul>
  <p class="eyebrow group">{t('nav.discover')}</p>
  <ul>
    {#each discover as n}
      <li><a href={n.hash} class:active={ui.route.name === n.route} aria-current={ui.route.name === n.route ? 'page' : undefined} title={t(n.label)}><Icon name={n.icon} size={19} /><span class="ellipsis">{t(n.label)}</span></a></li>
    {/each}
  </ul>

  <div class="group row"><p class="eyebrow grow">{t('nav.playlists')}</p><button class="icon-btn small" aria-label={t('nav.newPlaylist')} onclick={newPlaylist}><Icon name="plus" size={16} /></button></div>
  <ul class="pls">
    <li><a href="#/library/favorites" class:active={ui.route.name === 'library' && ui.route.tab === 'favorites'}><span class="heart"><Icon name="heart" size={14} fill /></span><span class="ellipsis">{t('nav.favourites')}</span><span class="faint num">{library.favorites.length}</span></a></li>
    {#each library.playlists as p (p.id)}
      <li><a href="#/playlist/{p.id}" class:active={ui.route.name === 'playlist' && ui.route.id === p.id}><span class="pl-dot"></span><span class="ellipsis" dir="auto">{p.name}</span><span class="faint num">{p.tracks.length}</span></a></li>
    {/each}
  </ul>

  <div class="foot">
    <a class="settings" href="#/settings" class:active={ui.route.name === 'settings'} title={t('nav.settings')}><Icon name="settings" size={18} /><span class="ellipsis">{t('nav.settings')}</span></a>
    <div class="lang" bind:this={langRoot}>
      <button class="lang-btn" aria-label="{t('lang.label')}: {current.name}" aria-expanded={langOpen} aria-haspopup="menu" onclick={() => (langOpen = !langOpen)}>
        <Icon name="globe" size={18} /><span class="ellipsis">{current.name}</span>
      </button>
      {#if langOpen}
        <div class="lang-menu surface" role="menu" aria-label={t('lang.label')} use:focusScope={{ menu: true, onClose: () => (langOpen = false) }}>
          {#each LOCALES as l}
            <button role="menuitemradio" aria-checked={l.code === i18n.locale} lang={l.code} dir={l.rtl ? 'rtl' : 'ltr'} class:on={l.code === i18n.locale}
              onclick={() => { langOpen = false; void i18n.set(l.code); }}>{l.name}</button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</nav>

<style>
  .side { grid-area: side; display: flex; flex-direction: column; gap: 4px; padding: 18px 12px 12px; background: var(--bg-sunk); border-inline-end: 1px solid var(--line-soft); overflow-y: auto; min-height: 0; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 4px 10px 16px; text-decoration: none; font-size: 21px; }
  .search-trigger { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 10px; margin: 0 2px 10px; border-radius: 10px; background: var(--bg-raise); border: 1px solid var(--line-soft); color: var(--text-3); font-size: 13px; text-align: start; }
  .search-trigger:hover { border-color: var(--line); color: var(--text-2); }
  kbd { font: 10.5px var(--font-ui); padding: 1px 5px; border: 1px solid var(--line); border-radius: 4px; direction: ltr; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
  a, .lang-btn { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 9px; color: var(--text-2); text-decoration: none; font-weight: 550; min-width: 0; }
  a:hover, .lang-btn:hover { color: var(--text); background: var(--bg-raise); }
  a.active { color: var(--text); background: var(--bg-raise); }
  a.active :global(svg) { color: var(--accent); }
  .group { margin: 18px 10px 4px; }
  .group .eyebrow { margin: 0; }
  p.group { margin: 18px 10px 4px; }
  .icon-btn.small { width: 26px; height: 26px; }
  .pls a { font-size: 13.5px; padding: 6px 10px; gap: 10px; }
  .pls a .ellipsis { flex: 1; }
  .heart { color: var(--accent); display: grid; }
  .pl-dot { width: 14px; height: 14px; border-radius: 4px; background: linear-gradient(135deg, var(--accent), oklch(50% 0.1 calc(var(--h) + 60))); flex: none; }
  .foot { margin-top: auto; display: grid; gap: 1px; }
  .lang { position: relative; }
  .lang-btn { width: 100%; font-size: 13.5px; }
  .lang-menu { position: absolute; bottom: calc(100% + 6px); inset-inline-start: 0; z-index: 50; min-width: 180px; padding: 6px; display: grid; box-shadow: 0 18px 50px rgb(0 0 0 / 0.5); }
  .lang-menu button { text-align: start; padding: 8px 12px; border-radius: 7px; font-size: 14px; }
  .lang-menu button:hover { background: oklch(25% 0.015 var(--h)); }
  .lang-menu button.on { color: var(--accent); font-weight: 650; }
  @media (max-width: 1100px) {
    .side { padding: 14px 8px; align-items: center; }
    .brand span, a span, .lang-btn span, .search-trigger span, .search-trigger kbd, .group, .pls, p.group { display: none; }
    .search-trigger { width: 40px; justify-content: center; padding: 0; }
  }
  @media (max-width: 720px) {
    .side { flex-direction: row; padding: 4px 8px; border: 0; border-top: 1px solid var(--line-soft); justify-content: space-around; overflow: visible; }
    .brand, .search-trigger, .lang { display: none; }
    .foot { margin: 0; }
    ul { display: flex; gap: 0; }
    /* phones: keep the bottom bar to the essentials */
    ul:nth-of-type(2) li:nth-child(2), ul:nth-of-type(2) li:nth-child(3) { display: none; }
  }
</style>
