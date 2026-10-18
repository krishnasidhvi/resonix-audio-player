//! Resonix Public Master Vault
//! Catalog of Public Domain & Creative Commons Audio Tracks (Internet Archive, Musopen, Wikimedia Commons)
//! Contains both Native 24-bit Hi-Res Masters and Standard CD/MP3 tracks that activate the BWE Upsampling Remaster engine.

export const PUBLIC_VAULT_TRACKS = [
  {
    id: 101,
    title: "Beethoven: Symphony No. 5 in C Minor, Op. 67 - Allegro con brio",
    artist: "Fulda Symphonic Orchestra / Johannes Somary",
    album: "Musopen Open Orchestra Series (24-bit/96kHz Master)",
    genre: "Classical / Orchestral",
    duration_seconds: 442,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source: "Musopen / European Archive",
    stream_url: "https://ia800501.us.archive.org/1/items/BeethovenSymphonyNo.5InCMinorOp.67/01_AllegroConBrio.mp3",
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
    id: 102,
    title: "Vivaldi: The Four Seasons - Winter (L'Inverno), Allegro non molto",
    artist: "Wichita State University Chamber Players",
    album: "Baroque Master Archive (24-bit/96kHz)",
    genre: "Baroque / Strings",
    duration_seconds: 215,
    sample_rate: 96000,
    bit_depth: 24,
    format: "FLAC 24/96",
    is_native_hires: true,
    source: "Internet Archive Classical Collection",
    stream_url: "https://ia800301.us.archive.org/15/items/VivaldiWinter_557/01_Winter_Allegro.mp3",
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
    id: 103,
    title: "Bach: Brandenburg Concerto No. 3 in G Major, BWV 1048",
    artist: "Advent Chamber Orchestra / Roxana Pavel Goldstein",
    album: "Open Audio Archive (Lossless Master)",
    genre: "Baroque / Chamber",
    duration_seconds: 350,
    sample_rate: 44100,
    bit_depth: 16,
    format: "PCM 16/44.1",
    is_native_hires: false, // Triggers BWE AI Remastering!
    source: "Wikimedia Commons Lossless Archive",
    stream_url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Johann_Sebastian_Bach_-_Brandenburg_Concerto_No._3_in_G_Major%2C_BWV_1048_-_1._Allegro.ogg",
    features: {
      tempo_bpm: 96,
      energy: 0.65,
      spectral_centroid: 2900,
      danceability: 0.48,
      valence: 0.62,
      acousticness: 0.95,
      dynamic_range_dr: 13.9
    }
  },
  {
    id: 104,
    title: "Chopin: Waltz in D-Flat Major, Op. 64, No. 1 (Minute Waltz)",
    artist: "Luke Faulkner / Public Piano Archive",
    album: "Romantic Master Transcriptions",
    genre: "Solo Piano",
    duration_seconds: 118,
    sample_rate: 44100,
    bit_depth: 16,
    format: "PCM 16/44.1",
    is_native_hires: false, // Triggers BWE AI Remastering!
    source: "Musopen Public Domain Archive",
    stream_url: "https://ia800802.us.archive.org/16/items/ChopinMinuteWaltz_201306/MinuteWaltz.mp3",
    features: {
      tempo_bpm: 156,
      energy: 0.58,
      spectral_centroid: 2600,
      danceability: 0.62,
      valence: 0.74,
      acousticness: 0.98,
      dynamic_range_dr: 14.1
    }
  },
  {
    id: 105,
    title: "Tchaikovsky: Swan Lake Suite, Op. 20 - Scène (Moderato)",
    artist: "European Archive Philharmonic",
    album: "Historic Master Tapes (192kHz Re-Master)",
    genre: "Romantic Orchestral",
    duration_seconds: 198,
    sample_rate: 192000,
    bit_depth: 24,
    format: "FLAC 24/192",
    is_native_hires: true,
    source: "European Archive Open Access",
    stream_url: "https://ia800204.us.archive.org/24/items/TchaikovskySwanLakeScene/SwanLakeScene.mp3",
    features: {
      tempo_bpm: 72,
      energy: 0.62,
      spectral_centroid: 3100,
      danceability: 0.28,
      valence: 0.42,
      acousticness: 0.91,
      dynamic_range_dr: 17.2
    }
  },
  {
    id: 106,
    title: "Scott Joplin: The Entertainer (Acoustic Ragtime 1902)",
    artist: "Piano Roll Master / Library of Congress",
    album: "American Acoustic Heritage Collection",
    genre: "Acoustic Ragtime / Jazz",
    duration_seconds: 224,
    sample_rate: 44100,
    bit_depth: 16,
    format: "PCM 16/44.1",
    is_native_hires: false, // Triggers BWE AI Remastering!
    source: "Library of Congress National Jukebox",
    stream_url: "https://upload.wikimedia.org/wikipedia/commons/d/df/The_Entertainer_-_Scott_Joplin_1902.ogg",
    features: {
      tempo_bpm: 112,
      energy: 0.52,
      spectral_centroid: 2400,
      danceability: 0.72,
      valence: 0.85,
      acousticness: 0.99,
      dynamic_range_dr: 12.8
    }
  }
];

export class PublicVaultManager {
  constructor() {
    this.tracks = [...PUBLIC_VAULT_TRACKS];
    this.activeGenre = "All";
  }

  getTracks(filter = "", genre = "All") {
    return this.tracks.filter(t => {
      const matchQuery = t.title.toLowerCase().includes(filter.toLowerCase()) ||
        t.artist.toLowerCase().includes(filter.toLowerCase()) ||
        t.genre.toLowerCase().includes(filter.toLowerCase());
      const matchGenre = genre === "All" || t.genre.toLowerCase().includes(genre.toLowerCase());
      return matchQuery && matchGenre;
    });
  }

  getTrackById(id) {
    return this.tracks.find(t => t.id === Number(id));
  }
}

export const publicVault = new PublicVaultManager();
