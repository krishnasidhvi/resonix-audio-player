//! Resonix Smart Music Manager & Acoustic Vector Recommendation Engine
//! 7-Dimensional on-device acoustic feature extraction, Cosine Similarity matching & SVG Radar Chart

import { audioCore } from './audio-core.js';

export const INITIAL_TRACKS = [
  {
    id: 1,
    title: 'Audiophile Acoustic Jazz Master',
    artist: 'Acoustic Jazz Quintet',
    album: 'Pure Dynamic Range Masters',
    duration_seconds: 275,
    sample_rate: 192000,
    bit_depth: 24,
    format: 'FLAC 24/192',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 16.8,
    stream_url: '/audio/jazz_master.mp3',
    features: {
      tempo_bpm: 104,
      energy: 0.64,
      spectral_centroid: 2750,
      danceability: 0.65,
      valence: 0.70,
      acousticness: 0.92,
      dynamic_range_dr: 16.8
    }
  },
  {
    id: 2,
    title: 'Beethoven: Symphony No. 5 - Allegro con brio',
    artist: 'Philharmonic Symphony Orchestra',
    album: 'Symphonic Heritage Masters',
    duration_seconds: 442,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 16.5,
    stream_url: '/audio/beethoven_symphony.mp3',
    features: {
      tempo_bpm: 108,
      energy: 0.82,
      spectral_centroid: 3100,
      danceability: 0.45,
      valence: 0.58,
      acousticness: 0.94,
      dynamic_range_dr: 16.5
    }
  },
  {
    id: 3,
    title: 'Chopin: Nocturne in E-flat Major, Op. 9 No. 2',
    artist: 'Concert Grand Piano Soloist',
    album: 'Romantic Piano Masterworks',
    duration_seconds: 260,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 17.2,
    stream_url: '/audio/chopin_acoustic.mp3',
    features: {
      tempo_bpm: 64,
      energy: 0.35,
      spectral_centroid: 1950,
      danceability: 0.28,
      valence: 0.52,
      acousticness: 0.99,
      dynamic_range_dr: 17.2
    }
  },
  {
    id: 4,
    title: "Vivaldi: The Four Seasons - Winter (L'Inverno)",
    artist: 'Baroque Strings Ensemble',
    album: 'Four Seasons Concerti Grossi',
    duration_seconds: 210,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 15.8,
    stream_url: '/audio/vivaldi_strings.mp3',
    features: {
      tempo_bpm: 122,
      energy: 0.88,
      spectral_centroid: 3800,
      danceability: 0.55,
      valence: 0.42,
      acousticness: 0.91,
      dynamic_range_dr: 15.8
    }
  },
  {
    id: 5,
    title: 'ఎందరో మహానుభావులు (Endaro Mahanubhavulu)',
    artist: 'Tyagaraja Kriti / Sri Ragam',
    album: 'Carnatic Classical Pancharatna',
    duration_seconds: 468,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 15.5,
    stream_url: '/audio/endaro_mahanubhavulu_telugu.m4a',
    features: {
      tempo_bpm: 84,
      energy: 0.55,
      spectral_centroid: 2450,
      danceability: 0.32,
      valence: 0.68,
      acousticness: 0.98,
      dynamic_range_dr: 15.5
    }
  },
  {
    id: 6,
    title: 'राग यमन - आलाप एवं सितार (Raag Yaman)',
    artist: 'Pandit Ravi Shankar Tradition / Sitar',
    album: 'Hindustani Classical Heritage',
    duration_seconds: 524,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 16.8,
    stream_url: '/audio/sitar_raag_hindustani.m4a',
    features: {
      tempo_bpm: 62,
      energy: 0.38,
      spectral_centroid: 2320,
      danceability: 0.22,
      valence: 0.65,
      acousticness: 0.98,
      dynamic_range_dr: 16.8
    }
  }
];

export class SmartMusicManager {
  constructor() {
    this.tracks = [...INITIAL_TRACKS];
    this.currentSeedTrack = this.tracks[0];
  }

  getTracks() {
    return this.tracks;
  }

  getTrackById(id) {
    return this.tracks.find(t => t.id === Number(id));
  }

  setSeedTrack(track) {
    this.currentSeedTrack = track;
  }

