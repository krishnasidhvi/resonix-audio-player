// LRC parser, including the "enhanced" word-timing form: [00:12.30]<00:12.30>Hello <00:12.80>world
export interface LyricWord { t: number; text: string }
export interface LyricLine { t: number; text: string; words?: LyricWord[] }

const TIME = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const WORD = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>([^<]*)/g;

const secs = (m: string, s: string, f?: string) => Number(m) * 60 + Number(s) + (f ? Number(f) / 10 ** f.length : 0);

export function parseLrc(src: string): LyricLine[] {
  const out: LyricLine[] = [];
  let offset = 0;
  for (const raw of src.split(/\r?\n/)) {
    const off = raw.match(/^\[offset:\s*([+-]?\d+)\]/i);
    if (off) { offset = Number(off[1]) / 1000; continue; }
    const times = [...raw.matchAll(TIME)];
    if (!times.length) continue;
    const body = raw.replace(TIME, '');
    const words = [...body.matchAll(WORD)].map((w) => ({ t: secs(w[1], w[2], w[3]) - offset, text: w[4] }));
    const text = words.length ? words.map((w) => w.text).join('').trim() : body.trim();
    for (const t of times) {
      out.push({ t: Math.max(0, secs(t[1], t[2], t[3]) - offset), text, words: words.length ? words : undefined });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Index of the line active at time t (binary search), or -1 before the first line. */
export function activeLine(lines: LyricLine[], t: number): number {
  let lo = 0, hi = lines.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
