//! Resonix Generative Audiophile Artwork Engine
//! Deterministic high-resolution procedural album art generator for edge-cases, offline tracks & missing covers.
//! Produces rich, vector SVG album covers with vinyl grooves, soundwave rings, audiophile badges, and vibrant gradients.

const PALETTES = [
  {
    name: 'Cyberpunk Cyan & Magenta',
    bg1: '#050c18', bg2: '#0b1d3a',
    accent1: '#00e5ff', accent2: '#d500f9',
    glow: 'rgba(0, 229, 255, 0.45)',
    labelBg: '#09152a',
    textColor: '#ffffff',
    badge: 'HI-RES 24/96'
  },
  {
    name: 'Royal Amber & Gold',
    bg1: '#120d04', bg2: '#2a1a06',
    accent1: '#ffb300', accent2: '#ff6d00',
    glow: 'rgba(255, 179, 0, 0.45)',
    labelBg: '#1c1206',
    textColor: '#ffffff',
    badge: 'AUDIOPHILE MASTER'
  },
  {
    name: 'Emerald Aurora',
    bg1: '#03140e', bg2: '#092d20',
    accent1: '#00e676', accent2: '#00b0ff',
    glow: 'rgba(0, 230, 118, 0.45)',
    labelBg: '#082117',
    textColor: '#ffffff',
    badge: 'STUDIO REFERENCE'
  },
  {
    name: 'Deep Violet & Crimson',
    bg1: '#120517', bg2: '#290a34',
    accent1: '#e040fb', accent2: '#ff1744',
    glow: 'rgba(224, 64, 251, 0.45)',
    labelBg: '#1f0727',
    textColor: '#ffffff',
    badge: 'DIRECT DSD MASTER'
  },
  {
    name: 'Sapphire Midnight',
    bg1: '#060a17', bg2: '#0f1c3f',
    accent1: '#2979ff', accent2: '#00e5ff',
    glow: 'rgba(41, 121, 255, 0.45)',
    labelBg: '#0b142d',
    textColor: '#ffffff',
    badge: 'BIT-PERFECT FLAC'
  },
  {
    name: 'Carnatic Sunset & Bronze',
    bg1: '#180703', bg2: '#351208',
    accent1: '#ff5722', accent2: '#ffab00',
    glow: 'rgba(255, 87, 34, 0.45)',
    labelBg: '#230b05',
    textColor: '#ffffff',
    badge: 'HERITAGE ARCHIVE'
  },
  {
    name: 'Classical Obsidian Mono',
    bg1: '#090a0d', bg2: '#181b22',
    accent1: '#eceff1', accent2: '#90a4ae',
    glow: 'rgba(236, 239, 241, 0.35)',
    labelBg: '#12141a',
    textColor: '#ffffff',
    badge: 'SYMPHONIC MASTER'
  }
];

