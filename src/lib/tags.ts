// Minimal metadata readers for local files: ID3v2.3/2.4 (MP3), FLAC Vorbis comments,
// and MP4/M4A iTunes atoms. Only the fields the player needs are read.
export interface Tags {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  track?: number;
  picture?: Blob;
}

const latin1 = new TextDecoder('latin1');
const utf8 = new TextDecoder('utf-8');
const utf16 = new TextDecoder('utf-16');
const utf16be = new TextDecoder('utf-16be');

function synchsafe(b: Uint8Array, o: number) {
  return (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
}
function u32(b: Uint8Array, o: number) {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}
const clean = (s: string) => s.replace(/\0+$/g, '').replace(/\0/g, ' / ').trim() || undefined;

function decodeId3Text(enc: number, data: Uint8Array): string | undefined {
  switch (enc) {
    case 0: return clean(latin1.decode(data));
    case 1: return clean(utf16.decode(data));
    case 2: return clean(utf16be.decode(data));
    default: return clean(utf8.decode(data));
  }
}

function readId3(b: Uint8Array): Tags {
  const tags: Tags = {};
  const ver = b[3];
  const size = synchsafe(b, 6);
  let o = 10;
  if (b[5] & 0x40) o += ver === 4 ? synchsafe(b, 10) : u32(b, 10) + 4; // extended header
  const end = Math.min(10 + size, b.length);
  while (o + 10 <= end) {
    const id = latin1.decode(b.subarray(o, o + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const fsize = ver === 4 ? synchsafe(b, o + 4) : u32(b, o + 4);
    const body = b.subarray(o + 10, o + 10 + fsize);
    o += 10 + fsize;
    if (fsize <= 0) break;
    const text = () => decodeId3Text(body[0], body.subarray(1));
    if (id === 'TIT2') tags.title = text();
    else if (id === 'TPE1') tags.artist = text();
    else if (id === 'TALB') tags.album = text();
    else if (id === 'TCON') tags.genre = text()?.replace(/^\(\d+\)/, '');
    else if (id === 'TRCK') tags.track = parseInt(text() ?? '', 10) || undefined;
    else if (id === 'APIC' && !tags.picture) {
      const enc = body[0];
      let p = 1;
      const mimeEnd = body.indexOf(0, p);
      const mime = latin1.decode(body.subarray(p, mimeEnd)) || 'image/jpeg';
      p = mimeEnd + 2; // skip NUL + picture type
      // skip description (NUL-terminated; double NUL for UTF-16)
      if (enc === 1 || enc === 2) { while (p + 1 < body.length && (body[p] || body[p + 1])) p += 2; p += 2; }
      else { while (p < body.length && body[p]) p++; p++; }
      tags.picture = new Blob([body.slice(p)], { type: mime.includes('/') ? mime : `image/${mime.toLowerCase()}` });
    }
  }
  return tags;
}

function readFlac(b: Uint8Array): Tags {
  const tags: Tags = {};
  let o = 4;
  while (o + 4 <= b.length) {
    const last = b[o] & 0x80;
    const type = b[o] & 0x7f;
    const len = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
    const body = b.subarray(o + 4, o + 4 + len);
    if (type === 4) {
      const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
      let p = 4 + dv.getUint32(0, true);
      const n = dv.getUint32(p, true); p += 4;
      for (let i = 0; i < n && p + 4 <= body.length; i++) {
        const l = dv.getUint32(p, true); p += 4;
        const [k, ...v] = utf8.decode(body.subarray(p, p + l)).split('=');
        p += l;
        const val = v.join('=');
        const key = k.toUpperCase();
        if (key === 'TITLE') tags.title = val;
        else if (key === 'ARTIST') tags.artist ??= val;
        else if (key === 'ALBUM') tags.album = val;
        else if (key === 'GENRE') tags.genre = val;
        else if (key === 'TRACKNUMBER') tags.track = parseInt(val, 10) || undefined;
      }
    } else if (type === 6 && !tags.picture && body.length > 32) {
      const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
      let p = 4;
      const ml = dv.getUint32(p); p += 4;
      const mime = latin1.decode(body.subarray(p, p + ml)); p += ml;
      const dl = dv.getUint32(p); p += 4 + dl + 16;
      const size = dv.getUint32(p); p += 4;
      tags.picture = new Blob([body.slice(p, p + size)], { type: mime || 'image/jpeg' });
    }
    if (last) break;
    o += 4 + len;
  }
  return tags;
}

function readMp4(b: Uint8Array): Tags {
  const tags: Tags = {};
  const walk = (start: number, end: number, path: string) => {
    let o = start;
    while (o + 8 <= end) {
      const size = u32(b, o);
      const type = latin1.decode(b.subarray(o + 4, o + 8));
      if (size < 8 || o + size > end) break;
      const inner = path + '/' + type;
      if (['moov', 'udta', 'ilst'].includes(type)) walk(o + 8, o + size, inner);
      else if (type === 'meta') walk(o + 12, o + size, inner);
      else if (path.endsWith('ilst')) {
        // child atom contains a 'data' atom: size(4) 'data'(4) type(4) locale(4) payload
        const dataType = u32(b, o + 16) & 0xffffff;
        const payload = b.subarray(o + 24, o + size);
        const txt = () => utf8.decode(payload);
        if (type === '©nam') tags.title = txt();
        else if (type === '©ART') tags.artist = txt();
        else if (type === '©alb') tags.album = txt();
        else if (type === '©gen') tags.genre = txt();
        else if (type === 'trkn' && payload.length >= 4) tags.track = (payload[2] << 8) | payload[3];
        else if (type === 'covr') tags.picture = new Blob([payload.slice()], { type: dataType === 14 ? 'image/png' : 'image/jpeg' });
      }
      o += size;
    }
  };
  walk(0, b.length, '');
  return tags;
}

/** Reads tags from the start of the file (first 1 MB is enough for nearly all files; 'moov' may be later for M4A). */
export async function readTags(file: File): Promise<Tags> {
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const sig = latin1.decode(head.subarray(0, 4));
    if (sig.startsWith('ID3')) {
      const size = synchsafe(head, 6) + 10;
      return readId3(new Uint8Array(await file.slice(0, Math.min(size, 8 << 20)).arrayBuffer()));
    }
    if (sig === 'fLaC') return readFlac(new Uint8Array(await file.slice(0, 8 << 20).arrayBuffer()));
    if (latin1.decode(head.subarray(4, 8)) === 'ftyp') {
      // moov can be at the end of the file; read the whole thing only for reasonably small files
      const buf = file.size < 64 << 20 ? await file.arrayBuffer() : await file.slice(0, 4 << 20).arrayBuffer();
      return readMp4(new Uint8Array(buf));
    }
  } catch { /* fall through to filename */ }
  return {};
}

/** "01 - Artist - Title.mp3" → { artist, title } when tags are missing. */
export function tagsFromFilename(name: string): Tags {
  const base = name.replace(/\.[^.]+$/, '').replace(/^\d{1,3}[\s._-]+/, '').replace(/_/g, ' ');
  const parts = base.split(/\s+-\s+/);
  return parts.length >= 2 ? { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() } : { title: base.trim() };
}

export const AUDIO_EXT = /\.(mp3|flac|m4a|aac|ogg|oga|opus|wav|webm|aiff?)$/i;
