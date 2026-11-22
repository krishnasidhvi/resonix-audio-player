import type { License, SourceId } from '../types';

/** A browsable collection whose tracks are loaded on demand (Internet Archive items, local folders). */
export interface Album {
  id: string;
  source: SourceId;
  title: string;
  artist: string;
  artwork?: string;
  license?: License;
  pageUrl?: string;
  year?: string;
}
