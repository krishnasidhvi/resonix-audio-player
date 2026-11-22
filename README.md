# Resonix

An open music player for the web and desktop. It plays **your own music files** plus **openly licensed music** from public sources, with on-device analysis, synced lyrics and a raga clock.

No account, no server, no tracking. Everything you do stays in your browser.

## Where the music comes from

| Source | What it offers | Licence handling |
|---|---|---|
| Your files | MP3, FLAC, M4A/AAC, Ogg, Opus, WAV from a folder or drag-and-drop | Files never leave the device |
| [Audius](https://audius.co) | Full tracks uploaded by independent artists | Streamed through Audius's public API, which is how artists choose to share them |
| [Internet Archive](https://archive.org/details/audio) | Concerts, 78s, classical, Hindustani & Carnatic recordings, netlabels | **Only** items declaring a Creative Commons or public-domain licence are searched or played |
| [Openverse](https://openverse.org) | CC music indexed from Jamendo, Wikimedia Commons, ccMixter and more | Licence shown per track, linked to its terms |
| [Jamendo](https://www.jamendo.com) (optional) | 600k+ CC tracks | Needs a free client ID in Settings |
| [Radio Browser](https://www.radio-browser.info) | Tens of thousands of live stations | Live broadcast; HTTPS streams only |
| [LRCLIB](https://lrclib.net) | Synced lyrics | Open community database |

Every track shows its source and licence and links back to the original page. If you reuse CC music elsewhere, credit the artist as the licence requires.

## Features

- **Smart scrubber:** waveform shaded by loudness, a marker that jumps to the loudest section, and the A–B loop drawn on top.
- **On-device analysis:** tempo, musical key (with Camelot code), integrated loudness (ITU-R BS.1770) and energy, computed in a Web Worker. Nothing is uploaded.
- **Loudness matching:** analysed tracks are levelled to −14 LUFS.
- **Mixes well next:** suggests analysed tracks in a compatible key and within ±6% tempo.
- **Journey:** draw a line across a tempo × energy map and the queue follows it.
- **Raga clock:** a 24-hour dial of Hindustani prahars and Carnatic associations that plays openly licensed recordings of the ragas for the current hour.
- **Synced lyrics** with word timing, tap-to-seek and a timing nudge, plus one-tap **Latin transliteration** for Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Gurmukhi and Odia.
- **Sound:** 10-band EQ with a live response curve and presets, a **hearing check** that builds a personal compensation curve, headphone **crossfeed**, crossfade or gapless playback.
- **Practice mode:** tempo from 0.5× to 1.5× with pitch kept, A–B looping.
- **Signal path:** shows every stage the audio passes through, including when a host blocks processing (no CORS) and the stream plays untouched.
- **Ambient mode:** full-screen artwork, visualizer and large lyrics.
- **Seven languages:** English, Deutsch, Français, Español, 日本語, 简体中文 and العربية, with full right-to-left layout for Arabic. The first language comes from the browser and can be changed in the sidebar, Settings or the command palette. Each language loads only when chosen.
- Sleep timer (fade out, or stop after the current track), command palette (`Ctrl/⌘ K`), keyboard shortcuts, listening stats kept on the device, playlists with `.m3u8` export, JSON backup, installable PWA, and the accent colour follows the artwork.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # svelte-check (TypeScript)
npm test         # unit tests: analysis DSP, LRC parsing, transliteration, translation completeness
npm run build    # static site in dist/
```

Stack: Svelte 5 + TypeScript + Vite. No runtime dependencies. All sources are called directly from the browser (each sends CORS headers), so `dist/` can be hosted on any static host.

Optional: set `VITE_JAMENDO_CLIENT_ID` at build time to enable Jamendo for every visitor.

### Desktop (Tauri 2)

```bash
npm run tauri dev
npm run tauri build
```

The desktop app is a thin shell around the same web app. Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds the Windows installer.

## Layout

```
src/
  lib/
    audio/      engine.ts (Web Audio graph), analysis-core.ts (DSP), analysis.worker.ts
    sources/    audius, archive, openverse, jamendo, radio, local (+ unified search)
    lyrics/     lrc parser, LRCLIB client, Indic transliteration
    stores/     player, library, settings, ui (Svelte runes)
    raga.ts     raga time theory data
  components/   player bar, scrubber, side panel, overlays
  i18n/         en.ts (source strings), locales/*.ts, labels.ts
  views/        Home, Search, Library, Album, Playlist, Radio, Raga clock, Journey, Stats, Settings
tests/          node:test unit tests
src-tauri/      desktop shell
```

## License

MIT
