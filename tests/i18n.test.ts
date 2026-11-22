import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/lib/i18n/en.ts';
import de from '../src/lib/i18n/locales/de.ts';
import fr from '../src/lib/i18n/locales/fr.ts';
import es from '../src/lib/i18n/locales/es.ts';
import ja from '../src/lib/i18n/locales/ja.ts';
import zh from '../src/lib/i18n/locales/zh.ts';
import ar from '../src/lib/i18n/locales/ar.ts';

type Msg = string | Record<string, string>;
const LOCALES: Record<string, Record<string, Msg>> = { de, fr, es, ja, zh, ar } as never;
const enMsgs = en as unknown as Record<string, Msg>;

const placeholders = (m: Msg) => {
  const text = typeof m === 'string' ? m : Object.values(m).join(' ');
  return new Set([...text.matchAll(/\{(\w+)\}/g)].map((x) => x[1]));
};

for (const [code, msgs] of Object.entries(LOCALES)) {
  test(`${code}: has exactly the English keys`, () => {
    const missing = Object.keys(enMsgs).filter((k) => !(k in msgs));
    const extra = Object.keys(msgs).filter((k) => !(k in enMsgs));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });

  test(`${code}: keeps every placeholder (except {count} in written-out plural forms)`, () => {
    const bad: string[] = [];
    for (const [k, src] of Object.entries(enMsgs)) {
      const want = placeholders(src);
      const got = placeholders(msgs[k] ?? '');
      for (const p of want) {
        // Arabic and others may spell out small numbers ("مقطعان") instead of {count}
        if (p === 'count' && typeof src !== 'string') continue;
        if (!got.has(p)) bad.push(`${k} lost {${p}}`);
      }
      for (const p of got) if (!want.has(p)) bad.push(`${k} invents {${p}}`);
    }
    assert.deepEqual(bad, []);
  });

  test(`${code}: plural messages cover the language's plural categories`, () => {
    const cats = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    const bad: string[] = [];
    for (const [k, src] of Object.entries(enMsgs)) {
      if (typeof src === 'string') continue;
      const m = msgs[k];
      if (typeof m !== 'object') { bad.push(`${k} is not a plural object`); continue; }
      if (!m.other) bad.push(`${k} has no "other"`);
      // categories other than "many" must be present (many falls back to other in fr/es)
      for (const c of cats) if (c !== 'many' && !m[c]) bad.push(`${k} missing "${c}"`);
    }
    assert.deepEqual(bad, []);
  });
}
