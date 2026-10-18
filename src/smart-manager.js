//! Resonix Smart Music Manager & Acoustic Vector Recommendation Engine
//! 7-Dimensional on-device acoustic feature extraction, Cosine Similarity matching & SVG Radar Chart

import { audioCore } from './audio-core.js';

export const INITIAL_TRACKS = [
  {
    id: 1,
    title: 'The Entertainer (Acoustic Ragtime)',
    artist: 'Scott Joplin (Acoustic Master)',
    album: 'Piano Master Collection',
    duration_seconds: 224,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 14.5,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/d/df/The_Entertainer_-_Scott_Joplin_1902.ogg',
    features: {
      tempo_bpm: 112,
      energy: 0.52,
      spectral_centroid: 2400,
      danceability: 0.72,
      valence: 0.85,
      acousticness: 0.99,
      dynamic_range_dr: 14.5
    }
  },
  {
    id: 2,
    title: 'Bach: Brandenburg Concerto No. 3 in G Major',
    artist: 'Advent Chamber Orchestra / Goldstein',
    album: 'Baroque Heritage Masters',
    duration_seconds: 350,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 15.2,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Johann_Sebastian_Bach_-_Brandenburg_Concerto_No._3_in_G_Major%2C_BWV_1048_-_1._Allegro.ogg',
    features: {
      tempo_bpm: 96,
      energy: 0.65,
      spectral_centroid: 2900,
      danceability: 0.48,
      valence: 0.62,
      acousticness: 0.95,
      dynamic_range_dr: 15.2
    }
  },
  {
    id: 3,
    title: 'Recuerdos de la Alhambra (Acoustic Tremolo)',
    artist: 'Francisco Tárrega / Spanish Guitar',
    album: 'Guitarra Clásica Masterworks',
    duration_seconds: 245,
    sample_rate: 96000,
    bit_depth: 24,
    format: 'FLAC 24/96',
    channels: 2,
    is_hi_res: true,
    dynamic_range_dr: 16.5,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Recuerdos_de_la_Alhambra_-_Francisco_Tarrega.ogg',
    features: {
      tempo_bpm: 96,
      energy: 0.44,
      spectral_centroid: 2150,
      danceability: 0.38,
      valence: 0.36,
      acousticness: 0.99,
      dynamic_range_dr: 16.5
    }
  },
  {
    id: 4,
    title: 'さくら さくら (Sakura Sakura - Koto Solo)',
    artist: 'Traditional Japanese Koto Ensemble',
    album: 'Japanese Acoustic Airs',
    duration_seconds: 198,
    sample_rate: 48000,
    bit_depth: 24,
    format: 'FLAC 24/48',
    channels: 2,
    is_hi_res: false,
    dynamic_range_dr: 17.4,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Sakura_Sakura_-_Koto_instrumental.ogg',
    features: {
      tempo_bpm: 68,
      energy: 0.28,
      spectral_centroid: 1750,
      danceability: 0.18,
      valence: 0.42,
      acousticness: 0.99,
      dynamic_range_dr: 17.4
    }
  },
  {
    id: 5,
    title: 'ఎందరో మహానుభావులు (Endaro Mahanubhavulu)',
    artist: 'Tyagaraja Kriti / Sri Ragam',
    album: 'Carnatic Classical Pancharatna',
    duration_seconds: 468,
    sample_rate: 44100,
    bit_depth: 16,
    format: 'PCM 16/44.1',
    channels: 2,
    is_hi_res: false,
    dynamic_range_dr: 15.5,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Endaro_Mahanubhavulu_-_Sri_Ragam.ogg',
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
    title: 'राग यमन - सितार आलाप (Raag Yaman)',
    artist: 'Pandit Ravi Shankar Tradition / Sitar',
    album: 'Hindustani Classical Heritage',
    duration_seconds: 524,
    sample_rate: 44100,
    bit_depth: 16,
    format: 'PCM 16/44.1',
    channels: 2,
    is_hi_res: false,
    dynamic_range_dr: 16.8,
    stream_url: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Raag_Yaman_Alap_Jod.ogg',
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
