//! Resonix Multilingual Public Master Vault
//! Catalog of Public Domain & Creative Commons Audio Tracks across English, Hindi, Telugu, Tamil, Japanese, Spanish, and Western Masters.

import { ArtworkGenerator } from './artwork-generator.js';

export const MULTILINGUAL_PUBLIC_TRACKS = [
  // --- TELUGU (తెలుగు) - Carnatic & Heritage ---
  {
    id: 201,
    title: "ఎందరో మహానుభావులు (Endaro Mahanubhavulu)",
    artist: "Tyagaraja Kriti / Sri Ragam",
    album: "Pancharatna Kritis (Sri Ragam, Adi Talam)",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Carnatic Classical",
    duration_seconds: 468,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Carnatic Heritage Master",
    stream_url: "/audio/endaro_mahanubhavulu_telugu.m4a",
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
    id: 202,
    title: "బ్రహ్మమొక్కటే పరబ్రహ్మమొక్కటే (Brahmam Okate)",
    artist: "Saint Annamacharya / Bowli Ragam",
    album: "Tirumala Heritage Transcriptions",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Carnatic Bhakti / Keerthana",
    duration_seconds: 284,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "Tirumala Heritage",
    stream_url: "/audio/yeshanagula_telugu.m4a",
    features: {
      tempo_bpm: 115,
      energy: 0.88,
      spectral_centroid: 3600,
      danceability: 0.78,
      valence: 0.75,
      acousticness: 0.35,
      dynamic_range_dr: 13.0
    }
  },
  {
    id: 203,
    title: "దేవర తాండవం (Devara Thandavam)",
    artist: "Anirudh Ravichander",
    album: "Devara Telugu Master",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Tollywood Acoustic Beat",
    duration_seconds: 215,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "Tollywood Studio Master",
    stream_url: "/audio/devara_telugu_hit.m4a",
    features: {
      tempo_bpm: 128,
      energy: 0.92,
      spectral_centroid: 3900,
      danceability: 0.74,
      valence: 0.65,
      acousticness: 0.22,
      dynamic_range_dr: 12.5
    }
  },

  // --- HINDI (हिन्दी) - Hindustani Classical & Heritage ---
  {
    id: 204,
    title: "राग यमन - आलाप एवं सितार (Raag Yaman)",
    artist: "Pandit Ravi Shankar Tradition / Sitar Master",
    album: "Hindustani Evening Ragas Collection",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Hindustani Classical / Sitar",
    duration_seconds: 524,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Hindustani Classical Master",
    stream_url: "/audio/sitar_raag_hindustani.m4a",
    features: {
      tempo_bpm: 62,
      energy: 0.38,
      spectral_centroid: 2320,
      danceability: 0.22,
      valence: 0.65,
      acousticness: 0.98,
      dynamic_range_dr: 16.8
    }
  },
  {
    id: 205,
    title: "गहरा हुआ - शास्त्रीय भाव (Gehra Hua)",
    artist: "Arijit Singh / Acoustic Hindustani",
    album: "Melodic Heritage Masters",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Bollywood Acoustic Melodic",
    duration_seconds: 245,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "Bollywood Acoustic Master",
    stream_url: "/audio/gehra_hua_hindi.m4a",
    features: {
      tempo_bpm: 82,
      energy: 0.56,
      spectral_centroid: 2300,
      danceability: 0.48,
      valence: 0.52,
      acousticness: 0.72,
      dynamic_range_dr: 14.5
    }
  },
  {
    id: 206,
    title: "तुम ही हो - मेलोडिक मास्टर (Tum Hi Ho)",
    artist: "Arijit Singh / Mithoon",
    album: "Aashiqui Acoustic Collection",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Acoustic Romantic Soul",
    duration_seconds: 262,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "Acoustic Soul Master",
    stream_url: "/audio/tum_hi_ho_hindi_hit.m4a",
    features: {
      tempo_bpm: 88,
      energy: 0.62,
      spectral_centroid: 2450,
      danceability: 0.52,
      valence: 0.48,
      acousticness: 0.65,
      dynamic_range_dr: 14.2
    }
  },

  // --- TAMIL (தமிழ்) - Classical & Heritage ---
  {
    id: 207,
    title: "ஹுகும் - தலைவா அலப்பறை (Hukum)",
    artist: "Anirudh Ravichander",
    album: "Jailer Kollywood Master",
    language: "ta",
    language_label: "தமிழ் (Tamil)",
    genre: "Kollywood Anthem",
    duration_seconds: 207,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "Kollywood Studio Master",
    stream_url: "/audio/hukum_tamil_hit.m4a",
    features: {
      tempo_bpm: 130,
      energy: 0.96,
      spectral_centroid: 4300,
      danceability: 0.85,
      valence: 0.72,
      acousticness: 0.15,
      dynamic_range_dr: 12.0
    }
  },
  {
    id: 208,
    title: "ஆயா ஷேர் (Aaya Sher - Mass Folk)",
    artist: "Anirudh Ravichander",
    album: "The Paradise Tamil/Telugu",
    language: "ta",
    language_label: "தமிழ் (Tamil)",
    genre: "South Indian Folk Anthem",
    duration_seconds: 188,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k",
    is_native_hires: false,
    source_platform: "South Indian Folk Master",
    stream_url: "/audio/aaya_sher_telugu.m4a",
    features: {
      tempo_bpm: 132,
      energy: 0.95,
      spectral_centroid: 4200,
      danceability: 0.82,
      valence: 0.78,
      acousticness: 0.18,
      dynamic_range_dr: 11.8
    }
  },

  // --- ENGLISH / WESTERN CLASSICAL - Native Hi-Res Orchestral Masters ---
  {
    id: 209,
    title: "Beethoven: Symphony No. 5 in C Minor - Allegro con brio",
    artist: "Philharmonic Symphony Orchestra",
    album: "Symphonic Master Series (24-bit/96kHz Master)",
    language: "en",
    language_label: "English / Western",
    genre: "Classical Orchestral",
    duration_seconds: 442,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Symphonic Master",
    stream_url: "/audio/beethoven_symphony.mp3",
    features: {
      tempo_bpm: 108,
      energy: 0.82,
      spectral_centroid: 3800,
      danceability: 0.36,
      valence: 0.45,
      acousticness: 0.88,
      dynamic_range_dr: 16.4
    }
  },
  {
    id: 210,
    title: "Vivaldi: The Four Seasons - Winter (L'Inverno), Allegro",
    artist: "Baroque Strings Ensemble",
    album: "Baroque Master Archive (24-bit/96kHz)",
    language: "en",
    language_label: "English / Western",
    genre: "Baroque Strings",
    duration_seconds: 215,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Baroque Master Archive",
    stream_url: "/audio/vivaldi_strings.mp3",
    features: {
      tempo_bpm: 124,
      energy: 0.76,
      spectral_centroid: 4200,
      danceability: 0.44,
      valence: 0.38,
      acousticness: 0.92,
      dynamic_range_dr: 15.2
    }
  },
  {
    id: 211,
    title: "Chopin: Nocturne in E-flat Major, Op. 9 No. 2",
    artist: "Concert Grand Piano Soloist",
    album: "Romantic Master Tapes (96kHz Re-Master)",
    language: "en",
    language_label: "English / Western",
    genre: "Solo Concert Piano",
    duration_seconds: 260,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Concert Hall Master",
    stream_url: "/audio/chopin_acoustic.mp3",
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
    id: 212,
    title: "Audiophile Acoustic Jazz Quintet (Live Studio)",
    artist: "Acoustic Jazz Quintet",
    album: "Pure Dynamic Range Masters (192kHz)",
    language: "en",
    language_label: "English / Western",
    genre: "Acoustic Jazz",
    duration_seconds: 275,
    sample_rate: 192000,
    bit_depth: 24,
    format: "FLAC 24/192",
    is_native_hires: true,
    source_platform: "Audiophile Studio Direct",
    stream_url: "/audio/jazz_master.mp3",
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
    id: 213,
    title: "Midnight Skyline (Modern Pop Beat)",
    artist: "Resonix Studio Collective",
    album: "Ultra-Fidelity Beats 2026",
    language: "en",
    language_label: "English / Western",
    genre: "Modern Pop / EDM",
    duration_seconds: 240,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source_platform: "Ultra-Fidelity Studio",
    stream_url: "/audio/trending_english_pop.mp3",
    features: {
      tempo_bpm: 120,
      energy: 0.85,
      spectral_centroid: 3400,
      danceability: 0.82,
      valence: 0.75,
      acousticness: 0.28,
      dynamic_range_dr: 14.0
    }
  }
];

export class PublicVaultManager {
  constructor() {
    this.tracks = MULTILINGUAL_PUBLIC_TRACKS.map(t => ({
      ...t,
      image: t.image || ArtworkGenerator.getArtworkUrl(t)
    }));
    this.activeLanguage = "all";
  }

  getTracks(filter = "", language = "all") {
    const q = filter.trim().toLowerCase();
    return this.tracks.filter(t => {
      const matchLang = language === "all" || t.language === language;
      const matchQuery = !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.language_label.toLowerCase().includes(q);
      return matchLang && matchQuery;
    });
  }

  getTrackById(id) {
    return this.tracks.find(t => t.id === Number(id));
  }
}

export const publicVault = new PublicVaultManager();
