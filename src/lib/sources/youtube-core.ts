// Pure helpers for YouTube links and metadata (unit-tested in Node).

export interface YouTubeRef { videoId?: string; listId?: string }

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Parse any YouTube / YouTube Music URL (or a bare 11-char video id) into ids. */
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  const s = input.trim();
  if (ID.test(s)) return { videoId: s };
  let u: URL;
  try { u = new URL(s.startsWith('http') ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (!['youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  const ref: YouTubeRef = {};
  const list = u.searchParams.get('list');
  if (list && /^[A-Za-z0-9_-]{10,}$/.test(list) && !list.startsWith('RD')) ref.listId = list; // RD… = auto "mix", not a real playlist
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (ID.test(id)) ref.videoId = id;
  } else {
    const v = u.searchParams.get('v');
    if (v && ID.test(v)) ref.videoId = v;
    const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) ref.videoId = m[1];
  }
  return ref.videoId || ref.listId ? ref : null;
}

/** ISO-8601 duration (PT1H2M3S) → seconds. */
export function isoDuration(d: string): number {
  const m = d.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return 0;
  return Math.round((+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + (+(m[4] ?? 0)));
}

/**
 * Official uploads are titled many ways: "Artist - Song (Official Video)",
 * "Full Video: Song | Movie | Singer", "#Song Lyrical | Movie"… Pull a clean song title,
 * an artist when the title names one, and drop label boilerplate.
 */
export function parseVideoTitle(raw: string, channel: string): { title: string; artist: string; album?: string } {
  let t = raw
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/^(full (video|song|audio)|lyrical( video)?|video song|audio song|official (video|audio))\s*[:\-–|]\s*/i, '')
    .replace(/#\w+/g, (h) => h.slice(1))
    .replace(/\s*[([](?:[^)\]]*?(official|video|audio|lyric|lyrical|4k|hd|full song|visuali[sz]er|remaster(ed)?|from\s+["“].+?["”]))[^)\]]*[)\]]/gi, '')
    .trim();
  let album: string | undefined;
  if (t.includes('|')) {
    const parts = t.split('|').map((p) => p.trim()).filter(Boolean);
    t = parts[0];
    album = parts.find((p, i) => i > 0 && !/(full|video|song|lyric|audio|music|records?|t-series|aditya|saregama|sony|zee|lahari|tips)/i.test(p));
  }
  const cleanChannel = channel.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
  const dash = t.split(/\s+[-–—]\s+/);
  if (dash.length >= 2) return { artist: dash[0].trim(), title: dash.slice(1).join(' - ').trim(), album };
  return { title: t, artist: cleanChannel, album };
}
