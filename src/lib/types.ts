export type SourceId = 'local' | 'audius' | 'archive' | 'openverse' | 'jamendo' | 'radio' | 'youtube' | 'server';

export interface License {
  /** Short label such as "CC BY 4.0", "Public domain", "Audius (artist-uploaded)". */
  name: string;
  url?: string;
}

export interface Track {
  /** Globally unique: `${source}:${sourceId}` */
  id: string;
  source: SourceId;
  title: string;
  artist: string;
  album?: string;
  /** Seconds; 0 when unknown or a live stream. */
  duration: number;
  artwork?: string;
  /** Same artwork on other hosts, tried in order if the first fails (Audius mirrors). */
  artworkAlts?: string[];
  /** Playable URL. For local files this is filled in lazily from the file handle. */
  streamUrl?: string;
  /** Page on the original site, for attribution. */
  pageUrl?: string;
  license?: License;
  genre?: string;
  /** Human-readable format, only when the source actually reports it. */
  format?: string;
  bitrate?: number;
  isLive?: boolean;
  /** Whether the stream host sends CORS headers (needed for EQ / visualizer / analysis). */
  cors?: boolean;
  /** Local library only: key into the IndexedDB file-handle store. */
  localKey?: string;
  /** YouTube video id: played only in YouTube's visible embedded player. */
  youtubeId?: string;
  /** Source-side artist/user id (Audius user id, Archive item id…) for "more like this". */
  artistId?: string;
  /** Free-form descriptors from the source (tags, mood) used by recommendations. */
  tags?: string[];
  mood?: string;
}

export interface Analysis {
  bpm: number | null;
  /** e.g. "A minor" */
  key: string | null;
  /** Camelot wheel code, e.g. "8A" */
  camelot: string | null;
  /** Integrated loudness estimate (LUFS, K-weighted, ungated approximation). */
  lufs: number;
  /** 0..1 energy score derived from loudness + onset density. */
  energy: number;
  /** Normalised peak envelope for drawing the waveform (length = WAVE_BINS). */
  wave: number[];
  /** Short-term loudness per bin, 0..1, for the heat strip. */
  heat: number[];
  /** Start of the loudest sustained section, seconds. */
  peakSection: number;
  /** Snapshot of the analysed track (added when stored), so maps can list it without the original source. */
  track?: Track;
}

export interface SearchResult {
  source: SourceId;
  tracks: Track[];
  error?: string;
}
