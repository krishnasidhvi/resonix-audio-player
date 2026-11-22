// Tiny i18n: English is bundled; other locales are lazy-loaded chunks.
// Messages are strings with {placeholders}, or plural objects keyed by Intl.PluralRules category.
import en from './en';

export type Key = keyof typeof en;
export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Msg = string | Plural;
export type Messages = Partial<Record<Key, Msg>>;

export const LOCALES = [
  { code: 'en', name: 'English', rtl: false },
  { code: 'de', name: 'Deutsch', rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'es', name: 'Español', rtl: false },
  { code: 'ja', name: '日本語', rtl: false },
  { code: 'zh', name: '简体中文', rtl: false },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'hi', name: 'हिन्दी', rtl: false },
  { code: 'te', name: 'తెలుగు', rtl: false },
  { code: 'ta', name: 'தமிழ்', rtl: false },
] as const;
export type Locale = (typeof LOCALES)[number]['code'];

const loaders: Record<Exclude<Locale, 'en'>, () => Promise<{ default: Messages }>> = {
  de: () => import('./locales/de'),
  fr: () => import('./locales/fr'),
  es: () => import('./locales/es'),
  ja: () => import('./locales/ja'),
  zh: () => import('./locales/zh'),
  ar: () => import('./locales/ar'),
  hi: () => import('./locales/hi'),
  te: () => import('./locales/te'),
  ta: () => import('./locales/ta'),
};

const STORAGE = 'resonix.locale';
const isLocale = (c: string | null): c is Locale => !!c && LOCALES.some((l) => l.code === c);

function detect(): Locale {
  const saved = localStorage.getItem(STORAGE);
  if (isLocale(saved)) return saved;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

class I18n {
  locale: Locale = $state('en');
  messages: Messages = $state.raw({});
  rtl = $derived(LOCALES.find((l) => l.code === this.locale)!.rtl);

  /** Load the saved or browser language before the first render. */
  async init() {
    await this.set(detect(), false);
  }

  async set(code: Locale, persist = true) {
    try {
      this.messages = code === 'en' ? {} : (await loaders[code]()).default;
      this.locale = code;
    } catch {
      this.messages = {};
      this.locale = 'en';
    }
    if (persist) localStorage.setItem(STORAGE, this.locale);
    const html = document.documentElement;
    html.lang = this.locale;
    html.dir = this.rtl ? 'rtl' : 'ltr';
  }
}

export const i18n = new I18n();

const pluralRules = new Map<string, Intl.PluralRules>();

/** Translate a key. `{name}` placeholders are filled from vars; plural messages use vars.count. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const m: Msg = i18n.messages[key] ?? en[key];
  let s: string;
  if (typeof m === 'string') s = m;
  else {
    const n = Number(vars?.count ?? 0);
    let pr = pluralRules.get(i18n.locale);
    if (!pr) { pr = new Intl.PluralRules(i18n.locale); pluralRules.set(i18n.locale, pr); }
    s = m[pr.select(n) as keyof Plural] ?? m.other;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all)) : s;
}

/** For keys built at runtime (raga moods, presets…). Falls back to `fallback` if the key is unknown. */
export function td(key: string, fallback: string, vars?: Record<string, string | number>): string {
  return key in en ? t(key as Key, vars) : fallback;
}

/** "1 h 5 min", localised with Intl unit formatting. */
export function fmtDuration(s: number): string {
  const unit = (u: 'second' | 'minute' | 'hour', v: number) =>
    new Intl.NumberFormat(i18n.locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(v);
  if (s < 60) return unit('second', Math.round(s));
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${unit('hour', h)} ${unit('minute', m)}` : unit('minute', m);
}

export const fmtHour = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(i18n.locale, { hour: 'numeric' });
export const fmtClock = (d: Date) => d.toLocaleTimeString(i18n.locale, { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d: Date) => d.toLocaleDateString(i18n.locale);
/** Monday-first short weekday names. */
export const weekdays = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(i18n.locale, { weekday: 'short' }));
export const regionName = (code: string) => { try { return new Intl.DisplayNames([i18n.locale], { type: 'region' }).of(code) ?? code; } catch { return code; } };
