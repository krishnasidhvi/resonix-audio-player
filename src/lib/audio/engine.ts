// Web Audio playback engine.
//
//   deck A ─┐                                                      ┌─► analyser
//   deck B ─┴► normGain ─► EQ (10 biquads) ─► crossfeed ─► master ─┴─► speakers
//   raw element (no CORS) ─────────────────────────────────────────► speakers directly
//
// Streams from hosts without CORS headers cannot pass through Web Audio (the browser
// would output silence), so they play on a plain element. The UI reports that honestly
// in the Signal Path panel: no EQ / visualizer / normalisation for those.

export const EQ_FREQS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

type Listener = () => void;

interface Deck {
  el: HTMLAudioElement;
  gain: GainNode | null;
  src: MediaElementAudioSourceNode | null;
}

function makeEl(cors: boolean): HTMLAudioElement {
  const el = new Audio();
  el.preload = 'auto';
  if (cors) el.crossOrigin = 'anonymous';
  return el;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private decks: [Deck, Deck] = [{ el: makeEl(true), gain: null, src: null }, { el: makeEl(true), gain: null, src: null }];
  private raw: HTMLAudioElement = makeEl(false);
  private active = 0;
  /** true when the current track plays on the raw element (no processing). */
  bypassed = false;
  private normGain: GainNode | null = null;
  private eq: BiquadFilterNode[] = [];
  private master: GainNode | null = null;
  private xfeedWet: GainNode[] = [];
  private eqGains = EQ_FREQS.map(() => 0);
  private eqEnabled = true;
  private volume = 0.8;
  private normDb = 0;
  private listeners = new Set<Listener>();
  private loop: { a: number; b: number } | null = null;
  private loopTimer = 0;
  /** Incremented by every play()/stop(): a load that finishes after a newer one started is dropped. */
  private gen = 0;
  /** Element currently inside loadInto (its errors are handled by the load itself). */
  private loadingEl: HTMLAudioElement | null = null;
  onEnded: Listener = () => {};
  /** A stream that fails after it started playing (network drop, decode error). */
  onError: (message: string) => void = () => {};

  constructor() {
    for (const el of [...this.decks.map((d) => d.el), this.raw]) {
      for (const ev of ['play', 'pause', 'timeupdate', 'durationchange', 'waiting', 'playing', 'loadedmetadata']) {
        el.addEventListener(ev, () => { if (el === this.el) this.emit(); });
      }
      el.addEventListener('ended', () => { if (el === this.el) this.onEnded(); });
      el.addEventListener('error', () => {
        if (el === this.el && el !== this.loadingEl && el.getAttribute('src')) this.onError(el.error?.message || 'Playback stopped');
      });
    }
  }

  get el(): HTMLAudioElement {
    return this.bypassed ? this.raw : this.decks[this.active].el;
  }

  on(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { for (const l of this.listeners) l(); }

  /** Create/resume the AudioContext. Call synchronously inside a user gesture (Safari needs it). */
  unlock() { this.ensureGraph(); }

  /** Must run inside a user gesture the first time (autoplay policy). */
  private ensureGraph() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const ctx = new AudioContext({ latencyHint: 'playback' });
    this.ctx = ctx;
    this.normGain = ctx.createGain();
    let node: AudioNode = this.normGain;
    this.eq = EQ_FREQS.map((f, i) => {
      const b = ctx.createBiquadFilter();
      // 10 octave-spaced peaking bands at Q 1.41: the same shape AutoEq's fixed-band profiles use
      b.type = 'peaking';
      b.frequency.value = f;
      b.Q.value = 1.41;
      node.connect(b);
      node = b;
      return b;
    });
    // Crossfeed (headphones): each channel gets a low-passed, slightly delayed, attenuated copy of the other.
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    node.connect(split);
    split.connect(merge, 0, 0);
    split.connect(merge, 1, 1);
    this.xfeedWet = [0, 1].map((ch) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const delay = ctx.createDelay(0.01);
      delay.delayTime.value = 0.0003;
      const g = ctx.createGain();
      g.gain.value = 0;
      split.connect(lp, ch);
      lp.connect(delay).connect(g).connect(merge, 0, 1 - ch);
      return g;
    });
    this.master = ctx.createGain();
    merge.connect(this.master);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.78;
    this.master.connect(this.analyser);
    this.master.connect(ctx.destination);
    for (const d of this.decks) {
      d.src = ctx.createMediaElementSource(d.el);
      d.gain = ctx.createGain();
      d.src.connect(d.gain).connect(this.normGain);
    }
    this.applyEq();
    this.applyVolume();
  }

  /**
   * Load and play a URL. `cors` true/undefined tries the processed path first
   * and falls back to the raw element if the host refuses CORS.
   */
  async play(url: string, opts: { cors?: boolean; startAt?: number; crossfade?: number; normDb?: number } = {}): Promise<void> {
    this.ensureGraph();
    const gen = ++this.gen;
    this.normDb = opts.normDb ?? 0;
    const fade = opts.crossfade ?? 0;
    const prev = this.bypassed ? null : this.decks[this.active];
    const wasPlaying = !this.el.paused;

    if (opts.cors === false) return this.playRaw(url, opts.startAt, gen);

    const next = fade > 0 && wasPlaying && prev ? this.decks[1 - this.active] : this.decks[this.active];
    if (this.bypassed) { this.raw.pause(); this.raw.removeAttribute('src'); this.raw.load(); }
    try {
      await this.loadInto(next.el, url, opts.startAt);
    } catch (e) {
      if (gen !== this.gen) return;
      if ((e as Error).name === 'NotAllowedError' || (e as Error).message === 'timeout') throw e;
      // Most likely no CORS headers: retry without processing.
      return this.playRaw(url, opts.startAt, gen);
    }
    if (gen !== this.gen) return; // a newer play()/stop() superseded this one
    this.bypassed = false;
    this.applyNorm();
    const now = this.ctx!.currentTime;
    if (next !== prev && prev?.gain && next.gain) {
      next.gain.gain.cancelScheduledValues(now);
      next.gain.gain.setValueAtTime(0, now);
      next.gain.gain.linearRampToValueAtTime(1, now + fade);
      prev.gain.gain.cancelScheduledValues(now);
      prev.gain.gain.setValueAtTime(prev.gain.gain.value, now);
      prev.gain.gain.linearRampToValueAtTime(0, now + fade);
      const old = prev.el;
      setTimeout(() => { old.pause(); prev.gain!.gain.value = 1; }, fade * 1000 + 50);
      this.active = 1 - this.active;
    } else {
      next.gain?.gain.setValueAtTime(1, now);
    }
    await next.el.play();
    this.emit();
  }

  private loadInto(el: HTMLAudioElement, url: string, startAt?: number, timeoutMs = 20000): Promise<void> {
    this.loadingEl = el;
    return new Promise<void>((resolve, reject) => {
      const done = () => { clearTimeout(timer); el.removeEventListener('canplay', ok); el.removeEventListener('error', bad); if (this.loadingEl === el) this.loadingEl = null; };
      const ok = () => { done(); if (startAt) el.currentTime = startAt; resolve(); };
      const bad = () => { done(); reject(new Error(el.error?.message || 'Could not load audio')); };
      const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, timeoutMs);
      el.addEventListener('canplay', ok, { once: true });
      el.addEventListener('error', bad, { once: true });
      el.src = url;
      el.load();
    });
  }

  private async playRaw(url: string, startAt: number | undefined, gen: number) {
    for (const d of this.decks) d.el.pause();
    this.raw.volume = this.volume ** 2;
    await this.loadInto(this.raw, url, startAt);
    if (gen !== this.gen) return;
    this.bypassed = true;
    await this.raw.play();
    this.emit();
  }

  /** Preload the next URL into the idle deck so the switch is gapless. */
  preload(url: string, cors?: boolean) {
    if (cors === false || this.bypassed) return;
    const idle = this.decks[1 - this.active].el;
    if (idle.paused && idle.src !== url) { idle.src = url; idle.load(); }
  }

  toggle() { if (this.el.paused) void this.resume(); else this.pause(); }
  pause() { this.el.pause(); }
  async resume() { this.ensureGraph(); if (this.el.src) await this.el.play(); }
  /** Pause everything and cancel any load in flight. */
  stop() { this.gen++; for (const el of [...this.decks.map((d) => d.el), this.raw]) { el.pause(); } this.emit(); }
  seek(t: number) { if (Number.isFinite(t)) this.el.currentTime = Math.max(0, t); }

  get currentTime() { return this.el.currentTime || 0; }
  get duration() { return Number.isFinite(this.el.duration) ? this.el.duration : 0; }
  get paused() { return this.el.paused; }
  get buffering() { return this.el.readyState < 3 && !this.el.paused; }

  setVolume(v: number) { this.volume = Math.min(1, Math.max(0, v)); this.applyVolume(); }
  /** Master gain = perceptual volume × headroom so EQ boosts never clip. */
  private masterTarget() {
    const maxBoost = this.eqEnabled ? Math.max(0, ...this.eqGains) : 0;
    return this.volume ** 2 * 10 ** (-maxBoost / 20);
  }
  private applyVolume() {
    if (this.master) this.master.gain.setTargetAtTime(this.masterTarget(), this.ctx!.currentTime, 0.02);
    for (const d of this.decks) d.el.volume = 1;
    this.raw.volume = this.volume ** 2;
  }

  private applyNorm() {
    if (this.normGain && this.ctx) this.normGain.gain.setTargetAtTime(10 ** (this.normDb / 20), this.ctx.currentTime, 0.05);
  }
  setNormalization(db: number) { this.normDb = db; this.applyNorm(); }

  setEq(gains: number[], enabled = true) { this.eqGains = gains.slice(); this.eqEnabled = enabled; this.applyEq(); }
  private applyEq() {
    if (!this.ctx) return;
    this.eq.forEach((b, i) => b.gain.setTargetAtTime(this.eqEnabled ? this.eqGains[i] : 0, this.ctx!.currentTime, 0.02));
    this.applyVolume();
  }

  /** 0 = off, 1 = strong. */
  setCrossfeed(amount: number) {
    if (!this.ctx) return;
    for (const g of this.xfeedWet) g.gain.setTargetAtTime(amount * 0.45, this.ctx.currentTime, 0.05);
  }

  /** Tempo for practice mode. preservesPitch keeps the key unchanged. */
  setRate(rate: number, keepPitch = true) {
    for (const el of [...this.decks.map((d) => d.el), this.raw]) {
      el.playbackRate = rate;
      el.preservesPitch = keepPitch;
    }
  }

  // Timers, not requestAnimationFrame: these must keep running in background tabs.
  setLoop(a: number | null, b: number | null) {
    clearInterval(this.loopTimer);
    this.loop = a !== null && b !== null && b > a ? { a, b } : null;
    if (!this.loop) return;
    this.loopTimer = window.setInterval(() => {
      if (this.loop && this.el.currentTime >= this.loop.b) this.el.currentTime = this.loop.a;
    }, 40);
  }

  /** Fade to silence over `seconds`, then pause. `cancelled()` aborts the fade and restores the volume. */
  fadeOutAndPause(seconds: number, cancelled: () => boolean = () => false): Promise<void> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const useMaster = !this.bypassed && !!this.ctx && !!this.master;
      if (useMaster) {
        const now = this.ctx!.currentTime;
        this.master!.gain.cancelScheduledValues(now);
        this.master!.gain.setValueAtTime(this.master!.gain.value, now);
        this.master!.gain.linearRampToValueAtTime(0.0001, now + seconds);
      }
      const start = this.raw.volume;
      // a timer, not requestAnimationFrame, so it also finishes in a background tab
      const timer = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
        if (cancelled()) {
          clearInterval(timer);
          if (useMaster) this.master!.gain.cancelScheduledValues(this.ctx!.currentTime);
          this.applyVolume();
          return resolve();
        }
        if (!useMaster) this.raw.volume = start * (1 - k);
        if (k >= 1) { clearInterval(timer); this.pause(); this.applyVolume(); resolve(); }
      }, 100);
    });
  }

  /** A sine tone routed past the EQ (used by the hearing check). */
  tone(freq: number, db: number, seconds = 1.2, pan = 0): void {
    this.ensureGraph();
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner();
    osc.frequency.value = freq;
    const amp = 10 ** (db / 20);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.05);
    g.gain.setValueAtTime(amp, t + seconds - 0.08);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    p.pan.value = pan;
    osc.connect(g).connect(p).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + seconds);
  }
}

export const engine = new AudioEngine();