function hashString(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

export class ArtworkGenerator {
  /**
   * Returns deterministic color palette based on string
   */
  static getPalette(seedStr) {
    const hash = hashString(seedStr || 'Resonix');
    return PALETTES[hash % PALETTES.length];
  }

  /**
   * Generates a rich SVG data URI album cover
   */
  static generateSvgDataUri(title = 'Unknown Track', artist = 'Unknown Artist', genre = 'Audiophile') {
    const seed = `${title}|${artist}|${genre}`;
    const hash = hashString(seed);
    const p = PALETTES[hash % PALETTES.length];

    const safeTitle = escapeXml(title.length > 28 ? title.slice(0, 27) + '…' : title);
    const safeArtist = escapeXml(artist.length > 26 ? artist.slice(0, 25) + '…' : artist);
    const safeGenre = escapeXml((genre || 'Hi-Res Audio').toUpperCase());

    // Generate vinyl rings
    const rings = [60, 95, 130, 165, 195, 215];
    const ringSvg = rings.map((r, idx) => `
      <circle cx="250" cy="230" r="${r}" fill="none" stroke="rgba(255,255,255,${0.035 + (idx % 2) * 0.025})" stroke-width="1.2" />
    `).join('');

    // Generate audio waveform bars
    const barCount = 18;
    const barSvg = Array.from({ length: barCount }).map((_, i) => {
      const h = 8 + Math.abs(Math.sin((hash + i * 1.3) * 0.7)) * 36;
      const x = 70 + i * 20;
      const y = 430 - h;
      return `<rect x="${x}" y="${y}" width="9" height="${h}" rx="4" fill="url(#accentGrad)" opacity="${0.6 + (i % 3) * 0.15}" />`;
    }).join('');

    // Initials for center emblem
    const words = (title || 'R').split(' ').filter(Boolean);
    const initials = (words[0] ? words[0][0] : 'R') + (words[1] ? words[1][0] : 'X');

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${p.bg1}" />
            <stop offset="50%" stop-color="${p.bg2}" />
            <stop offset="100%" stop-color="${p.bg1}" />
          </linearGradient>

          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${p.accent1}" />
            <stop offset="100%" stop-color="${p.accent2}" />
          </linearGradient>

          <radialGradient id="vinylGlow" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stop-color="${p.accent1}" stop-opacity="0.28" />
            <stop offset="60%" stop-color="${p.accent2}" stop-opacity="0.08" />
            <stop offset="100%" stop-color="transparent" stop-opacity="0" />
          </radialGradient>

          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Background -->
        <rect width="500" height="500" fill="url(#bgGrad)" />

        <!-- Radial Ambient Aura -->
        <circle cx="250" cy="230" r="210" fill="url(#vinylGlow)" />

        <!-- Outer Vinyl Rim -->
        <circle cx="250" cy="230" r="215" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />
        <circle cx="250" cy="230" r="218" fill="none" stroke="${p.accent1}" stroke-opacity="0.3" stroke-width="1" />

        <!-- Grooves -->
        ${ringSvg}

        <!-- Center Record Label -->
        <circle cx="250" cy="230" r="75" fill="${p.labelBg}" stroke="${p.accent1}" stroke-width="2.5" filter="url(#glowEffect)" />
        <circle cx="250" cy="230" r="72" fill="none" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4,3" stroke-width="1" />

        <!-- Center Monogram -->
        <text x="250" y="240" fill="${p.accent1}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" text-anchor="middle" letter-spacing="2">
          ${initials.toUpperCase()}
        </text>

        <!-- Center Spindle Hole -->
        <circle cx="250" cy="230" r="8" fill="#000000" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />

        <!-- Top Header Audiophile Badge -->
        <g transform="translate(30, 32)">
          <rect width="146" height="26" rx="13" fill="rgba(0,0,0,0.6)" stroke="${p.accent1}" stroke-width="1" stroke-opacity="0.6" />
          <circle cx="14" cy="13" r="4" fill="${p.accent1}" />
          <text x="26" y="17" fill="#ffffff" font-family="'JetBrains Mono', monospace, sans-serif" font-size="10" font-weight="700" letter-spacing="0.8">
            ${p.badge}
          </text>
        </g>

        <!-- Top Right Format Pill -->
        <g transform="translate(350, 32)">
          <rect width="120" height="26" rx="13" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
          <text x="60" y="17" fill="${p.accent2}" font-family="'JetBrains Mono', monospace, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="0.6">
            ${safeGenre.slice(0, 14)}
          </text>
        </g>

        <!-- Waveform Spectrum Bars -->
        <g>
          ${barSvg}
        </g>

        <!-- Bottom Metadata Plate -->
        <rect x="25" y="405" width="450" height="74" rx="14" fill="rgba(8, 12, 18, 0.78)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

        <!-- Track Title -->
        <text x="45" y="438" fill="#ffffff" font-family="'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" font-weight="700" font-size="19" letter-spacing="-0.3">
          ${safeTitle}
        </text>

        <!-- Artist Name & Studio Brand -->
        <text x="45" y="462" fill="${p.accent1}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="500" font-size="13">
          ${safeArtist}
        </text>

        <text x="455" y="462" fill="rgba(255,255,255,0.35)" font-family="'JetBrains Mono', monospace, sans-serif" font-size="10" text-anchor="end">
          RESONIX MASTER
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }

  /**
   * Resolves artwork URL: returns real image URL if valid, or generative artwork if missing.
   */
  static getArtworkUrl(track) {
    if (!track) return this.generateSvgDataUri('Resonix', 'Studio Master', 'Hi-Res');
    if (track.image && typeof track.image === 'string' && track.image.trim().length > 6) {
      return track.image.trim();
    }
    return this.generateSvgDataUri(track.title, track.artist, track.genre || track.format);
  }
}

// Global Image Error Handler for inline HTML onerror attributes
if (typeof window !== 'undefined') {
  window.handleImageError = function(imgEl, title, artist, genre) {
    if (!imgEl) return;
    imgEl.onerror = null; // Prevent infinite loop
    imgEl.src = ArtworkGenerator.generateSvgDataUri(title || 'Track', artist || 'Artist', genre || 'Hi-Res');
  };
  window.ArtworkGenerator = ArtworkGenerator;
}
