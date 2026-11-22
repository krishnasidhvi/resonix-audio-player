<script lang="ts" module>
  // 24×24 stroke icons, drawn for this app.
  export const ICONS = {
    play: 'M7 4.5v15l12-7.5z',
    pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
    next: 'M5 5l10 7-10 7zM18 5v14',
    prev: 'M19 5L9 12l10 7zM6 5v14',
    shuffle: 'M3 7h3.5c3 0 4.5 10 7.5 10H21M3 17h3.5c1.4 0 2.4-2 3.3-4.4M14 7h7M18 4l3 3-3 3M18 14l3 3-3 3',
    repeat: 'M4 11V9a3 3 0 013-3h12M16 3l3 3-3 3M20 13v2a3 3 0 01-3 3H5M8 21l-3-3 3-3',
    volume: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11',
    mute: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5',
    heart: 'M12 20s-7.5-4.6-9-9.3C1.8 6.8 5.2 3.6 8.4 4.6c1.6.5 2.8 1.7 3.6 3 .8-1.3 2-2.5 3.6-3 3.2-1 6.6 2.2 5.4 6.1C19.5 15.4 12 20 12 20z',
    home: 'M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z',
    search: 'M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L20 20',
    library: 'M5 4v16M9.5 4v16M14 4.5l4.5 15',
    radio: 'M4 9h16v11H4zM7 9l10-5M8.5 14.5a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M15 13h2M15 16h2',
    sun: 'M12 8a4 4 0 110 8 4 4 0 010-8zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
    path: 'M4 18c3-8 6 2 9-6s5-6 7-8M4 18a1.5 1.5 0 100 .1M20 4a1.5 1.5 0 100 .1',
    chart: 'M5 20V11M10 20V5M15 20v-7M20 20V9',
    settings: 'M12 9a3 3 0 110 6 3 3 0 010-6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
    eq: 'M5 4v6M5 14v6M12 4v2M12 10v10M19 4v9M19 17v3M3 12h4M10 8h4M17 15h4',
    lyrics: 'M4 6h16M4 10h11M4 14h16M4 18h8',
    queue: 'M4 6h12M4 11h12M4 16h7M15 15v5l4.5-2.5z',
    signal: 'M3 12h3l2-6 4 12 3-9 2 3h4',
    moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
    metronome: 'M9 3h6l3.5 18h-13zM12 16l4-9M7.5 14h9',
    expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    close: 'M6 6l12 12M18 6L6 18',
    plus: 'M12 5v14M5 12h14',
    more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
    folder: 'M3 6.5A1.5 1.5 0 014.5 5H9l2 2.5h8.5A1.5 1.5 0 0121 9v9.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5z',
    upload: 'M12 16V4M7 9l5-5 5 5M4 16v3.5h16V16',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
    ear: 'M7 9a5 5 0 0110 0c0 3-3 4-3 7a3 3 0 01-6 0M10 9a2 2 0 014 0',
    wave: 'M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h-2',
    panel: 'M3 5h18v14H3zM15 5v14',
    command: 'M9 6a3 3 0 10-3 3h12a3 3 0 10-3-3v12a3 3 0 103-3H6a3 3 0 103 3z',
    target: 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 8a4 4 0 110 8 4 4 0 010-8zM12 11.5v1',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
    live: 'M12 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 000 13M18.5 5.5a9 9 0 010 13',
    video: 'M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5zM10 9.2v5.6l4.8-2.8z',
    pip: 'M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5zM12.5 12h6v4.5h-6z',
    server: 'M4 4.5h16v6H4zM4 13.5h16v6H4zM7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5',
    download: 'M12 4v11M7 10.5l5 5 5-5M5 19.5h14',
    globe: 'M12 3a9 9 0 110 18 9 9 0 010-18zM3.5 9h17M3.5 15h17M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9M12 3c-2.4 2.6-3.6 5.6-3.6 9s1.2 6.4 3.6 9',
  } as const;
  export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
  let { name, size = 20, fill = false, label }: { name: IconName; size?: number; fill?: boolean; label?: string } = $props();
  const filled = $derived(fill || name === 'play' || name === 'pause' || name === 'next' || name === 'prev');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? 'currentColor' : 'none'}
  stroke="currentColor"
  stroke-width={filled ? 0 : 1.7}
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
><path d={ICONS[name]} /></svg>
