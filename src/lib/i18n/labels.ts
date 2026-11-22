// Display labels for data values (sources, licences, keys, raga data) in the current language.
import { t, td, type Key } from './i18n.svelte';
import { SOURCES } from '../sources';
import type { License, SourceId } from '../types';

export const sourceName = (id: SourceId) => (id === 'local' ? t('source.local') : id === 'server' ? t('source.server') : SOURCES[id].name);
export const sourceBlurb = (id: SourceId) => t(`source.${id}.blurb` as Key);

const LICENCE_KEYS: Record<string, Key> = {
  'Your file': 'licence.yourFile',
  'Your server': 'licence.server',
  'Artist upload (Audius)': 'licence.audius',
  'Audius · streamed with artist permission': 'licence.audius',
  'Live broadcast · rights held by the station': 'licence.radio',
  'Public domain': 'licence.publicDomain',
  'CC0 (public domain)': 'licence.cc0',
  'Creative Commons': 'licence.cc',
  'See source': 'licence.seeSource',
};
/** Licence names like "CC BY 4.0" are kept as-is; descriptive ones are translated. */
export const licenceLabel = (l?: License) => (l ? (LICENCE_KEYS[l.name] ? t(LICENCE_KEYS[l.name]) : l.name) : '');

/** "A minor" → localised "{note} minor". */
export function keyLabel(k: string | null): string {
  if (!k) return '—';
  const [note, mode] = k.split(' ');
  return mode === 'minor' ? t('key.minor', { note }) : t('key.major', { note });
}

export const praharLabel = (label: string) => td(`prahar.${label}`, label);
export const praharDesc = (label: string, fallback: string) => td(`prahar.${label}.desc`, fallback);
export const moodLabel = (raga: string, fallback: string) => td(`mood.${raga}`, fallback);
export const traditionLabel = (tr: string) => td(`tradition.${tr}`, tr);
export const seasonLabel = (s: string) => td(`season.${s}`, s);
/** Sources store the English placeholder; show it in the reader's language. */
export const artistLabel = (a: string) => (/^unknown artist$/i.test(a) ? t('common.unknownArtist') : a);

export const eqPresetLabel = (p: string) => td(`eq.preset.${p}`, p);
