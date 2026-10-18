//! Resonix Reverse-Engineered Live Trending & Commercial Music Service
//! Connects JioSaavn Open API + Audius Decentralized Protocol + Curated 320kbps Master Hits
//! Streams full-length 320kbps audio across Hindi, Telugu, English, Tamil, and Global Masters.

export const PRECACHED_TRENDING_HITS = [
  // --- TELUGU TRENDING HITS ---
  {
    id: 601,
    title: "Devara Thandavam (From 'Devara Part 1')",
    artist: "Anirudh Ravichander",
    album: "Devara Part 1 (Telugu)",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Tollywood Trending",
    duration_seconds: 215,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/714/Devara-Thandavam-From-Devara-Part-1-Telugu-2024-20241107141003-500x500.jpg",
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
  {
    id: 602,
    title: "Yeshanagula (From 'The Paradise')",
    artist: "Anirudh Ravichander, Singer Prabha",
    album: "The Paradise (Telugu)",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Tollywood Folk Beat",
    duration_seconds: 195,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/218/Yeshanagula-From-The-Paradise-Telugu-Telugu-2026-20260829173806-500x500.jpg",
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
    id: 603,
    title: "Aaya Sher (From 'The Paradise')",
    artist: "Kasarla Shyam, Anirudh Ravichander",
    album: "The Paradise (Telugu)",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Tollywood Mass Anthem",
    duration_seconds: 188,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/227/Aaya-Sher-From-The-Paradise-Telugu-Telugu-2026-20260224113206-500x500.jpg",
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
  {
    id: 604,
    title: "ఎందరో మహానుభావులు (Endaro Mahanubhavulu)",
    artist: "Tyagaraja Kriti / Sri Ragam",
    album: "Carnatic Classical Pancharatna",
    language: "te",
    language_label: "తెలుగు (Telugu)",
    genre: "Carnatic Classical",
    duration_seconds: 468,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Carnatic Heritage Master",
    image: null,
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

  // --- HINDI TRENDING HITS ---
  {
    id: 605,
    title: "Tum Hi Ho (From 'Aashiqui 2')",
    artist: "Arijit Singh / Mithoon",
    album: "Aashiqui 2 (Original Motion Picture)",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Bollywood Romance",
    duration_seconds: 262,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/216/Aashiqui-2-Hindi-2013-500x500.jpg",
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
  {
    id: 606,
    title: "Apna Bana Le (From 'Bhediya')",
    artist: "Arijit Singh, Sachin-Jigar",
    album: "Bhediya (Original Soundtrack)",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Bollywood Soul",
    duration_seconds: 258,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/829/Apna-Bana-Le-Bhediya-Hindi-2022-20221105081014-500x500.jpg",
    stream_url: "/audio/apna_bana_le_hindi.m4a",
    features: {
      tempo_bpm: 94,
      energy: 0.68,
      spectral_centroid: 2680,
      danceability: 0.58,
      valence: 0.55,
      acousticness: 0.58,
      dynamic_range_dr: 13.8
    }
  },
  {
    id: 607,
    title: "Gehra Hua (From 'Dhurandhar')",
    artist: "Arijit Singh, Shashwat Sachdev",
    album: "Dhurandhar (Hindi)",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Bollywood Melodic",
    duration_seconds: 245,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/129/Gehra-Hua-Hindi-2024-500x500.jpg",
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
    id: 608,
    title: "राग यमन - आलाप एवं सितार (Raag Yaman)",
    artist: "Pandit Ravi Shankar Tradition / Sitar",
    album: "Hindustani Classical Heritage",
    language: "hi",
    language_label: "हिन्दी (Hindi)",
    genre: "Hindustani Classical",
    duration_seconds: 524,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Hindustani Classical Master",
    image: null,
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

  // --- TAMIL TRENDING HITS ---
  {
    id: 609,
    title: "Hukum - Thalaivar Alappara (From 'Jailer')",
    artist: "Anirudh Ravichander / Super Subu",
    album: "Jailer (Original Motion Picture)",
    language: "ta",
    language_label: "தமிழ் (Tamil)",
    genre: "Kollywood Anthem",
    duration_seconds: 207,
    sample_rate: 44100,
    bit_depth: 16,
    format: "AAC 320k Full Master",
    is_native_hires: false,
    source_platform: "Studio Master",
    image: "https://c.saavncdn.com/026/Hukum-Thalaivar-Alappara-From-Jailer-Tamil-2023-20230717175402-500x500.jpg",
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

  // --- ENGLISH & GLOBAL HIGH-RES MASTERS ---
  {
    id: 610,
    title: "Midnight Skyline (Modern Pop Beat)",
    artist: "Resonix Studio Collective",
    album: "Ultra-Fidelity Beats 2026",
    language: "en",
    language_label: "English / Global",
    genre: "Modern Pop / EDM",
    duration_seconds: 240,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Studio Master",
    image: null,
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
  },
  {
    id: 611,
    title: "Blue Horizon (Audiophile Acoustic Jazz)",
    artist: "Acoustic Jazz Quintet",
    album: "Pure Dynamic Range Masters",
    language: "en",
    language_label: "English / Global",
    genre: "Acoustic Jazz",
    duration_seconds: 275,
    sample_rate: 192000,
    bit_depth: 24,
    format: "FLAC 24/192 Full Master",
    is_native_hires: true,
    source_platform: "Audiophile Direct Master",
    image: null,
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
    id: 612,
    title: "Beethoven: Symphony No. 5 - Allegro con brio",
    artist: "Philharmonic Symphony Orchestra",
    album: "Symphonic Heritage Vol. 1",
    language: "en",
    language_label: "Classical Master",
    genre: "Symphonic Classical",
    duration_seconds: 442,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Orchestral Master",
    image: null,
    stream_url: "/audio/beethoven_symphony.mp3",
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
    id: 613,
    title: "Chopin: Nocturne in E-flat Major, Op. 9 No. 2",
    artist: "Concert Grand Piano Soloist",
    album: "Romantic Piano Masterworks",
    language: "en",
    language_label: "Classical Master",
    genre: "Solo Piano Master",
    duration_seconds: 260,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Concert Hall Master",
    image: null,
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
    id: 614,
    title: "Vivaldi: The Four Seasons - Winter (L'Inverno)",
    artist: "Baroque Strings Ensemble",
    album: "Four Seasons Concerti Grossi",
    language: "en",
    language_label: "Classical Master",
    genre: "Baroque Violin Concerto",
    duration_seconds: 210,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96 Full Master",
    is_native_hires: true,
    source_platform: "Baroque Heritage Master",
    image: null,
    stream_url: "/audio/vivaldi_strings.mp3",
    features: {
      tempo_bpm: 122,
      energy: 0.88,
      spectral_centroid: 3800,
      danceability: 0.55,
      valence: 0.42,
      acousticness: 0.91,
      dynamic_range_dr: 15.8
    }
  }
];

export class LiveTrendingService {
  constructor() {
    this.precached = [...PRECACHED_TRENDING_HITS];
    this.onlineCache = new Map(); // categoryKey -> track array
    this.currentQuery = '';
    this.currentPage = 1;
    this.isLoading = false;
    this.activeCategory = 'all';
  }

  getPrecached(language = 'all') {
    if (language === 'all') return this.precached;
    return this.precached.filter(t => t.language === language);
  }

  /**
   * Loads a rich online catalog for a specific language or genre
   */
  async loadCategoryTracks(lang = 'all', page = 1) {
    this.activeCategory = lang;
    this.currentPage = page;
    this.isLoading = true;

    const cacheKey = `${lang}_p${page}`;
    if (this.onlineCache.has(cacheKey) && page === 1) {
      this.isLoading = false;
      return this.onlineCache.get(cacheKey);
    }

    let query = 'Trending Indian Top Hits';
    if (lang === 'te') query = 'Telugu Trending Hits Tollywood';
    else if (lang === 'hi') query = 'Bollywood Top 50 Trending Hits';
    else if (lang === 'ta') query = 'Tamil Top Trending Hits Kollywood';
    else if (lang === 'en') query = 'Top Pop Billboard Hits 2026';
    else if (lang === 'ja') query = 'Japanese Classical Koto Airs';
    else if (lang === 'es') query = 'Spanish Guitar Masterworks';

    try {
      const searchUrl = `/api/saavn-search?q=${encodeURIComponent(query)}&n=25&p=${page}`;
      const res = await fetch(searchUrl);
      const json = await res.json();
      let results = json.results || [];

      // If category is 'en' or 'all', also mix in Audius decentralized tracks
      if ((lang === 'en' || lang === 'all') && page === 1) {
        try {
          const audiusRes = await fetch('/api/audius-trending');
          const audiusJson = await audiusRes.json();
          if (audiusJson.results && audiusJson.results.length > 0) {
            results = [...results, ...audiusJson.results.slice(0, 15)];
          }
        } catch (e) {
          console.warn('Audius trending note:', e);
        }
      }

      // Merge with precached high-res local masters for this language so they are always at top
      const localMatches = this.getPrecached(lang);
      const combined = [...localMatches, ...results.filter(r => !localMatches.some(l => l.title === r.title))];

      this.onlineCache.set(cacheKey, combined);
      this.isLoading = false;
      return combined;
    } catch (e) {
      console.warn('Failed to load category tracks online, using precached:', e);
      this.isLoading = false;
      return this.getPrecached(lang);
    }
  }

  /**
   * Performs Live Reverse-Engineered Search with Full 320kbps Streams
   */
  async searchOnline(query, page = 1) {
    if (!query || query.trim().length < 2) {
      return this.loadCategoryTracks(this.activeCategory, 1);
    }

    this.currentQuery = query.trim();
    this.currentPage = page;
    this.isLoading = true;

    try {
      const searchUrl = `/api/saavn-search?q=${encodeURIComponent(this.currentQuery)}&n=30&p=${page}`;
      const res = await fetch(searchUrl);
      const json = await res.json();
      const results = json.results || [];

      this.isLoading = false;
      return results;
    } catch (e) {
      console.warn('Live online search fallback:', e);
      this.isLoading = false;
      return this.precached.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  /**
   * Appends next page of results
   */
  async loadMore() {
    this.currentPage += 1;
    if (this.currentQuery && this.currentQuery.length >= 2) {
      return this.searchOnline(this.currentQuery, this.currentPage);
    } else {
      return this.loadCategoryTracks(this.activeCategory, this.currentPage);
    }
  }
}

export const liveTrending = new LiveTrendingService();
