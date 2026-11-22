import { test } from 'node:test';
import assert from 'node:assert/strict';
import { integratedLoudness, estimateBpm, chroma, detectKey, camelotCompatible, analyse } from '../src/lib/audio/analysis-core.ts';

const SR = 44100;

function sine(freq: number, amp: number, seconds: number, sr = SR) {
  const x = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return x;
}

test('BS.1770: 997 Hz sine at -20 dBFS in one channel reads ≈ -23 LUFS', () => {
  const l = integratedLoudness([sine(997, 0.1, 10)], SR);
  assert.ok(Math.abs(l - -23.01) < 0.3, `got ${l}`);
});

test('BS.1770: same sine in both channels is +3 dB', () => {
  const s = sine(997, 0.1, 10);
  const l = integratedLoudness([s, s], SR);
  assert.ok(Math.abs(l - -20.0) < 0.3, `got ${l}`);
});

for (const target of [90, 128, 140]) {
  test(`tempo: click track at ${target} BPM`, () => {
    const sr = 11025;
    const x = new Float32Array(sr * 30);
    const period = (60 / target) * sr;
    for (let b = 0; b * period < x.length; b++) {
      const s = Math.round(b * period);
      for (let i = 0; i < 400 && s + i < x.length; i++) x[s + i] = Math.sin(i * 0.9) * Math.exp(-i / 60);
    }
    const { bpm } = estimateBpm(x, sr);
    assert.ok(bpm !== null && Math.abs(bpm - target) <= 2, `expected ${target}, got ${bpm}`);
  });
}

test('key: A minor triad drone is detected as A minor / 8A', () => {
  const sr = 11025, secs = 8;
  const x = new Float32Array(sr * secs);
  for (const f of [220, 261.63, 329.63, 110]) { const s = sine(f, 0.2, secs, sr); for (let i = 0; i < x.length; i++) x[i] += s[i]; }
  const k = detectKey(chroma(x, sr));
  assert.equal(k?.key, 'A minor');
  assert.equal(k?.camelot, '8A');
});

test('key: C major scale-weighted chord detected as C major / 8B', () => {
  const sr = 11025, secs = 8;
  const x = new Float32Array(sr * secs);
  for (const f of [261.63, 329.63, 392.0, 130.81]) { const s = sine(f, 0.2, secs, sr); for (let i = 0; i < x.length; i++) x[i] += s[i]; }
  const k = detectKey(chroma(x, sr));
  assert.equal(k?.key, 'C major');
  assert.equal(k?.camelot, '8B');
});

test('camelot compatibility rules', () => {
  assert.ok(camelotCompatible('8A', '8B'));
  assert.ok(camelotCompatible('8A', '9A'));
  assert.ok(camelotCompatible('12B', '1B'));
  assert.ok(!camelotCompatible('8A', '10A'));
  assert.ok(!camelotCompatible('8A', '9B'));
});

test('full analyse() returns sane shape', () => {
  const s = sine(440, 0.3, 20);
  const a = analyse([s, s], SR);
  assert.equal(a.wave.length, 480);
  assert.ok(a.energy >= 0 && a.energy <= 1);
  assert.ok(a.lufs < 0 && a.lufs > -30);
});
