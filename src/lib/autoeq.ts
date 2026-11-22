// Headphone correction from the AutoEq project (https://github.com/jaakkopasanen/AutoEq, MIT licence).
// AutoEq publishes, per headphone model, a "FixedBandEQ" profile: 10 peaking filters at
// 31…16k Hz with Q 1.41 — the same bands and shape as Resonix's EQ, so it maps 1:1.
import { db } from './db';
import { parseFixedBand, parseIndex, type Headphone } from './autoeq-core';
export { searchHeadphones, type Headphone } from './autoeq-core';

const RAW = 'https://raw.githubusercontent.com/jaakkopasanen/AutoEq/master/results/';

let listPromise: Promise<Headphone[]> | null = null;

/** The full model list (~5,000 models), cached for a week. */
export function headphoneList(): Promise<Headphone[]> {
  listPromise ??= (async () => {
    const cached = await db.get<{ at: number; list: Headphone[] }>('kv', 'autoeq-index').catch(() => undefined);
    if (cached && Date.now() - cached.at < 7 * 864e5) return cached.list;
    const res = await fetch(RAW + 'INDEX.md');
    if (!res.ok) throw new Error(`AutoEq answered ${res.status}`);
    const list = parseIndex(await res.text());
    void db.set('kv', 'autoeq-index', { at: Date.now(), list });
    return list;
  })().catch((e) => { listPromise = null; throw e; });
  return listPromise;
}

export async function headphoneGains(hp: Headphone): Promise<number[]> {
  const url = `${RAW}${hp.path}/${encodeURIComponent(`${hp.name} FixedBandEQ.txt`)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AutoEq answered ${res.status}`);
  return parseFixedBand(await res.text());
}

