import { engine } from '../audio/engine';
import { youtube } from '../audio/youtube-player';
import { analyseTrack, cachedAnalysis, normalisationDb } from '../audio/analysis';
import { db } from '../db';
import { localFile } from '../sources/local';
import { radioClick } from '../sources/radio';
import type { Analysis, Track } from '../types';
import { library } from './library.svelte';
import { effectiveEq, settings } from './settings.svelte';
import { ui } from './ui.svelte';
import { t } from '../i18n/i18n.svelte';
import { similarTo } from '../recommend';
import { harmonicOrder } from '../harmonic';
import { offline } from './offline.svelte';

export type Repeat = 'off' | 'all' | 'one';
export type Sleep = { mode: 'minutes'; endsAt: number } | { mode: 'track' } | null;

/** What the transport controls talk to: our Web Audio engine, or YouTube's embedded player. */
interface Transport {
  toggle(): void; pause(): void; resume(): Promise<void>; seek(t: number): void;
  readonly currentTime: number; readonly duration: number; readonly paused: boolean; readonly buffering: boolean;
  setLoop(a: number | null, b: number | null): void; fadeOutAndPause(seconds: number, cancelled?: () => boolean): Promise<void>;
}

export interface PlayEvent { id: string; title: string; artist: string; source: string; genre?: string; at: number; seconds: number }

class Player {
  queue: Track[] = $state([]);
  index = $state(-1);
  playing = $state(false);
  time = $state(0);
  duration = $state(0);
  buffering = $state(false);
  bypassed = $state(false);
  shuffle = $state(false);
  repeat: Repeat = $state('off');
  analysis: Analysis | null = $state(null);
  /** id of the track being analysed (analysis is per track, so skipping doesn't block the next one) */
  analysingId: string | null = $state(null);
  get analysing() { return !!this.current && this.analysingId === this.current.id; }
  analysisError = $state('');
  sleep: Sleep = $state(null);
  rate = $state(1);
  loopA: number | null = $state(null);
  loopB: number | null = $state(null);
  normDb = $state(0);

  current = $derived(this.queue[this.index] ?? null);

  private objectUrl: string | null = null;
  private fading = false;
  private listened = 0;
  private lastTick = 0;
  private sleepTimer = 0;
  private loadToken = 0;
  /** loadToken of the load whose media is actually playing (durations are only learned from it). */
  private readyToken = -1;
  private failures = 0;
  private sleepFading = false;

  private get out(): Transport {
    return this.current?.source === 'youtube' ? youtube : engine;
  }

  constructor() {
    engine.on(() => this.sync());
    // while a crossfade is loading, the outgoing track's "ended" must not advance the queue again
    engine.onEnded = () => { if (this.current?.source !== 'youtube' && !this.fading) this.handleEnded(); };
    engine.onError = (msg) => { if (this.current?.source !== 'youtube' && this.readyToken === this.loadToken) this.skipAfterError(this.current, msg); };
    youtube.on(() => this.sync());
    youtube.onEnded = () => { if (this.current?.source === 'youtube') this.handleEnded(); };
    youtube.onError = (msg) => this.skipAfterError(this.current, msg);
    engine.setVolume(settings.volume);
    youtube.setVolume(settings.volume);
    this.setupMediaSession();
  }

  private sync() {
    const out = this.out;
    const t = out.currentTime;
    if (!out.paused && this.lastTick && t > this.lastTick && t - this.lastTick < 2) this.listened += t - this.lastTick;
    this.lastTick = t;
    this.time = t;
    this.duration = out.duration || this.current?.duration || 0;
    this.playing = !out.paused;
    this.buffering = out.buffering;
    this.bypassed = out === youtube || engine.bypassed;
    const cur = this.current;
    if (cur && !cur.isLive && !cur.duration && out.duration > 0 && this.readyToken === this.loadToken) {
      cur.duration = Math.round(out.duration);
      if (cur.source === 'local') library.setDuration(cur.id, cur.duration);
    }
    // crossfade into the next track
    const cf = settings.crossfade;
    if (cf > 0 && !this.fading && this.playing && this.duration > cf * 3 && !this.current?.isLive && this.repeat !== 'one'
      && this.duration - t <= cf && this.loopB === null && this.sleep?.mode !== 'track') {
      const n = this.nextIndex();
      // crossfades only work between tracks our own engine plays
      if (n !== null && out === engine && this.queue[n].source !== 'youtube') { this.fading = true; void this.load(n, { crossfade: cf }); }
    }
    if ('mediaSession' in navigator && this.duration && Number.isFinite(this.duration)) {
      try { navigator.mediaSession.setPositionState({ duration: this.duration, position: Math.min(t, this.duration), playbackRate: this.rate }); } catch { /* ignore */ }
    }
  }