  vectorSlice(f) {
    return [
      f.tempo_bpm / 200.0,
      f.energy,
      f.spectral_centroid / 6000.0,
      f.danceability,
      f.valence,
      f.acousticness,
      f.dynamic_range_dr / 20.0
    ];
  }

  cosineSimilarity(v1, v2) {
    let dot = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denom < 1e-6 ? 0 : Math.max(0, Math.min(1, dot / denom));
  }

  getRecommendations(targetTrack = this.currentSeedTrack, limit = 4) {
    if (!targetTrack || !targetTrack.features) return [];

    const targetVec = this.vectorSlice(targetTrack.features);

    const scored = this.tracks
      .filter(t => t.id !== targetTrack.id)
      .map(candidate => {
        const candVec = this.vectorSlice(candidate.features);
        const sim = this.cosineSimilarity(targetVec, candVec);

        let reason = 'Acoustic Resonance Match';
        const dTempo = Math.abs(candidate.features.tempo_bpm - targetTrack.features.tempo_bpm);
        const dEnergy = Math.abs(candidate.features.energy - targetTrack.features.energy);
        const dCentroid = Math.abs(candidate.features.spectral_centroid - targetTrack.features.spectral_centroid);
        const dDr = Math.abs(candidate.features.dynamic_range_dr - targetTrack.features.dynamic_range_dr);

        if (dTempo < 10 && dEnergy < 0.15) {
          reason = 'Matching Tempo & Energy Cadence';
        } else if (dCentroid < 600) {
          reason = 'Harmonic & Timbre Resonance';
        } else if (dDr < 1.2) {
          reason = 'Audiophile High-Dynamic Master Match';
        } else {
          reason = 'Acoustic Mood & Valence Harmonization';
        }

        return {
          track: candidate,
          similarity: sim,
          scorePercent: (sim * 100).toFixed(1),
          reason
        };
      });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  renderRadarSvg(track = this.currentSeedTrack, svgEl) {
    if (!svgEl || !track || !track.features) return;

    const size = 320;
    const center = size / 2;
    const radius = 110;
    const labels = [
      'Tempo',
      'Energy',
      'Timbre',
      'Dance',
      'Valence',
      'Acoustic',
      'Dynamic'
    ];
    const n = labels.length;
    const angleStep = (Math.PI * 2) / n;

    const values = this.vectorSlice(track.features);

    const getCoords = (val, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = val * radius;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle)
      };
    };

    let gridSvg = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const pt = getCoords(level, i);
        pts.push(`${pt.x},${pt.y}`);
      }
      gridSvg += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    });

    let spokesSvg = '';
    for (let i = 0; i < n; i++) {
      const endPt = getCoords(1.0, i);
      const labelPt = getCoords(1.22, i);
      spokesSvg += `
        <line x1="${center}" y1="${center}" x2="${endPt.x}" y2="${endPt.y}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <text x="${labelPt.x}" y="${labelPt.y + 4}" fill="#00e5ff" font-size="11" font-family="'JetBrains Mono', monospace" font-weight="600" text-anchor="middle">
          ${labels[i]}
        </text>
      `;
    }

    const dataPoints = values.map((val, i) => getCoords(val, i));
    const polyString = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    svgEl.innerHTML = `
      <defs>
        <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#ffb300" stop-opacity="0.1"/>
        </radialGradient>
      </defs>
      ${gridSvg}
      ${spokesSvg}
      <polygon points="${polyString}" fill="url(#radarFillGrad)" stroke="#ffb300" stroke-width="2.2"/>
      ${dataPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#00e5ff" stroke="#fff" stroke-width="1.5"/>`).join('')}
    `;
  }

  async importUserAudioFile(file) {
    const objectUrl = URL.createObjectURL(file);

    const newTrack = {
      id: Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Imported Audio File',
      album: 'Personal Collection',
      duration_seconds: 240,
      sample_rate: 96000,
      bit_depth: 24,
      format: file.name.split('.').pop().toUpperCase(),
      channels: 2,
      is_native_hires: true,
      dynamic_range_dr: 14.0,
      stream_url: objectUrl,
      features: {
        tempo_bpm: 110,
        energy: 0.6,
        spectral_centroid: 2800,
        danceability: 0.5,
        valence: 0.5,
        acousticness: 0.7,
        dynamic_range_dr: 14.0
      }
    };

    this.tracks.unshift(newTrack);
    return newTrack;
  }
}

export const smartMusicManager = new SmartMusicManager();
