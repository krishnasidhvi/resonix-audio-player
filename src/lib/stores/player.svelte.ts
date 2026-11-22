import { engine } from '../audio/engine';
import { analyseTrack, cachedAnalysis, normalisationDb } from '../audio/analysis';
import { db } from '../db';
import { localFile } from '../sources/local';
import { radioClick } from '../sources/radio';
import type { Analysis, Track } from '../types';
import { library } from './library.svelte';
import { effectiveEq, settings } from './settings.svelte';
import { ui } from './ui.svelte';
import { t } from '../i18n/i18n.svelte';

export type Repeat = 'off' | 'all' | 'one';
export type Sleep = { mode: 'minutes'; endsAt: number } | { mode: 'track' } | null;

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
  analysing = $state(false);
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

  constructor() {
    engine.on(() => this.sync());
    engine.onEnded = () => this.handleEnded();
    engine.setVolume(settings.volume);
    this.setupMediaSession();
  }

  private sync() {
    const t = engine.currentTime;
    if (!engine.paused && this.lastTick && t > this.lastTick && t - this.lastTick < 2) this.listened += t - this.lastTick;
    this.lastTick = t;
    this.time = t;
    this.duration = engine.duration || this.current?.duration || 0;
    this.playing = !engine.paused;
    this.buffering = engine.buffering;
    this.bypassed = engine.bypassed;
    const cur = this.current;
    if (cur && !cur.isLive && !cur.duration && engine.duration > 0) {
      cur.duration = Math.round(engine.duration);
      if (cur.source === 'local') library.setDuration(cur.id, cur.duration);
    }
    // crossfade into the next track
    const cf = settings.crossfade;
    if (cf > 0 && !this.fading && this.playing && this.duration > cf * 3 && !this.current?.isLive && this.repeat !== 'one'
      && this.duration - t <= cf && this.loopB === null && this.sleep?.mode !== 'track') {
      const n = this.nextIndex();
      if (n !== null) { this.fading = true; void this.load(n, { crossfade: cf }); }
    }
    if ('mediaSession' in navigator && this.duration && Number.isFinite(this.duration)) {
      try { navigator.mediaSession.setPositionState({ duration: this.duration, position: Math.min(t, this.duration), playbackRate: this.rate }); } catch { /* ignore */ }
    }
  }

  /** Replace the queue and start playing at `start`. */
  playList(tracks: Track[], start = 0) {
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
    try {
      const url = await this.resolveUrl(track);
      if (token !== this.loadToken) return;
      const cached = await cachedAnalysis(track.id);
      this.analysis = cached ?? null;
      this.normDb = settings.normalize ? normalisationDb(cached, settings.normTarget) : 0;
      await engine.play(url, { cors: track.cors, crossfade: opts.crossfade, startAt: opts.startAt, normDb: this.normDb });
      if (token !== this.loadToken) return;
      engine.setEq(effectiveEq(), settings.eqEnabled);
      engine.setCrossfeed(settings.crossfeed);
      engine.setRate(this.rate);
      library.pushRecent(track);
      void radioClick(track);
      this.updateMediaSession(track);
      const n = this.nextIndex();
      if (n !== null && !opts.crossfade) {
        const next = this.queue[n];
        if (next.streamUrl && next.source !== 'local') engine.preload(next.streamUrl, next.cors);
      }
      if (!cached && settings.autoAnalyse && track.source === 'local') void this.analyse();
    } catch (e) {
      if (token !== this.loadToken) return;
      const err = e as Error;
      if (err.name === 'NotAllowedError') { ui.toast(t('toast.pressPlay')); return; }
      ui.toast(t('toast.cantPlay', { title: track.title, error: err.message }), 'error');
      const n = this.nextIndex();
      if (n !== null && n !== i) setTimeout(() => { if (token === this.loadToken) void this.load(n); }, 800);
    } finally {
      this.fading = false;
    }
  }

  private async resolveUrl(track: Track): Promise<string> {
    if (track.source === 'local') {
      if (this.objectUrl) setTimeout((u: string) => URL.revokeObjectURL(u), 15000, this.objectUrl);
      this.objectUrl = URL.createObjectURL(await localFile(track));
      return this.objectUrl;
    }
    if (!track.streamUrl) throw new Error('no stream available');
    return track.streamUrl;
  }

  async analyse() {
    const track = this.current;
    if (!track || this.analysing) return;
    this.analysing = true;
    this.analysisError = '';
    try {
      const a = await analyseTrack(track);
      if (this.current?.id !== track.id) return;
      this.analysis = a;
      if (settings.normalize) { this.normDb = normalisationDb(a, settings.normTarget); engine.setNormalization(this.normDb); }
    } catch (e) {
      this.analysisError = (e as Error).message;
    } finally {
      this.analysing = false;
    }
  }

  private handleEnded() {
    if (this.sleep?.mode === 'track') { this.setSleep(null); this.logListen(); ui.toast(t('toast.sleepStopped')); return; }
    if (this.repeat === 'one') { engine.seek(0); void engine.resume(); return; }
    const n = this.nextIndex();
    if (n !== null) void this.load(n);
    else { this.logListen(); this.playing = false; }
  }

  toggle() {
    if (this.index < 0 && this.queue.length) return void this.load(0);
    engine.toggle();
  }
  next() { const n = this.nextIndex(); if (n !== null) void this.load(n); }
  prev() {
    if (engine.currentTime > 3 || this.index === 0) engine.seek(0);
    else if (this.index > 0) void this.load(this.index - 1);
  }
  seek(t: number) { engine.seek(t); this.lastTick = t; }

  setVolume(v: number) { settings.volume = v; engine.setVolume(v); }
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

  setRate(r: number) { this.rate = r; engine.setRate(r); }
  setLoopPoint(which: 'a' | 'b') {
    if (which === 'a') { this.loopA = engine.currentTime; if (this.loopB !== null && this.loopB <= this.loopA) this.loopB = null; }
    else this.loopB = engine.currentTime;
    engine.setLoop(this.loopA, this.loopB);
  }
  clearLoop() { this.loopA = this.loopB = null; engine.setLoop(null, null); }

  setSleep(s: Sleep) {
    clearInterval(this.sleepTimer);
    this.sleep = s;
    if (s?.mode === 'minutes') {
      this.sleepTimer = window.setInterval(async () => {
        const left = (s.endsAt - Date.now()) / 1000;
        if (left <= 20 && left > 0 && this.playing && !this.fading) {
          this.fading = true;
          clearInterval(this.sleepTimer);
          await engine.fadeOutAndPause(Math.max(1, left));
          this.fading = false;
          this.sleep = null;
          this.logListen();
          ui.toast(t('toast.sleepFaded'));
        }
      }, 1000);
    }
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
    ms.setActionHandler('play', () => engine.resume());
    ms.setActionHandler('pause', () => engine.pause());
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
