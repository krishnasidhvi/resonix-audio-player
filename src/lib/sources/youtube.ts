// YouTube, played only through YouTube's official embedded player (see lib/audio/youtube-player.ts).
// Metadata: oEmbed for pasted links (no key); the YouTube Data API for search and playlists
// when the user adds their own free API key (default quota: 100 searches/day per key).
import { getJson, qs } from '../http';
import type { Track } from '../types';
import { isoDuration, parseVideoTitle, parseYouTubeUrl } from './youtube-core';

export { parseYouTubeUrl };

export function youtubeKey(): string {
  return localStorage.getItem('youtube_api_key') || import.meta.env.VITE_YOUTUBE_API_KEY || '';
}

export function videoTrack(id: string, rawTitle: string, channel: string, duration = 0, thumb?: string): Track {
  const meta = parseVideoTitle(rawTitle, channel);
  return {
    id: `youtube:${id}`,
    source: 'youtube',
    youtubeId: id,
    title: meta.title || rawTitle,
    artist: meta.artist || channel,
    album: meta.album ?? (meta.artist !== channel.replace(/\s*-\s*Topic$/i, '') ? channel : undefined),
    duration,
    artwork: thumb ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    pageUrl: `https://www.youtube.com/watch?v=${id}`,
    license: { name: 'YouTube', url: 'https://www.youtube.com/t/terms' },
    cors: false,
  };
}

interface OEmbed { title: string; author_name: string; thumbnail_url?: string }

/** Title and channel for one video, without an API key. */
export async function videoFromOEmbed(id: string): Promise<Track> {
  const o = await getJson<OEmbed>(`https://www.youtube.com/oembed?${qs({ url: `https://www.youtube.com/watch?v=${id}`, format: 'json' })}`, 8000);
  return videoTrack(id, o.title, o.author_name, 0, o.thumbnail_url);
}

export async function playlistTitle(listId: string): Promise<string | null> {
  try {
    const o = await getJson<OEmbed>(`https://www.youtube.com/oembed?${qs({ url: `https://www.youtube.com/playlist?list=${listId}`, format: 'json' })}`, 8000);
    return o.title;
  } catch { return null; }
}

// ---------- Data API (needs the user's key) ----------
const API = 'https://www.googleapis.com/youtube/v3';

interface VideoItem { id: string; snippet: { title: string; channelTitle: string; thumbnails?: Record<string, { url: string }> }; contentDetails?: { duration: string }; status?: { embeddable: boolean } }

async function videosByIds(ids: string[]): Promise<Track[]> {
  const out: Track[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await getJson<{ items: VideoItem[] }>(`${API}/videos?${qs({ part: 'snippet,contentDetails,status', id: ids.slice(i, i + 50).join(','), key: youtubeKey() })}`);
    for (const v of r.items) {
      if (v.status && !v.status.embeddable) continue; // owner disabled playback on other sites
      const th = v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url;
      out.push(videoTrack(v.id, v.snippet.title, v.snippet.channelTitle, isoDuration(v.contentDetails?.duration ?? ''), th));
    }
  }
  // keep the requested order
  return ids.map((id) => out.find((t) => t.youtubeId === id)).filter((t): t is Track => !!t);
}

function apiError(e: unknown): Error {
  const msg = (e as Error).message;
  if (/403/.test(msg)) return new Error('YouTube rejected the key or its daily quota is used up (100 searches a day). Try again tomorrow or use another key.');
  if (/400/.test(msg)) return new Error('That YouTube API key looks invalid.');
  return e as Error;
}

export async function youtubeSearch(query: string, region?: string): Promise<Track[]> {
  if (!youtubeKey()) throw new Error('Add a free YouTube API key in Settings to search YouTube, or paste a YouTube link.');
  try {
    const r = await getJson<{ items: { id: { videoId: string } }[] }>(`${API}/search?${qs({
      part: 'id', q: query, type: 'video', videoCategoryId: 10, videoEmbeddable: 'true', maxResults: 25, regionCode: region, key: youtubeKey(),
    })}`);
    return await videosByIds(r.items.map((i) => i.id.videoId));
  } catch (e) { throw apiError(e); }
}

export async function playlistViaApi(listId: string): Promise<Track[]> {
  const ids: string[] = [];
  let page: string | undefined;
  try {
    do {
      const r = await getJson<{ items: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(`${API}/playlistItems?${qs({ part: 'contentDetails', playlistId: listId, maxResults: 50, pageToken: page, key: youtubeKey() })}`);
      ids.push(...r.items.map((i) => i.contentDetails.videoId));
      page = r.nextPageToken;
    } while (page && ids.length < 200);
    return await videosByIds(ids);
  } catch (e) { throw apiError(e); }
}

/** Metadata for many ids without a key: oEmbed, a few at a time. Unavailable videos are skipped. */
export async function videosViaOEmbed(ids: string[], onProgress?: (done: number, total: number) => void): Promise<Track[]> {
  const out: (Track | null)[] = new Array(ids.length).fill(null);
  let next = 0, done = 0;
  const worker = async () => {
    for (let i = next++; i < ids.length; i = next++) {
      try { out[i] = await videoFromOEmbed(ids[i]); } catch { /* private, removed or not embeddable */ }
      onProgress?.(++done, ids.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out.filter((t): t is Track => !!t);
}