  /** Replace the queue and start playing at `start`. */
  playList(tracks: Track[], start = 0) {
    engine.unlock(); // synchronous, inside the click: Safari only starts audio from a user gesture
    this.queue = tracks.map((t) => $state.snapshot(t) as Track);
    if (this.shuffle) {
      const first = this.queue.splice(start, 1)[0];
      this.queue = [first, ...shuffled(this.queue)];
      start = 0;
    }
    void this.load(start);
  }

  playNext(track: Track) {
    this.queue.splice(this.index + 1, 0, $state.snapshot(track) as Track);
    ui.toast(t('toast.playingNext', { title: track.title }));
  }

  enqueue(tracks: Track[]) {
    this.queue.push(...tracks.map((t) => $state.snapshot(t) as Track));
    ui.toast(tracks.length === 1 ? t('toast.addedQueue', { title: tracks[0].title }) : t('toast.addedQueueMany', { count: tracks.length }));
    if (this.index < 0) void this.load(0);
  }

  removeAt(i: number) {
    if (i === this.index) return;
    this.queue.splice(i, 1);
    if (i < this.index) this.index--;
  }

  move(from: number, to: number) {
    const [t] = this.queue.splice(from, 1);
    this.queue.splice(to, 0, t);
    if (this.index === from) this.index = to;
    else if (from < this.index && to >= this.index) this.index--;
    else if (from > this.index && to <= this.index) this.index++;
  }

  private nextIndex(): number | null {
    if (this.index + 1 < this.queue.length) return this.index + 1;
    if (this.repeat === 'all' && this.queue.length) return 0;
    return null;
  }

  async load(i: number, opts: { crossfade?: number; startAt?: number } = {}) {
    const track = this.queue[i];
    if (!track) return;
    const token = ++this.loadToken;
    this.logListen();
    this.index = i;
    this.analysis = null;
    this.analysisError = '';
    this.loopA = this.loopB = null;
    engine.setLoop(null, null);
    youtube.setLoop(null, null);
    try {
      if (track.source === 'youtube') {
        engine.stop();
        await youtube.play(track.youtubeId!, opts.startAt);
        if (token !== this.loadToken) return;
        this.readyToken = token;
        this.failures = 0;
        youtube.setRate(this.rate);
        library.pushRecent(track);
        this.updateMediaSession(track);
        return;
      }
      if (youtube.active) youtube.stop();
      const url = await this.resolveUrl(track);
      if (token !== this.loadToken) { this.releaseUrl(url); return; }
      const cached = await cachedAnalysis(track.id);
      if (token !== this.loadToken) { this.releaseUrl(url); return; }
      this.analysis = cached ?? null;
      this.normDb = settings.normalize ? normalisationDb(cached, settings.normTarget) : 0;
      // a saved (blob:) copy is same-origin, so it can always be processed
      await engine.play(url, { cors: url.startsWith('blob:') ? true : track.cors, crossfade: opts.crossfade, startAt: opts.startAt, normDb: this.normDb });
      if (token !== this.loadToken) return;
      this.readyToken = token;
      this.failures = 0;
      this.adoptUrl(url);
      engine.setEq(effectiveEq(), settings.eqEnabled);
      engine.setCrossfeed(settings.crossfeed);
      engine.setRate(this.rate);
      library.pushRecent(track);
      void radioClick(track);
      this.updateMediaSession(track);
      // the idle deck is only used for crossfades, so only preload then (and never a live stream)
      const n = this.nextIndex();
      if (n !== null && settings.crossfade > 0 && !opts.crossfade) {
        const next = this.queue[n];
        if (next.streamUrl && next.source !== 'local' && !next.isLive) engine.preload(next.streamUrl, next.cors);
      }
      if (!cached && settings.autoAnalyse && track.source === 'local') void this.analyse();
    } catch (e) {
      if (token !== this.loadToken) return;
      const err = e as Error;
      if (err.name === 'NotAllowedError') { ui.toast(t('toast.pressPlay')); return; }
      this.skipAfterError(track, err.message);
    } finally {
      this.fading = false;
    }
  }

