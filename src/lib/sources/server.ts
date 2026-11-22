// Your own music server: Navidrome / any Subsonic-compatible server (Airsonic, Gonic, Ampache…)
// or Jellyfin. Streams come straight from your server to this browser.
// Connection details live only in this browser. For Subsonic only the salted token is
// stored, never the password; for Jellyfin, the access token the server issues.
import { getJson, qs } from '../http';
import { md5 } from '../md5';
import type { Track } from '../types';
import type { Album } from './album';

export type ServerKind = 'subsonic' | 'jellyfin';
export interface ServerConfig {
  kind: ServerKind;
  url: string;
  name?: string;
  user: string;
  // subsonic
  t?: string; s?: string;
  // jellyfin
  userId?: string; token?: string;
}
export interface ServerPlaylist { id: string; name: string; count: number; artwork?: string }

const KEY = 'resonix.server';
const CLIENT = 'Resonix';

export function serverConfig(): ServerConfig | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function forgetServer() { localStorage.removeItem(KEY); }

function normaliseUrl(u: string): string {
  let url = u.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url.replace(/\/rest$/i, '');
}

/** A secure page can't fetch plain-http servers (mixed content), except localhost. */
export function mixedContentProblem(url: string): boolean {
  try {
    const u = new URL(normaliseUrl(url));
    return location.protocol === 'https:' && u.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  } catch { return false; }
}

// ---------------- Subsonic ----------------
interface SubsonicResp<T> { 'subsonic-response': { status: 'ok' | 'failed'; error?: { message: string }; type?: string } & T }

function subsonicAuth(c: ServerConfig) {
  return { u: c.user, t: c.t, s: c.s, v: '1.16.1', c: CLIENT, f: 'json' };
}

async function sub<T>(c: ServerConfig, endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const r = await getJson<SubsonicResp<T>>(`${c.url}/rest/${endpoint}?${qs({ ...subsonicAuth(c), ...params })}`);
  const body = r['subsonic-response'];
  if (body.status !== 'ok') throw new Error(body.error?.message || 'The server refused the request');
  return body as unknown as T;
}

interface SSong { id: string; title: string; artist?: string; album?: string; duration?: number; coverArt?: string; suffix?: string; bitRate?: number; genre?: string; albumId?: string }
interface SAlbum { id: string; name: string; artist?: string; coverArt?: string; year?: number; songCount?: number }

function subCover(c: ServerConfig, id?: string, size = 300) {
  return id ? `${c.url}/rest/getCoverArt?${qs({ ...subsonicAuth(c), id, size })}` : undefined;
}
function subTrack(c: ServerConfig, s: SSong): Track {
  return {
    id: `server:${s.id}`, source: 'server', title: s.title, artist: s.artist || 'Unknown artist', album: s.album,
    duration: s.duration ?? 0, artwork: subCover(c, s.coverArt), genre: s.genre,
    streamUrl: `${c.url}/rest/stream?${qs({ ...subsonicAuth(c), id: s.id })}`,
    format: s.suffix?.toUpperCase(), bitrate: s.bitRate, license: { name: 'Your server' }, cors: true,
  };
}
function subAlbum(c: ServerConfig, a: SAlbum): Album {
  return { id: `server:${a.id}`, source: 'server', title: a.name, artist: a.artist || 'Unknown artist', artwork: subCover(c, a.coverArt), year: a.year ? String(a.year) : undefined };
}

// ---------------- Jellyfin ----------------
function jfAuthHeader(token?: string) {
  const parts = [`Client="${CLIENT}"`, 'Device="Browser"', `DeviceId="${deviceId()}"`, 'Version="2"'];
  if (token) parts.push(`Token="${token}"`);
  return `MediaBrowser ${parts.join(', ')}`;
}
function deviceId() {
  let id = localStorage.getItem('resonix.device');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('resonix.device', id); }
  return id;
}
async function jf<T>(c: ServerConfig, path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  return getJson<T>(`${c.url}${path}?${qs(params)}`, 15000, { headers: { Authorization: jfAuthHeader(c.token) } });
}
interface JItem { Id: string; Name: string; AlbumArtist?: string; Artists?: string[]; Album?: string; RunTimeTicks?: number; ImageTags?: { Primary?: string }; AlbumId?: string; AlbumPrimaryImageTag?: string; ProductionYear?: number; ChildCount?: number; Genres?: string[] }
const jfImage = (c: ServerConfig, id?: string) => (id ? `${c.url}/Items/${id}/Images/Primary?${qs({ maxHeight: 300, api_key: c.token })}` : undefined);
function jfTrack(c: ServerConfig, i: JItem): Track {
  return {
    id: `server:${i.Id}`, source: 'server', title: i.Name, artist: i.Artists?.[0] || i.AlbumArtist || 'Unknown artist', album: i.Album,
    duration: i.RunTimeTicks ? Math.round(i.RunTimeTicks / 1e7) : 0,
    artwork: i.ImageTags?.Primary ? jfImage(c, i.Id) : i.AlbumPrimaryImageTag ? jfImage(c, i.AlbumId) : undefined,
    genre: i.Genres?.[0],
    // "universal" lets the server transcode formats the browser can't play (e.g. ALAC, WMA)
    streamUrl: `${c.url}/Audio/${i.Id}/universal?${qs({ UserId: c.userId, api_key: c.token, Container: 'opus,webm|opus,mp3,aac,m4a|aac,m4a|alac,flac,webma,webm|webma,wav,ogg', TranscodingContainer: 'mp3', AudioCodec: 'mp3', MaxStreamingBitrate: 320000 })}`,
    license: { name: 'Your server' }, cors: true,
  };
}
function jfAlbum(c: ServerConfig, i: JItem): Album {
  return { id: `server:${i.Id}`, source: 'server', title: i.Name, artist: i.AlbumArtist || 'Unknown artist', artwork: jfImage(c, i.Id), year: i.ProductionYear ? String(i.ProductionYear) : undefined };
}

