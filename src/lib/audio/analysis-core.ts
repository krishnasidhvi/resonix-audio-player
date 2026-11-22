// Pure-TS music analysis. No DOM / Web Audio dependencies, so it runs in a Worker and in Node tests.
import type { Analysis } from '../types';

export const WAVE_BINS = 480;

// ---------- FFT (in-place, iterative radix-2) ----------
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// ---------- Loudness: ITU-R BS.1770-4 K-weighting + gating ----------
function biquad(x: Float32Array, b: number[], a: number[]): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

/** K-weighting coefficients for any sample rate (pyloudnorm derivation of the BS.1770 filters). */
function kWeight(x: Float32Array, sr: number): Float32Array {
  // Stage 1: high-shelf
  let G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533;
  let K = Math.tan((Math.PI * fc) / sr);
  const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelfB = [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0];
  const shelfA = [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  // Stage 2: high-pass
  Q = 0.5003270373238773; fc = 38.13547087602444; G = 0;
  K = Math.tan((Math.PI * fc) / sr);
  a0 = 1 + K / Q + K * K;
  const hpB = [1, -2, 1];
  const hpA = [1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0];
  return biquad(biquad(x, shelfB, shelfA), hpB, hpA);
}

/** Integrated loudness in LUFS over the given channels (L/R weight 1.0). */
export function integratedLoudness(channels: Float32Array[], sr: number): number {
  const weighted = channels.map((c) => kWeight(c, sr));
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const n = channels[0].length;
  const blocks: number[] = [];
  for (let s = 0; s + block <= n; s += hop) {
    let z = 0;
    for (const w of weighted) { let acc = 0; for (let i = s; i < s + block; i++) acc += w[i] * w[i]; z += acc / block; }
    blocks.push(z);
  }
  if (!blocks.length) return -70;
  const lufs = (z: number) => -0.691 + 10 * Math.log10(z || 1e-12);
  const abs = blocks.filter((z) => lufs(z) > -70);
  if (!abs.length) return -70;
  const relGate = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const rel = abs.filter((z) => lufs(z) > relGate);
  return lufs(rel.reduce((a, b) => a + b, 0) / rel.length);
}

// ---------- Tempo: onset envelope + autocorrelation ----------
export function estimateBpm(mono: Float32Array, sr: number): { bpm: number | null; onsetRate: number } {
  const hop = 128, win = 512; // ≈86 frames/s at 11 kHz
  const frames = Math.floor((mono.length - win) / hop);
  if (frames < 200) return { bpm: null, onsetRate: 0 };
  const re = new Float64Array(win), im = new Float64Array(win);
  let prev = new Float64Array(win / 2);
  const flux = new Float64Array(frames);
  const hann = new Float64Array(win).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
  for (let f = 0; f < frames; f++) {
    const o = f * hop;
    for (let i = 0; i < win; i++) { re[i] = mono[o + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    const mag = new Float64Array(win / 2);
    let sum = 0;
    for (let k = 1; k < win / 2; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prev[k];
      if (d > 0) sum += d;
    }
    flux[f] = sum;
    prev = mag;
  }
  // remove local mean (adaptive threshold) and half-wave rectify
  const w = 16;
  const env = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let m = 0, c = 0;
    for (let j = Math.max(0, i - w); j < Math.min(frames, i + w); j++) { m += flux[j]; c++; }
    env[i] = Math.max(0, flux[i] - m / c);
  }
  const fps = sr / hop;
  let onsets = 0;
  for (let i = 1; i < frames - 1; i++) if (env[i] > env[i - 1] && env[i] >= env[i + 1] && env[i] > 0) onsets++;
  const onsetRate = onsets / (mono.length / sr);

  // autocorrelation over 60..200 BPM, weighted toward ~120 BPM (log-Gaussian tempo prior)
  let best = 0, bestLag = 0;
  const minLag = Math.floor((60 * fps) / 200), maxLag = Math.ceil((60 * fps) / 60);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < frames; i++) acc += env[i] * env[i + lag];
    const bpm = (60 * fps) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    const score = (acc / (frames - lag)) * prior;
    if (score > best) { best = score; bestLag = lag; }
  }
  if (!bestLag) return { bpm: null, onsetRate };
  // parabolic interpolation for sub-frame precision
  const ac = (lag: number) => { let a = 0; for (let i = 0; i + lag < frames; i++) a += env[i] * env[i + lag]; return a / (frames - lag); };
  const y0 = ac(bestLag - 1), y1 = ac(bestLag), y2 = ac(bestLag + 1);
  const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2)) || 0;
  return { bpm: Math.round((60 * fps) / (bestLag + Math.max(-0.5, Math.min(0.5, shift)))), onsetRate };
}

// ---------- Key: chroma + Krumhansl–Kessler profiles ----------
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
export const NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
// Camelot numbers indexed by tonic pitch class
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

