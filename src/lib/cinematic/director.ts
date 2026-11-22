// Decides what the cinematic background shows for a track, and turns live audio into
// smooth control signals (bass level, kick pulses). Pure logic except readAudio().
import type { Analysis, Track } from '../types';

export const SCENE = { liquid: 0, waves: 1, aurora: 2 } as const;
export type CineStyle = 'auto' | keyof typeof SCENE;

const CALM_CLASSICAL = /(classical|raag|raga|carnatic|hindustani|sitar|veena|bhajan|devotional|orchestra|symphon|sonata|concerto|choral|acoustic|folk)/i;
const AMBIENT = /(ambient|lo-?fi|chill|piano|meditat|sleep|drone|new age)/i;
const ENERGETIC = /(edm|electro|house|techno|trance|drum|bass|dubstep|hip|rap|trap|rock|metal|punk|dance|pop|disco|funk|bollywood|kuthu|mass)/i;

/** Pick a scene from genre/tags/mood and, when available, measured energy and tempo. */
export function chooseScene(track: Track | null, a: Analysis | null, style: CineStyle = 'auto'): number {
  if (style !== 'auto') return SCENE[style];
  if (!track) return SCENE.liquid;
  const text = [track.genre, track.mood, ...(track.tags ?? []), track.album].filter(Boolean).join(' ');
  if (CALM_CLASSICAL.test(text) && !(a && a.energy > 0.7)) return SCENE.aurora;
  if (a) {
    if (a.energy >= 0.62 || (a.bpm ?? 0) >= 118) return SCENE.waves;
    if (a.energy < 0.4) return CALM_CLASSICAL.test(text) ? SCENE.aurora : SCENE.liquid;
  }
  if (ENERGETIC.test(text)) return SCENE.waves;
  if (AMBIENT.test(text)) return SCENE.liquid;
  return SCENE.liquid;
}

/** Major keys feel warmer, minor cooler: +1 … -1. */
export const warmth = (a: Analysis | null) => (!a?.key ? 0 : a.key.endsWith('major') ? 1 : -1);

/** Tempo-scaled clock rate: faster songs move faster, within a calm range. */
export const timeRate = (a: Analysis | null, energy: number) => {
  const bpm = a?.bpm ?? 100;
  return Math.min(1.8, Math.max(0.45, (bpm / 110) * (0.7 + 0.6 * energy)));
};

/**
 * Live audio → control signals. Kick = sudden rise of low-frequency energy above its
 * recent average (simple onset detector), with a refractory period.
 */
export class AudioFollower {
  bass = 0;
  kick = 0;
  private avg = 0;
  private lastKick = 0;
  private data: Uint8Array<ArrayBuffer> | null = null;

  update(an: AnalyserNode | null, sampleRate: number, dt: number, now: number, fallbackBpm: number | null, playing: boolean) {
    this.kick *= Math.exp(-dt * 5);
    if (an && playing) {
      this.data ??= new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(this.data);
      const binHz = sampleRate / an.fftSize;
      const lo = Math.max(1, Math.floor(30 / binHz)), hi = Math.ceil(150 / binHz);
      let sum = 0;
      for (let k = lo; k <= hi; k++) sum += this.data[k];
      const level = sum / ((hi - lo + 1) * 255);
      this.bass += (level - this.bass) * Math.min(1, dt * 10);
      this.avg += (level - this.avg) * Math.min(1, dt * 1.5);
      if (level > this.avg * 1.25 + 0.04 && now - this.lastKick > 0.22) { this.kick = 1; this.lastKick = now; }
    } else if (playing && fallbackBpm) {
      // no audio access (e.g. a stream without CORS): breathe on the known tempo
      const beat = (now * fallbackBpm) / 60;
      const phase = beat - Math.floor(beat);
      if (phase < 0.08 && now - this.lastKick > 0.2) { this.kick = 0.6; this.lastKick = now; }
      this.bass += (0.35 + 0.15 * Math.sin(beat * Math.PI) - this.bass) * Math.min(1, dt * 2);
    } else if (playing) {
      // nothing to follow: breathe slowly instead of going flat
      this.bass += (0.3 + 0.12 * Math.sin(now * 1.1) - this.bass) * Math.min(1, dt * 2);
    } else {
      this.bass += (0.15 - this.bass) * Math.min(1, dt);
    }
  }
}
