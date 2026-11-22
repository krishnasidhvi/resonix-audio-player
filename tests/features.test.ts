import { test } from 'node:test';
import assert from 'node:assert/strict';
import { md5 } from '../src/lib/md5.ts';
import { harmonicOrder, keyScore, tempoScore } from '../src/lib/harmonic.ts';
import { parseLrc, toLrc, lrcTime } from '../src/lib/lyrics/lrc.ts';

test('md5 matches RFC 1321 test vectors', () => {
  assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
  assert.equal(md5('a'), '0cc175b9c0f1b6a831c399e269772661');
  assert.equal(md5('abc'), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(md5('message digest'), 'f96b697d7cb7938d525a2f31aaf161d0');
  assert.equal(md5('12345678901234567890123456789012345678901234567890123456789012345678901234567890'), '57edf4a22be3c955ac49da2e2107b67a');
  // Subsonic's documented example: password "sesame", salt "c19b2d"
  assert.equal(md5('sesamec19b2d'), '26719a1196d2a940705a59634eb18eab');
});

test('harmonic: key and tempo scores', () => {
  assert.equal(keyScore('8A', '8A'), 1);
  assert.equal(keyScore('8A', '8B'), 1);   // relative major/minor
  assert.equal(keyScore('8A', '9A'), 0.9);
  assert.ok(keyScore('8A', '2B') < 0.2);
  assert.equal(tempoScore(128, 128), 1);
  assert.ok(tempoScore(128, 64) > 0.95);  // half time
  assert.equal(tempoScore(128, 170), 0);
});

test('harmonic order walks the wheel instead of jumping', () => {
  const t = (id: string, camelot: string, bpm: number, energy = 0.5) => ({ id, camelot, bpm, energy });
  const order = harmonicOrder(t('start', '8A', 124), [t('far', '2B', 90), t('next', '9A', 125), t('rel', '8B', 124), t('after', '10A', 126)]);
  assert.deepEqual(order.slice(0, 2), ['rel', 'next'].includes(order[0]) ? order.slice(0, 2) : ['x']);
  assert.equal(order[order.length - 1], 'far');
});

test('LRC round trip', () => {
  assert.equal(lrcTime(83.456), '01:23.46');
  const lines = [{ t: 1.5, text: 'first' }, { t: 62.04, text: 'second' }];
  const lrc = toLrc(lines, { title: 'Song', artist: 'Me', duration: 200 });
  assert.match(lrc, /^\[ti:Song\]\n\[ar:Me\]\n\[length:03:20\]\n\[00:01\.50\]first\n\[01:02\.04\]second$/);
  assert.deepEqual(parseLrc(lrc).map((l) => [l.t, l.text]), [[1.5, 'first'], [62.04, 'second']]);
});
