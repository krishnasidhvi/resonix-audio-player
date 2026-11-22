import { analyse } from './analysis-core';

self.onmessage = (e: MessageEvent<{ id: number; channels: Float32Array[]; sampleRate: number }>) => {
  const { id, channels, sampleRate } = e.data;
  try {
    (self as unknown as Worker).postMessage({ id, result: analyse(channels, sampleRate) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
