// Pure AutoEq parsing (unit-tested in Node).
export interface Headphone { name: string; path: string; source: string }

// Measurement sources in order of preference when a model was measured more than once.
const PREFERRED = ['oratory1990', 'crinacle', 'Rtings', 'Innerfidelity', 'Headphone.com Legacy', 'Super Review'];
const rank = (s: string) => { const i = PREFERRED.indexOf(s); return i < 0 ? PREFERRED.length : i; };

export function parseIndex(md: string): Headphone[] {
  const best = new Map<string, Headphone>();
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^- \[(.+?)\]\(\.\/(.+?)\) by (.+?)(?: on .+)?$/);
    if (!m) continue;
    const hp = { name: m[1], path: m[2], source: m[3].trim() };
    const prev = best.get(hp.name);
    if (!prev || rank(hp.source) < rank(prev.source)) best.set(hp.name, hp);
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** "Filter 3: ON PK Fc 125 Hz Gain -1.1 dB Q 1.41" lines → 10 gains in band order. */
export function parseFixedBand(txt: string): number[] {
  const gains: number[] = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/Filter\s+\d+:\s+ON\s+PK\s+Fc\s+([\d.]+)\s+Hz\s+Gain\s+(-?[\d.]+)\s+dB/i);
    if (m) gains.push(Math.round(Number(m[2]) * 10) / 10);
  }
  if (gains.length !== 10) throw new Error('Unexpected profile format');
  return gains;
}

export function searchHeadphones(list: Headphone[], q: string, limit = 8): Headphone[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return list.filter((h) => words.every((w) => h.name.toLowerCase().includes(w))).slice(0, limit);
}
