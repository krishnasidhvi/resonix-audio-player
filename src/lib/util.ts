export function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export function fmtDuration(s: number): string {
  if (s < 60) return `${Math.round(s)} s`;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic hue for a string (fallback artwork and accents). */
export const hueOf = (s: string) => hash(s) % 360;

const colorCache = new Map<string, number | null>();

/**
 * Dominant vivid hue of an image, or null when the image is not CORS-readable.
 * Pixels are scored by chroma so muddy greys don't win.
 */
export function artworkHue(src: string): Promise<number | null> {
  if (colorCache.has(src)) return Promise.resolve(colorCache.get(src)!);
  // archive.org image service sends no CORS headers; probing it would only log errors
  if (/archive\.org\/services\/img/.test(src)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data;
        const bins = new Float64Array(36);
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
          const max = Math.max(r, gg, b), min = Math.min(r, gg, b), ch = max - min;
          if (ch < 0.12 || max < 0.15) continue;
          let h = max === r ? ((gg - b) / ch) % 6 : max === gg ? (b - r) / ch + 2 : (r - gg) / ch + 4;
          h = (h * 60 + 360) % 360;
          bins[Math.floor(h / 10)] += ch * ch;
        }
        let best = -1, hue: number | null = null;
        bins.forEach((v, i) => { if (v > best && v > 0.5) { best = v; hue = i * 10 + 5; } });
        colorCache.set(src, hue);
        resolve(hue);
      } catch { colorCache.set(src, null); resolve(null); }
    };
    img.onerror = () => { colorCache.set(src, null); resolve(null); };
    img.src = src;
  });
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t = 0;
  return (...a: A) => { clearTimeout(t); t = window.setTimeout(() => fn(...a), ms); };
}

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
