// Main-thread side of analysis: fetch/decode, then hand PCM to the worker. Results are cached in IndexedDB.
import { db } from '../db';
import { localFile } from '../sources/local';
import type { Analysis, Track } from '../types';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (a: Analysis) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    // if the worker dies (load failure, out of memory) fail everything pending and start fresh next time
    worker.onerror = worker.onmessageerror = () => {
      for (const p of pending.values()) p.reject(new Error('Analysis stopped unexpectedly'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    worker.onmessage = (e: MessageEvent<{ id: number; result?: Analysis; error?: string }>) => {
      const p = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (e.data.result) p?.resolve(e.data.result);
      else p?.reject(new Error(e.data.error));
    };
  }
  return worker;
}

export const MAX_ANALYSIS_BYTES = 60 << 20;
export const MAX_LOCAL_ANALYSIS_BYTES = 120 << 20;

export async function allAnalyses(): Promise<Analysis[]> {
  return (await db.all<Analysis>('analysis')).filter((a) => a.track);
}

export async function cachedAnalysis(id: string): Promise<Analysis | undefined> {
  return db.get<Analysis>('analysis', id);
}

const inflight = new Map<string, Promise<Analysis>>();

export function analyseTrack(track: Track): Promise<Analysis> {
  if (inflight.has(track.id)) return inflight.get(track.id)!;
  const job = (async () => {
    const cached = await cachedAnalysis(track.id);
    if (cached) return cached;
    if (track.isLive) throw new Error('Live streams cannot be analysed');
    let buf: ArrayBuffer;
    if (track.source === 'local') {
      const file = await localFile(track);
      // decoding expands audio ~10-40x in memory; very long files would exhaust the tab
      if (file.size > MAX_LOCAL_ANALYSIS_BYTES) throw new Error('File too large to analyse in the browser');
      buf = await file.arrayBuffer();
    }
    else {
      if (!track.streamUrl) throw new Error('No stream URL');
      const res = await fetch(track.streamUrl);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const len = Number(res.headers.get('content-length') || 0);
      if (len > MAX_ANALYSIS_BYTES) throw new Error('File too large to analyse in the browser');
      buf = await res.arrayBuffer();
    }
    // Decode at the file's native rate (OfflineAudioContext resamples to its own rate; 44.1 kHz is fine for analysis).
    const ctx = new OfflineAudioContext(2, 1, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, i) => audio.getChannelData(i).slice());
    const id = ++seq;
    const result = await new Promise<Analysis>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, channels, sampleRate: audio.sampleRate }, channels.map((c) => c.buffer));
    });
    // JSON clone: the track may be a reactive proxy, which IndexedDB cannot store.
    const { artwork, streamUrl, ...rest } = JSON.parse(JSON.stringify(track)) as Track;
    const snapshot: Track = track.source === 'local' ? rest : { ...rest, artwork, streamUrl };
    const record: Analysis = { ...result, track: snapshot };
    await db.set('analysis', track.id, record);
    return record;
  })();
  inflight.set(track.id, job);
  job.finally(() => inflight.delete(track.id));
  return job;
}

/** Gain to bring a track to the target loudness, limited to avoid large boosts. */
export function normalisationDb(a: Analysis | undefined, target = -14): number {
  if (!a || !Number.isFinite(a.lufs) || a.lufs <= -60) return 0;
  return Math.max(-12, Math.min(6, target - a.lufs));
}