  /** Report a track that can't play and move on, but stop after a whole queue of failures (e.g. offline). */
  private skipAfterError(track: Track | null, message: string) {
    if (!track) return;
    ui.toast(t('toast.cantPlay', { title: track.title, error: message }), 'error');
    this.failures++;
    if (this.failures >= this.queue.length) { this.failures = 0; engine.stop(); this.playing = false; return; }
    const token = this.loadToken;
    const n = this.nextIndex();
    if (n !== null && n !== this.index) setTimeout(() => { if (token === this.loadToken) void this.load(n); }, 800);
  }

  private async resolveUrl(track: Track): Promise<string> {
    // a copy saved for offline plays from this device, with or without a connection
    const saved = await offline.blob(track.id).catch(() => undefined);
    if (saved) return URL.createObjectURL(saved);
    if (track.source === 'local') return URL.createObjectURL(await localFile(track));
    if (!track.streamUrl) throw new Error('no stream available');
    return track.streamUrl;
  }
  /** The playing local file's object URL; the previous one is released once the switch has settled. */
  private adoptUrl(url: string) {
    if (!url.startsWith('blob:') || url === this.objectUrl) return;
    const old = this.objectUrl;
    this.objectUrl = url;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 15000);
  }
  private releaseUrl(url: string) { if (url.startsWith('blob:') && url !== this.objectUrl) URL.revokeObjectURL(url); }

  async analyse() {
    const track = this.current;
    if (!track || this.analysingId === track.id || track.source === 'youtube') return;
    this.analysingId = track.id;
    this.analysisError = '';
    try {
      const a = await analyseTrack(track);
      if (this.current?.id !== track.id) return;
      this.analysis = a;
      if (settings.normalize) { this.normDb = normalisationDb(a, settings.normTarget); engine.setNormalization(this.normDb); }
    } catch (e) {
      if (this.current?.id === track.id) this.analysisError = (e as Error).message;
    } finally {
      if (this.analysingId === track.id) this.analysingId = null;
    }
  }

  private handleEnded() {
    if (this.sleep?.mode === 'track') { this.setSleep(null); this.logListen(); ui.toast(t('toast.sleepStopped')); return; }
    if (this.repeat === 'one') { this.out.seek(0); void this.out.resume(); return; }
    const n = this.nextIndex();
    if (n !== null) void this.load(n);
    else if (settings.autoplay && this.current && !this.current.isLive) void this.continueWithSimilar();
    else { this.logListen(); this.playing = false; }
  }

  /** Queue ended: append music similar to the last track and keep going. */
  private async continueWithSimilar() {
    const last = this.current!;
    const recs = await similarTo(last, library.local, new Set(this.queue.map((q) => q.id)), 10).catch(() => []);
    if (this.current?.id !== last.id || !recs.length) { this.logListen(); this.playing = false; return; }
    const at = this.queue.length;
    this.queue.push(...recs.map((r) => $state.snapshot(r.track) as Track));
    ui.toast(t('toast.autoplay'));
    void this.load(at);
  }

  /** Replace everything after the current track with similar music. */
  /** Reorder what's after the current track so it flows by key and tempo (analysed tracks only). */
  async harmonicShuffle() {
    const rest = this.queue.slice(this.index + 1);
    const found = await Promise.all(rest.map((tr) => cachedAnalysis(tr.id).catch(() => undefined)));
    const items = rest.flatMap((tr, i) => (found[i] ? [{ id: String(i), camelot: found[i]!.camelot, bpm: found[i]!.bpm, energy: found[i]!.energy }] : []));
    if (items.length < 2) { ui.toast(t('harm.need'), 'error'); return; }
    const cur = this.current ? await cachedAnalysis(this.current.id).catch(() => undefined) : undefined;
    const order = harmonicOrder(cur ? { id: 'cur', camelot: cur.camelot, bpm: cur.bpm, energy: cur.energy } : null, items);
    const ordered = order.map((i) => rest[+i]);
    const unanalysed = rest.filter((_, i) => !found[i]);
    this.queue.splice(this.index + 1, Infinity, ...ordered, ...unanalysed);
    ui.toast(unanalysed.length ? t('harm.doneRest', { count: ordered.length, rest: unanalysed.length }) : t('harm.done', { count: ordered.length }));
  }

  async startRadio(from = this.current) {
    if (!from) return;
    const recs = await similarTo(from, library.local, new Set([from.id]), 20);
    if (!recs.length) { ui.toast(t('rec.none'), 'error'); return; }
    if (this.current?.id === from.id) {
      this.queue.splice(this.index + 1, Infinity, ...recs.map((r) => $state.snapshot(r.track) as Track));
    } else {
      this.playList([from, ...recs.map((r) => r.track)], 0);
    }
    ui.toast(t('rec.radioStarted', { title: from.title }));
  }

  toggle() {
    if (this.out === engine) engine.unlock();
    if (this.index < 0 && this.queue.length) return void this.load(0);
    this.out.toggle();
  }
  next() { const n = this.nextIndex(); if (n !== null) void this.load(n); }
  prev() {
    if (this.out.currentTime > 3 || this.index === 0) this.out.seek(0);
    else if (this.index > 0) void this.load(this.index - 1);
  }
  seek(t: number) { this.out.seek(t); this.lastTick = t; }

  setVolume(v: number) { settings.volume = v; engine.setVolume(v); youtube.setVolume(v); }
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle && this.queue.length > 1) {
      const cur = this.queue[this.index];
      const rest = this.queue.filter((_, i) => i !== this.index);
      this.queue = [cur, ...shuffled(rest)];
      this.index = 0;
    }
  }
  cycleRepeat() { this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off'; }

  applyEq() { engine.setEq(effectiveEq(), settings.eqEnabled); }
  applyCrossfeed() { engine.setCrossfeed(settings.crossfeed); }
  applyNormalization() {
    this.normDb = settings.normalize ? normalisationDb(this.analysis ?? undefined, settings.normTarget) : 0;
    engine.setNormalization(this.normDb);
  }

  setRate(r: number) { this.rate = r; engine.setRate(r); youtube.setRate(r); }
  setLoopPoint(which: 'a' | 'b') {
    if (which === 'a') { this.loopA = this.out.currentTime; if (this.loopB !== null && this.loopB <= this.loopA) this.loopB = null; }
    else this.loopB = this.out.currentTime;
    this.out.setLoop(this.loopA, this.loopB);
  }
  clearLoop() { this.loopA = this.loopB = null; this.out.setLoop(null, null); }

  setSleep(s: Sleep) {
    clearInterval(this.sleepTimer);
    this.sleep = s;
    if (s?.mode !== 'minutes') return;
    const finish = () => {
      clearInterval(this.sleepTimer);
      if (this.sleep !== s) return;
      this.sleep = null;
      this.logListen();
      ui.toast(t('toast.sleepFaded'));
    };
    this.sleepTimer = window.setInterval(async () => {
      if (this.sleep !== s) return clearInterval(this.sleepTimer);
      const left = (s.endsAt - Date.now()) / 1000;
      if (left <= 0) {
        // time is up (e.g. it was paused through the fade window): stop now
        if (this.playing && !this.sleepFading) this.out.pause();
        if (!this.sleepFading) finish();
        return;
      }
      if (left <= 20 && this.playing && !this.sleepFading) {
        this.sleepFading = true;
        // cancelled if the timer is changed or turned off during the fade
        await this.out.fadeOutAndPause(Math.max(1, left), () => this.sleep !== s);
        this.sleepFading = false;
        finish();
      }
    }, 1000);
  }

  private logListen() {
    const t = this.current;
    const secs = Math.round(this.listened);
    this.listened = 0;
    this.lastTick = 0;
    if (!t || secs < 20) return;
    const ev: PlayEvent = { id: t.id, title: t.title, artist: t.artist, source: t.source, genre: t.genre, at: Date.now(), seconds: secs };
    void db.set('plays', undefined, ev);
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => { if (this.out === engine) engine.unlock(); void this.out.resume(); });
    ms.setActionHandler('pause', () => this.out.pause());
    ms.setActionHandler('nexttrack', () => this.next());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('seekto', (d) => { if (d.seekTime !== undefined) this.seek(d.seekTime); });
    addEventListener('pagehide', () => this.logListen());
  }

  private updateMediaSession(t: Track) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title, artist: t.artist, album: t.album ?? '',
      artwork: t.artwork ? [{ src: t.artwork, sizes: '512x512' }] : [],
    });
  }
}

function shuffled<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export const player = new Player();
