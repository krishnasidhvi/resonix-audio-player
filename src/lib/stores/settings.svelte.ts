import { EQ_FREQS } from '../audio/engine';

export interface Settings {
  volume: number;
  crossfade: number; // seconds, 0 = gapless
  normalize: boolean;
  normTarget: number; // LUFS
  eqEnabled: boolean;
  eq: number[];
  eqPreset: string;
  hearingEq: number[] | null;
  crossfeed: number; // 0..1
  autoAnalyse: boolean;
  transliterate: boolean;
  reduceMotion: boolean;
  accent: 'artwork' | 'fixed';
  /** Keep playing similar music when the queue ends. */
  autoplay: boolean;
  cinematic: 'off' | 'subtle' | 'vivid';
  /** Single-letter keyboard shortcuts (L, Q, E, F, M, S, R, [, ]). */
  shortcuts: boolean;
  /** AutoEq headphone correction: model name and its 10 band gains. */
  headphone: { name: string; source: string; gains: number[] } | null;
}

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Warm': [3, 2.5, 1.5, 0.5, 0, -0.5, -1, -1, -0.5, 0],
  'Vocal': [-2, -1.5, -1, 0, 1.5, 3, 3, 2, 0.5, 0],
  'Bass': [6, 5, 3.5, 1.5, 0, 0, 0, 0, 0, 0],
  'Air': [0, 0, 0, 0, 0, 0, 0.5, 1.5, 3, 4.5],
  'Late night': [-3, -2, -0.5, 0, 0.5, 1, 1, 0, -1.5, -2.5],
  'Acoustic': [1.5, 1, 0.5, 1, 1.5, 1, 1.5, 2, 1.5, 1],
};

const DEFAULTS: Settings = {
  volume: 0.8,
  crossfade: 0,
  normalize: true,
  normTarget: -14,
  eqEnabled: true,
  eq: EQ_FREQS.map(() => 0),
  eqPreset: 'Flat',
  hearingEq: null,
  crossfeed: 0,
  autoAnalyse: true,
  transliterate: true,
  reduceMotion: false,
  accent: 'artwork',
  autoplay: true,
  cinematic: 'subtle',
  shortcuts: true,
  headphone: null,
};

const KEY = 'resonix.settings.v2';

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

export const settings: Settings = $state(load());

/** Effective EQ curve = user EQ + hearing compensation. */
export function effectiveEq(): number[] {
  return settings.eq.map((g, i) => g + (settings.hearingEq?.[i] ?? 0) + (settings.headphone?.gains[i] ?? 0));
}

$effect.root(() => {
  $effect(() => { localStorage.setItem(KEY, JSON.stringify(settings)); });
});
