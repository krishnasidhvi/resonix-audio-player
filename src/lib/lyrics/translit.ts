// Readable Latin transliteration for Brahmic scripts.
//
// The Unicode blocks for Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu,
// Kannada and Malayalam all follow the ISCII layout, so one table of offsets from the
// block start covers all nine scripts.
const BLOCKS: Record<string, number> = {
  devanagari: 0x0900, bengali: 0x0980, gurmukhi: 0x0a00, gujarati: 0x0a80, oriya: 0x0b00,
  tamil: 0x0b80, telugu: 0x0c00, kannada: 0x0c80, malayalam: 0x0d00,
};

const VOWELS: Record<number, string> = {
  0x05: 'a', 0x06: 'aa', 0x07: 'i', 0x08: 'ee', 0x09: 'u', 0x0a: 'oo', 0x0b: 'ru', 0x0c: 'lu',
  0x0e: 'e', 0x0f: 'e', 0x10: 'ai', 0x12: 'o', 0x13: 'o', 0x14: 'au',
};
const SIGNS: Record<number, string> = {
  0x3e: 'aa', 0x3f: 'i', 0x40: 'ee', 0x41: 'u', 0x42: 'oo', 0x43: 'ru', 0x44: 'roo',
  0x46: 'e', 0x47: 'e', 0x48: 'ai', 0x4a: 'o', 0x4b: 'o', 0x4c: 'au',
};
const CONS: Record<number, string> = {
  0x15: 'k', 0x16: 'kh', 0x17: 'g', 0x18: 'gh', 0x19: 'ng', 0x1a: 'ch', 0x1b: 'chh', 0x1c: 'j', 0x1d: 'jh', 0x1e: 'ny',
  0x1f: 't', 0x20: 'th', 0x21: 'd', 0x22: 'dh', 0x23: 'n', 0x24: 't', 0x25: 'th', 0x26: 'd', 0x27: 'dh', 0x28: 'n',
  0x29: 'n', 0x2a: 'p', 0x2b: 'ph', 0x2c: 'b', 0x2d: 'bh', 0x2e: 'm', 0x2f: 'y', 0x30: 'r', 0x31: 'r', 0x32: 'l',
  0x33: 'l', 0x34: 'zh', 0x35: 'v', 0x36: 'sh', 0x37: 'sh', 0x38: 's', 0x39: 'h',
};
const NUKTA: Record<string, string> = { k: 'q', kh: 'kh', g: 'gh', j: 'z', ph: 'f', d: 'r', dh: 'rh' };
const VIRAMA = 0x4d, NUKTA_CP = 0x3c, ANUSVARA = 0x02, CANDRABINDU = 0x01, VISARGA = 0x03;

function scriptOf(cp: number): [string, number] | null {
  for (const [name, base] of Object.entries(BLOCKS)) if (cp >= base && cp < base + 0x80) return [name, base];
  return null;
}

/** The Brahmic script most characters of `s` are written in, or null. */
export function dominantScript(s: string): string | null {
  const counts = new Map<string, number>();
  for (const ch of s) { const sc = scriptOf(ch.codePointAt(0)!); if (sc) counts.set(sc[0], (counts.get(sc[0]) ?? 0) + 1); }
  let best: string | null = null, n = 0;
  for (const [k, v] of counts) if (v > n) { best = k; n = v; }
  return best;
}

export function hasIndicScript(s: string): boolean {
  for (const ch of s) if (scriptOf(ch.codePointAt(0)!)) return true;
  return false;
}

export function transliterate(text: string): string {
  let out = '';
  let pendingA = false; // a consonant's inherent vowel not yet written
  let lastScript = '';
  const flush = (atWordEnd: boolean) => {
    // Hindi/Marathi (Devanagari) drop the word-final inherent "a" (schwa deletion).
    if (pendingA && !(atWordEnd && lastScript === 'devanagari')) out += 'a';
    pendingA = false;
  };
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0)!;
    if (cp === 0x0964 || cp === 0x0965) { flush(true); out += '.'; continue; } // danda
    const sc = scriptOf(cp);
    if (!sc) { flush(true); out += chars[i]; continue; }
    const [name, base] = sc;
    lastScript = name;
    const off = cp - base;
    if (CONS[off] !== undefined) {
      flush(false);
      let c = CONS[off];
      if (chars[i + 1]?.codePointAt(0) === base + NUKTA_CP) { c = NUKTA[c] ?? c; i++; }
      out += c;
      pendingA = true;
    } else if (SIGNS[off] !== undefined) { pendingA = false; out += SIGNS[off]; }
    else if (off === VIRAMA) pendingA = false;
    else if (VOWELS[off] !== undefined) { flush(false); out += VOWELS[off]; }
    else if (off === ANUSVARA || off === CANDRABINDU) { flush(false); out += 'n'; }
    else if (off === VISARGA) { flush(false); out += 'h'; }
    else if (off >= 0x66 && off <= 0x6f) { flush(true); out += String(off - 0x66); }
    // other marks (nukta alone, accents, avagraha) are skipped
  }
  flush(true);
  // Capitalise the start of each line for readability
  return out.replace(/(^|\n)\s*([a-z])/g, (_, a, b) => a + b.toUpperCase());
}