function corr(a: number[], b: number[]) {
  const ma = a.reduce((s, v) => s + v, 0) / 12, mb = b.reduce((s, v) => s + v, 0) / 12;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return n / Math.sqrt(da * db || 1);
}

export function chroma(mono: Float32Array, sr: number): number[] {
  const n = 8192;
  const re = new Float64Array(n), im = new Float64Array(n);
  const c = new Array(12).fill(0);
  const step = n * 2;
  for (let o = 0; o + n < mono.length; o += step) {
    for (let i = 0; i < n; i++) { re[i] = mono[o + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))); im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < n / 2; k++) {
      const f = (k * sr) / n;
      if (f < 55 || f > 2000) continue;
      const pc = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12 + 9) % 12; // A=9
      c[pc] += Math.hypot(re[k], im[k]);
    }
  }
  return c;
}

export function detectKey(ch: number[]): { key: string; camelot: string; minor: boolean } | null {
  if (ch.every((v) => v === 0)) return null;
  let best = -2, tonic = 0, minor = false;
  for (let t = 0; t < 12; t++) {
    const rot = ch.slice(t).concat(ch.slice(0, t));
    const maj = corr(rot, MAJOR), min = corr(rot, MINOR);
    if (maj > best) { best = maj; tonic = t; minor = false; }
    if (min > best) { best = min; tonic = t; minor = true; }
  }
  return {
    key: `${NOTES[tonic]} ${minor ? 'minor' : 'major'}`,
    camelot: `${(minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[tonic]}${minor ? 'A' : 'B'}`,
    minor,
  };
}

/** Camelot compatibility: same code, ±1 on the wheel, or relative major/minor. */
export function camelotCompatible(a: string, b: string): boolean {
  const pa = parseInt(a, 10), pb = parseInt(b, 10);
  const la = a.slice(-1), lb = b.slice(-1);
  if (pa === pb) return true;
  const d = Math.min((pa - pb + 12) % 12, (pb - pa + 12) % 12);
  return la === lb && d === 1;
}

// ---------- Waveform, heat strip, loudest section ----------
export function envelope(mono: Float32Array, sr: number) {
  const per = Math.max(1, Math.floor(mono.length / WAVE_BINS));
  const wave: number[] = [], rms: number[] = [];
  for (let b = 0; b < WAVE_BINS; b++) {
    let peak = 0, acc = 0;
    const s = b * per;
    for (let i = s; i < Math.min(s + per, mono.length); i++) { const v = Math.abs(mono[i]); if (v > peak) peak = v; acc += v * v; }
    wave.push(peak);
    rms.push(Math.sqrt(acc / per));
  }
  const maxP = Math.max(...wave, 1e-6), maxR = Math.max(...rms, 1e-6);
  const secondsPerBin = per / sr;
  // loudest ~15 s window, ignoring the first 8% (intros) — a "jump to the big moment" target
  const winBins = Math.max(1, Math.round(15 / secondsPerBin));
  let best = -1, bestAt = 0;
  for (let i = Math.floor(WAVE_BINS * 0.08); i + winBins <= WAVE_BINS; i++) {
    let s = 0;
    for (let j = i; j < i + winBins; j++) s += rms[j];
    if (s > best) { best = s; bestAt = i; }
  }
  return {
    wave: wave.map((v) => +(v / maxP).toFixed(3)),
    heat: rms.map((v) => +(v / maxR).toFixed(3)),
    peakSection: bestAt * secondsPerBin,
  };
}

/** Linear-interpolated resample to a lower rate (input is assumed band-limited enough for analysis use). */
export function decimate(x: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return x;
  const out = new Float32Array(Math.floor(x.length / factor));
  for (let i = 0; i < out.length; i++) {
    let acc = 0;
    for (let j = 0; j < factor; j++) acc += x[i * factor + j];
    out[i] = acc / factor; // box filter = crude anti-alias
  }
  return out;
}

export function analyse(channels: Float32Array[], sr: number): Analysis {
  const mono = new Float32Array(channels[0].length);
  for (const c of channels) for (let i = 0; i < mono.length; i++) mono[i] += c[i] / channels.length;
  const lufs = integratedLoudness(channels, sr);
  const factor = Math.max(1, Math.floor(sr / 11025));
  const low = decimate(mono, factor);
  const lowSr = sr / factor;
  const { bpm, onsetRate } = estimateBpm(low, lowSr);
  const k = detectKey(chroma(low, lowSr));
  const env = envelope(mono, sr);
  const loud = Math.min(1, Math.max(0, (lufs + 32) / 28));
  const busy = Math.min(1, onsetRate / 9);
  return {
    bpm,
    key: k?.key ?? null,
    camelot: k?.camelot ?? null,
    lufs: Math.round(lufs * 10) / 10,
    energy: Math.round((0.5 * loud + 0.5 * busy) * 100) / 100,
    ...env,
  };
}
