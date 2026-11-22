// Internet Archive audio collections. Only items whose uploader declared a
// Creative Commons or public-domain licence are returned (see OPEN_LICENSE_QUERY).
import { getJson, qs } from '../http';
import { licenseFromUrl, OPEN_LICENSE_QUERY } from '../license';
import type { Track } from '../types';
import type { Album } from './album';

/** Leave out audiobooks, lectures, sermons, podcasts and old radio shows: this is a music player. */
const NOT_SPOKEN = '-collection:(librivoxaudio OR audio_bookspoetry OR podcasts OR radioprograms OR oldtimeradio OR audio_religion OR audio_news OR audio_podcast) AND -subject:(audiobook OR audiobooks OR librivox OR sermon OR lecture OR podcast OR speech)';

interface Doc {
  identifier: string;
  title?: string | string[];
  creator?: string | string[];
  licenseurl?: string;
  downloads?: number;
  year?: string;
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v) ?? '';

function itemToAlbum(d: Doc): Album {
  return {
    id: `archive:${d.identifier}`,
    source: 'archive',
    title: first(d.title) || d.identifier,
    artist: first(d.creator) || 'Unknown artist',
    artwork: `https://archive.org/services/img/${encodeURIComponent(d.identifier)}`,
    license: licenseFromUrl(d.licenseurl),
    pageUrl: `https://archive.org/details/${encodeURIComponent(d.identifier)}`,
    year: d.year,
  };
}

export async function archiveSearch(query: string, page = 1, extra = ''): Promise<Album[]> {
  const q = `(${query}) AND mediatype:audio AND ${OPEN_LICENSE_QUERY} AND ${NOT_SPOKEN}${extra ? ' AND ' + extra : ''}`;
  const url =
    `https://archive.org/advancedsearch.php?${qs({ q, rows: 30, page, output: 'json' })}` +
    ['identifier', 'title', 'creator', 'licenseurl', 'downloads', 'year'].map((f) => `&fl[]=${f}`).join('') +
    '&sort[]=downloads+desc';
  const r = await getJson<{ response: { docs: Doc[] } }>(url);
  return r.response.docs.map(itemToAlbum);
}

/** Curated, well-known open collections on the Archive. */
export const ARCHIVE_SHELVES: { label: string; query: string; extra?: string }[] = [
  { label: 'Hindustani & Carnatic', query: 'raag OR raga OR carnatic OR hindustani' },
  { label: 'Classical (Musopen & more)', query: 'musopen OR symphony OR sonata OR concerto' },
  { label: 'Jazz & Blues 78s', query: 'jazz OR blues', extra: 'collection:(78rpm OR georgeblood)' },
  { label: 'Live concerts (Etree)', query: '*', extra: 'collection:etree' },
  { label: 'Netlabels', query: '*', extra: 'collection:netlabels' },
  { label: 'Folk & world', query: 'folk OR world music' },
];

interface FileEntry { name: string; format?: string; title?: string; length?: string; track?: string; album?: string; creator?: string; artist?: string; source?: string }

function parseLength(l?: string): number {
  if (!l) return 0;
  if (l.includes(':')) return l.split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
  return Math.round(Number(l)) || 0;
}

export async function archiveAlbumTracks(album: Album): Promise<Track[]> {
  const ident = album.id.slice('archive:'.length);
  const meta = await getJson<{ files: FileEntry[]; metadata: { licenseurl?: string } }>(
    `https://archive.org/metadata/${encodeURIComponent(ident)}`,
  );
  const license = licenseFromUrl(meta.metadata?.licenseurl) ?? album.license;
  // Prefer MP3 (universally playable); fall back to Ogg; skip derivatives of the same title.
  const audio = meta.files.filter((f) => /mp3/i.test(f.format ?? '') || /\.mp3$/i.test(f.name));
  const pool = audio.length ? audio : meta.files.filter((f) => /ogg vorbis/i.test(f.format ?? ''));
  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const f of pool) {
    const base = f.name.replace(/\.[^.]+$/, '').replace(/_(vbr|64kb|128kb)$/i, '');
    if (seen.has(base)) continue;
    seen.add(base);
    tracks.push({
      id: `archive:${ident}/${f.name}`,
      source: 'archive',
      title: f.title || base.replace(/^\d+[\s._-]+/, ''),
      artist: f.creator || f.artist || album.artist,
      album: album.title,
      duration: parseLength(f.length),
      artwork: album.artwork,
      streamUrl: `https://archive.org/download/${encodeURIComponent(ident)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      pageUrl: album.pageUrl,
      license,
      format: f.format,
      cors: true,
    });
  }
  return tracks.sort((a, b) => a.streamUrl!.localeCompare(b.streamUrl!, undefined, { numeric: true }));
}
