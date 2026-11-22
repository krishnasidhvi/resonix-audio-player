// Plain search links to other services. No API or account involved: the link opens the
// service's own site/app, where the user plays the song under that service's terms.
import { cleanTitle } from './lyrics/lrclib';
import type { Track } from './types';

function query(t: Track): string {
  const title = cleanTitle(t.title);
  return /unknown/i.test(t.artist) || title.toLowerCase().includes(t.artist.toLowerCase()) ? title : `${t.artist} ${title}`;
}

export const youtubeMusicUrl = (t: Track) => `https://music.youtube.com/search?q=${encodeURIComponent(query(t))}`;
export const spotifyUrl = (t: Track) => `https://open.spotify.com/search/${encodeURIComponent(query(t))}`;
export const canLinkOut = (t: Track) => !t.isLive;
