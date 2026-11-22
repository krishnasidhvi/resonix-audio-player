// Radio Browser: community directory of ~50k internet radio stations. https://www.radio-browser.info
import { getJson, qs } from '../http';
import type { Track } from '../types';

const FALLBACK = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info'];
let basePromise: Promise<string> | null = null;

function base(): Promise<string> {
  basePromise ??= getJson<{ name: string }[]>('https://all.api.radio-browser.info/json/servers', 6000)
    .then((list) => {
      const names = list.map((s) => `https://${s.name}`);
      return names[Math.floor(Math.random() * names.length)] ?? FALLBACK[0];
    })
    .catch(() => FALLBACK[Math.floor(Math.random() * FALLBACK.length)]);
  return basePromise;
}

interface Station {
  stationuuid: string;
  name: string;
  url_resolved: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  language?: string;
  codec?: string;
  bitrate?: number;
}

function map(s: Station): Track {
  const tags = (s.tags ?? '').split(',').filter(Boolean);
  return {
    id: `radio:${s.stationuuid}`,
    source: 'radio',
    title: s.name.trim(),
    artist: [s.country, tags.slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Internet radio',
    duration: 0,
    isLive: true,
    artwork: s.favicon?.startsWith('https://') ? s.favicon : undefined,
    streamUrl: s.url_resolved,
    pageUrl: s.homepage,
    genre: tags[0],
    format: s.codec || undefined,
    bitrate: s.bitrate || undefined, // kbps
    license: { name: 'Live broadcast · rights held by the station' },
  };
}

/** HTTPS only: an https page cannot play http streams (mixed content). */
const usable = (s: Station) => s.url_resolved?.startsWith('https://');

export interface RadioQuery { name?: string; tag?: string; countrycode?: string; language?: string; limit?: number }

export async function radioSearch(q: RadioQuery): Promise<Track[]> {
  const b = await base();
  const params = qs({ ...q, limit: (q.limit ?? 40) * 2, order: 'clickcount', reverse: true, hidebroken: true });
  const list = await getJson<Station[]>(`${b}/json/stations/search?${params}`);
  return list.filter(usable).slice(0, q.limit ?? 40).map(map);
}

/** Tell Radio Browser a station was played (their API etiquette; feeds the popularity ranking). */
export async function radioClick(track: Track): Promise<void> {
  if (track.source !== 'radio') return;
  try {
    await fetch(`${await base()}/json/url/${track.id.slice('radio:'.length)}`);
  } catch { /* best effort */ }
}

export const RADIO_MOODS = [
  { label: 'Bollywood', q: { tag: 'bollywood' } },
  { label: 'Telugu', q: { language: 'telugu' } },
  { label: 'Tamil', q: { language: 'tamil' } },
  { label: 'Carnatic', q: { tag: 'carnatic' } },
  { label: 'Lo-fi', q: { tag: 'lofi' } },
  { label: 'Jazz', q: { tag: 'jazz' } },
  { label: 'Classical', q: { tag: 'classical' } },
  { label: 'Ambient', q: { tag: 'ambient' } },
  { label: 'News', q: { tag: 'news' } },
] satisfies { label: string; q: RadioQuery }[];