// ---------------- public API ----------------
export async function connectServer(kind: ServerKind, rawUrl: string, user: string, password: string): Promise<ServerConfig> {
  const url = normaliseUrl(rawUrl);
  if (mixedContentProblem(url)) throw new Error('mixed');
  if (kind === 'subsonic') {
    const s = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
    const c: ServerConfig = { kind, url, user, s, t: md5(password + s) };
    const pong = await sub<{ type?: string; serverVersion?: string }>(c, 'ping');
    c.name = pong.type ? `${pong.type[0].toUpperCase()}${pong.type.slice(1)}` : 'Subsonic';
    localStorage.setItem(KEY, JSON.stringify(c));
    return c;
  }
  const res = await fetch(`${url}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: jfAuthHeader() },
    body: JSON.stringify({ Username: user, Pw: password }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Wrong user name or password' : `Server answered ${res.status}`);
  const auth = await res.json() as { AccessToken: string; User: { Id: string }; ServerId: string };
  const c: ServerConfig = { kind, url, user, userId: auth.User.Id, token: auth.AccessToken, name: 'Jellyfin' };
  localStorage.setItem(KEY, JSON.stringify(c));
  return c;
}

export async function recentAlbums(c: ServerConfig): Promise<Album[]> {
  if (c.kind === 'subsonic') {
    const r = await sub<{ albumList2?: { album?: SAlbum[] } }>(c, 'getAlbumList2', { type: 'newest', size: 40 });
    return (r.albumList2?.album ?? []).map((a) => subAlbum(c, a));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Users/${c.userId}/Items`, { IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 40, Fields: 'PrimaryImageAspectRatio' });
  return r.Items.map((i) => jfAlbum(c, i));
}

export async function albumTracks(c: ServerConfig, albumId: string): Promise<Track[]> {
  const id = albumId.replace(/^server:/, '');
  if (c.kind === 'subsonic') {
    const r = await sub<{ album: SAlbum & { song?: SSong[] } }>(c, 'getAlbum', { id });
    return (r.album.song ?? []).map((s) => subTrack(c, s));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Users/${c.userId}/Items`, { ParentId: id, IncludeItemTypes: 'Audio', SortBy: 'ParentIndexNumber,IndexNumber,SortName', Recursive: true });
  return r.Items.map((i) => jfTrack(c, i));
}

export async function randomSongs(c: ServerConfig, size = 50): Promise<Track[]> {
  if (c.kind === 'subsonic') {
    const r = await sub<{ randomSongs?: { song?: SSong[] } }>(c, 'getRandomSongs', { size });
    return (r.randomSongs?.song ?? []).map((s) => subTrack(c, s));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Users/${c.userId}/Items`, { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'Random', Limit: size });
  return r.Items.map((i) => jfTrack(c, i));
}

export async function serverPlaylists(c: ServerConfig): Promise<ServerPlaylist[]> {
  if (c.kind === 'subsonic') {
    const r = await sub<{ playlists?: { playlist?: { id: string; name: string; songCount: number; coverArt?: string }[] } }>(c, 'getPlaylists');
    return (r.playlists?.playlist ?? []).map((p) => ({ id: p.id, name: p.name, count: p.songCount, artwork: subCover(c, p.coverArt) }));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Users/${c.userId}/Items`, { IncludeItemTypes: 'Playlist', Recursive: true });
  return r.Items.map((i) => ({ id: i.Id, name: i.Name, count: i.ChildCount ?? 0, artwork: jfImage(c, i.Id) }));
}

export async function playlistTracks(c: ServerConfig, id: string): Promise<Track[]> {
  if (c.kind === 'subsonic') {
    const r = await sub<{ playlist: { entry?: SSong[] } }>(c, 'getPlaylist', { id });
    return (r.playlist.entry ?? []).map((s) => subTrack(c, s));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Playlists/${id}/Items`, { UserId: c.userId });
  return r.Items.map((i) => jfTrack(c, i));
}

export async function searchServer(c: ServerConfig, query: string): Promise<Track[]> {
  if (c.kind === 'subsonic') {
    const r = await sub<{ searchResult3?: { song?: SSong[] } }>(c, 'search3', { query, songCount: 30, albumCount: 0, artistCount: 0 });
    return (r.searchResult3?.song ?? []).map((s) => subTrack(c, s));
  }
  const r = await jf<{ Items: JItem[] }>(c, `/Users/${c.userId}/Items`, { searchTerm: query, IncludeItemTypes: 'Audio', Recursive: true, Limit: 30 });
  return r.Items.map((i) => jfTrack(c, i));
}
