// Harmonic shuffle: reorder a queue so each track flows into the next by key (Camelot wheel),
// tempo and energy. Pure function so it is unit-tested.
export interface HarmonicItem { id: string; camelot: string | null; bpm: number | null; energy: number }

function camelotParts(c: string) { return { n: parseInt(c, 10), l: c.slice(-1) }; }

/** 1 = perfect mix (same key / ±1 / relative major-minor), down to 0 for clashing keys. */
export function keyScore(a: string | null, b: string | null): number {
  if (!a || !b) return 0.3;
  const x = camelotParts(a), y = camelotParts(b);
  const d = Math.min((x.n - y.n + 12) % 12, (y.n - x.n + 12) % 12);
  if (d === 0) return 1;                       // same key, or relative major/minor
  if (d === 1 && x.l === y.l) return 0.9;      // one step round the wheel
  if (d === 2 && x.l === y.l) return 0.5;      // energy boost / drop
  return Math.max(0, 0.3 - d * 0.05);
}

/** Tempo closeness, treating half/double time as close. */
export function tempoScore(a: number | null, b: number | null): number {
  if (!a || !b) return 0.4;
  const r = Math.max(a, b) / Math.min(a, b);
  const ratio = Math.min(r, Math.abs(r - 2) + 1);
  return Math.max(0, 1 - (ratio - 1) / 0.12);
}

export function transitionScore(a: HarmonicItem, b: HarmonicItem): number {
  return 0.55 * keyScore(a.camelot, b.camelot) + 0.3 * tempoScore(a.bpm, b.bpm) + 0.15 * (1 - Math.min(1, Math.abs(a.energy - b.energy) / 0.5));
}

/** Greedy chain from `start`: always take the best next transition. Returns ids in order. */
export function harmonicOrder(start: HarmonicItem | null, items: HarmonicItem[]): string[] {
  const left = items.slice();
  const out: string[] = [];
  let cur = start ?? left.sort((a, b) => a.energy - b.energy).shift() ?? null;
  if (!start && cur) out.push(cur.id);
  while (left.length && cur) {
    let best = 0, bestScore = -1;
    for (let i = 0; i < left.length; i++) {
      const sc = transitionScore(cur, left[i]);
      if (sc > bestScore) { bestScore = sc; best = i; }
    }
    cur = left.splice(best, 1)[0];
    out.push(cur.id);
  }
  return out;
}
