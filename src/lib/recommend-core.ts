// Pure scoring used by recommendations (no browser APIs, so it is unit-tested in Node).
import { camelotCompatible } from './audio/analysis-core.ts';
import type { Analysis } from './types';

/** 0..1 similarity of two analyses: tempo (with half/double-time), energy, loudness and harmonic key. */
export function soundSimilarity(a: Analysis, b: Analysis): number {
  let s = 0, w = 0;
  if (a.bpm && b.bpm) {
    const ratio = Math.max(a.bpm, b.bpm) / Math.min(a.bpm, b.bpm);
    const r = Math.min(ratio, Math.abs(ratio - 2) + 1); // 70 vs 140 BPM feel alike
    s += 0.35 * Math.max(0, 1 - (r - 1) / 0.15); w += 0.35;
  }
  s += 0.3 * (1 - Math.min(1, Math.abs(a.energy - b.energy) / 0.5)); w += 0.3;
  s += 0.15 * (1 - Math.min(1, Math.abs(a.lufs - b.lufs) / 12)); w += 0.15;
  if (a.camelot && b.camelot) { s += 0.2 * (camelotCompatible(a.camelot, b.camelot) ? 1 : 0); w += 0.2; }
  return w ? s / w : 0;
}
