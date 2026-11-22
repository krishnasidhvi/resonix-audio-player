# Resonix

[![Latest release](https://img.shields.io/github/v/release/krishnasidhvi/resonix-audio-player)](https://github.com/krishnasidhvi/resonix-audio-player/releases/latest)

An open music player for the web and desktop. It plays **your own music files**, **your own music server** and **openly licensed music** from public sources, with on-device analysis, synced lyrics, offline listening and a raga clock.

No account, no server, no tracking. Everything you do stays on your device.

## Get Resonix

- **Windows app:** [download the latest release](https://github.com/krishnasidhvi/resonix-audio-player/releases/latest) and run `Resonix_…_x64-setup.exe`. The installer isn't code-signed, so Windows SmartScreen may warn you. Choose **More info**, then **Run anyway**.
- **Web:** use it in the browser at [krishnasidhvi.github.io/resonix-audio-player](https://krishnasidhvi.github.io/resonix-audio-player/). It can also be installed as an app from the browser.

## Where the music comes from

| Source | What it offers | Licence handling |
|---|---|---|
| Your files | MP3, FLAC, M4A/AAC, Ogg, Opus, WAV from a folder or drag-and-drop | Files never leave the device |
| Your server | Navidrome / Subsonic-compatible servers and Jellyfin | Streams straight from your server to Resonix |
| [Audius](https://audius.co) | Full tracks uploaded by independent artists | Streamed through Audius's public API, which is how artists choose to share them |
| [Internet Archive](https://archive.org/details/audio) | Concerts, 78s, classical, Hindustani & Carnatic recordings, netlabels | **Only** items declaring a Creative Commons or public-domain licence are searched or played |
| [Openverse](https://openverse.org) | CC music indexed from Jamendo, Wikimedia Commons, ccMixter and more | Licence shown per track, linked to its terms |
| [Jamendo](https://www.jamendo.com) (optional) | 600k+ CC tracks | Needs a free client ID in Settings |
| [Radio Browser](https://www.radio-browser.info) | Tens of thousands of live stations | Live broadcast; HTTPS streams only |
| [YouTube](https://www.youtube.com) | Official uploads by labels and artists: most Telugu, Hindi and English songs | Played only in YouTube's own embedded player, which stays visible (at least 200×200 px) with YouTube's controls and ads. Audio is never separated, downloaded or processed. Paste any YouTube / YouTube Music song, album or playlist link; search needs the user's own free API key (100 searches a day) |
| [LRCLIB](https://lrclib.net) | Synced lyrics | Open community database; the desktop app can also publish to it |

Every track shows its source and licence and links back to the original page. If you reuse CC music elsewhere, credit the artist as the licence requires.

## Features

- **Smart scrubber:** waveform shaded by loudness, a marker that jumps to the loudest section, and the A–B loop drawn on top.
- **On-device analysis:** tempo, musical key (with Camelot code), integrated loudness (ITU-R BS.1770) and energy, computed in a Web Worker. Nothing is uploaded.
- **Loudness matching:** analysed tracks are levelled to −14 LUFS.
- **Mixes well next:** suggests analysed tracks in a compatible key and within ±6% tempo.
- **Journey:** draw a line across a tempo × energy map and the queue follows it.
- **Similar to this:** recommendations for the playing track from the same artist, related artists (Audius), the same genre and tags, matching radio stations and, where both tracks are analysed, similar measured sound. Each one says why it was picked. **Start radio** queues them, and Resonix can keep playing similar music when the queue ends.
- **Cinematic background:** a looping WebGL scene behind the app that follows the music. **Liquid** colour fields drift on looping paths, **Waves** are silk ribbons that swell with the bass and flare on each beat, and **Aurora** is light curtains waving across the sky. By default Resonix picks one from the track's energy, tempo and genre, or you choose. Major/minor key shifts the colour temperature and the palette comes from the artwork. Off / subtle / vivid. It respects reduced motion; if your system asks apps to reduce motion (for example Windows with animations turned off), Settings can keep just the background moving.
- **Open in YouTube Music / Spotify:** plain search links from any track to those services.
- **Your music server:** connect Navidrome (or any Subsonic-compatible server) or Jellyfin and stream your own collection with every Resonix feature. Only a salted token (Subsonic) or session token (Jellyfin) is kept, on this device. The web app needs the server on HTTPS; the desktop app also reaches plain `http://` servers on your home network.
- **Offline listening:** save openly licensed Internet Archive and Openverse tracks on the device, one at a time or a whole album or playlist with **Save all for offline**. Each saved track keeps its cover art and lyrics. With no connection, a banner says so, tracks that aren't saved are dimmed, playback goes straight to saved tracks, and Resonix opens on your saved music. The web app itself (every language included) is cached on the first visit, so it opens offline too.
- **Harmonic order:** reorder the queue so each track flows into the next by key (Camelot wheel) and tempo, using the on-device analysis.
- **Lyrics editor:** tap along to sync lyrics line by line, keep them on this device, and download the `.lrc` file. In the desktop app, **Publish to LRCLIB** shares them with the open lyrics database. (LRCLIB doesn't accept submissions from web pages; on the web, publish with its LRCGET app.)
- **Headphone correction:** pick your headphone model and Resonix applies its correction curve from the open-source [AutoEq](https://github.com/jaakkopasanen/AutoEq) measurements (MIT). The EQ uses the same 10 peaking bands as AutoEq, so profiles map one to one.
- **Pop-out mini player:** a small always-on-top window with artwork and controls (Chrome and Edge, via Document Picture-in-Picture).
- **Your daily mix and "Because you played…":** personal Home rows built from your own favourites, recent plays and the recommender, refreshed daily.
- **Picks up where you left off:** the queue, track, position, shuffle and repeat are kept on the device, so after a reload or restart the player is ready, paused, at the same place.
- **Phone layout:** a slim mini player that opens a full-screen player with lyrics and queue.
- **Live hits radio:** Telugu, Bollywood, Hindi, Tamil, English Top 40 and English pop shelves, ranked by listener votes, showing only stations that were last seen online.
- **Raga clock:** a 24-hour dial of Hindustani prahars and Carnatic associations that plays openly licensed recordings of the ragas for the current hour.
- **Synced lyrics** with word timing, tap-to-seek and a timing nudge, plus one-tap **Latin transliteration** for Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Gurmukhi and Odia.
- **Sound:** 10-band EQ with a live response curve and presets, a **hearing check** that builds a personal compensation curve, headphone **crossfeed**, crossfade or gapless playback.
- **Practice mode:** tempo from 0.5× to 1.5× with pitch kept, A–B looping.
- **Signal path:** shows every stage the audio passes through, including when a host blocks processing (no CORS) and the stream plays untouched.
- **Ambient mode:** full-screen artwork, visualizer and large lyrics.
- **Ten languages:** English, Deutsch, Français, Español, 日本語, 简体中文, العربية, हिन्दी, తెలుగు and தமிழ், with full right-to-left layout for Arabic. The first language comes from the browser and can be changed in the sidebar, Settings or the command palette. Each language loads only when chosen.
- Sleep timer (fade out, or stop after the current track), command palette (`Ctrl/⌘ K`), keyboard shortcuts, listening stats kept on the device, playlists with `.m3u8` export, JSON backup, installable PWA, and the accent colour follows the artwork.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # svelte-check (TypeScript)
npm test         # unit tests: analysis DSP, lyrics, translations, YouTube links, AutoEq, recommendations, harmonic order
npm run build    # static site in dist/
npm run e2e      # browser tests against the build (Playwright; uses your installed Chrome)
```

The browser tests in `e2e/` cover every page opening, playing a local file, resuming after a restart, the cinematic background moving, saving an album and playing it offline, the desktop app's cover download (through a stand-in for the native bridge) and right-to-left layout. All outside requests are blocked or answered by fixtures, so they don't depend on any music source being up. The site only deploys when they pass.

Stack: Svelte 5 + TypeScript + Vite. The only runtime dependencies are Tauri's JavaScript bindings, which load only inside the desktop app. All sources are called directly from the browser (each sends CORS headers), so `dist/` can be hosted on any static host.

The build also writes `dist/precache.json`, the list of every build file; the service worker (`public/sw.js`) uses it to cache the whole app for offline use.

Optional: set `VITE_JAMENDO_CLIENT_ID` at build time to enable Jamendo for every visitor.

### Desktop (Tauri 2)

```bash
npm run tauri dev
npm run tauri build
```

The desktop app is a thin shell around the same web app. Its native side (`src-tauri/src`) adds only what a web page can't do:

- `lrclib.rs`: publishing lyrics to LRCLIB, including its proof-of-work challenge.
- `cover.rs`: keeping archive.org cover art for offline listening (archive.org serves images without CORS headers). It only fetches https images from archive.org.
- Auto-update (see below).

`.github/workflows/desktop-check.yml` compiles the desktop app and runs its Rust tests on every push that changes `src-tauri/`.

Building it locally needs the [Rust toolchain](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

#### Publishing a release

`.github/workflows/release.yml` builds the Windows installers (`.exe` and `.msi`) and publishes them as a GitHub release named `v<version>`.

1. Bump the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`. The release tag comes from `tauri.conf.json`, so an unchanged version reuses the existing release.
2. Commit and push to `master`.
3. Start the workflow from **Actions → Release Standalone Windows App → Run workflow**, or run `gh workflow run release.yml --ref master`. Pushing a `v*` tag also starts it.

The build takes about 10 minutes. The installers are not code-signed, so Windows SmartScreen warns on first run.

#### Auto-update

From v2.2.0 the desktop app checks `releases/latest/download/latest.json` a few seconds after it starts and offers to download and install a newer release. Each update is verified against the public key in `tauri.conf.json` (`plugins.updater.pubkey`).

The release workflow signs updates with the private key in the repository secret `TAURI_SIGNING_PRIVATE_KEY`. The key has no password, so `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is left unset. Keep a backup of the private key: if it's lost, installed apps can't verify any future update and everyone has to reinstall by hand.

## Layout

```
src/
  lib/
    audio/      engine.ts (Web Audio graph), analysis-core.ts (DSP), analysis.worker.ts, youtube-player.ts
    sources/    audius, archive, openverse, jamendo, radio, youtube, server (Subsonic/Jellyfin), local (+ unified search)
    lyrics/     lrc parser, LRCLIB client, Indic transliteration
    stores/     player, library, settings, ui, offline (Svelte runes)
    i18n/       en.ts (source strings), locales/*.ts, labels.ts
    recommend.ts, harmonic.ts, autoeq.ts, personal.ts, pip.ts, desktop.ts, raga.ts
  components/   player bar, scrubber, side panel, overlays
  views/        Home, Search, Library, Album, Playlist, Radio, YouTube, Server, Raga clock, Journey, Stats, Settings
public/sw.js    offline app shell
tests/          node:test unit tests
src-tauri/      desktop shell (lrclib.rs, cover.rs)
```

## License

MIT
