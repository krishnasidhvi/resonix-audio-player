import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFixedBand, parseIndex, searchHeadphones } from '../src/lib/autoeq-core.ts';

const INDEX = `# Index
- [Sennheiser HD 600](./crinacle/GRAS%2043AG-7%20over-ear/Sennheiser%20HD%20600) by crinacle on GRAS 43AG-7
- [Sennheiser HD 600](./oratory1990/over-ear/Sennheiser%20HD%20600) by oratory1990
- [1MORE Aero (ANC Off)](./HypetheSonics/GRAS%20RA0045%20in-ear/1MORE%20Aero%20(ANC%20Off)) by HypetheSonics on GRAS RA0045
- [Sony WH-1000XM4](./Rtings/over-ear/Sony%20WH-1000XM4) by Rtings`;

test('index: one entry per model, preferring oratory1990', () => {
  const list = parseIndex(INDEX);
  assert.equal(list.length, 3);
  const hd600 = list.find((h) => h.name === 'Sennheiser HD 600')!;
  assert.equal(hd600.source, 'oratory1990');
  assert.equal(hd600.path, 'oratory1990/over-ear/Sennheiser%20HD%20600');
  assert.equal(list.find((h) => h.name.startsWith('1MORE'))!.path, 'HypetheSonics/GRAS%20RA0045%20in-ear/1MORE%20Aero%20(ANC%20Off)');
});

test('fixed-band profile → 10 gains', () => {
  const txt = `Preamp: -7.5 dB
Filter 1: ON PK Fc 31 Hz Gain 6.9 dB Q 1.41
Filter 2: ON PK Fc 62 Hz Gain 3.3 dB Q 1.41
Filter 3: ON PK Fc 125 Hz Gain -1.1 dB Q 1.41
Filter 4: ON PK Fc 250 Hz Gain -1.6 dB Q 1.41
Filter 5: ON PK Fc 500 Hz Gain 0.6 dB Q 1.41
Filter 6: ON PK Fc 1000 Hz Gain -0.8 dB Q 1.41
Filter 7: ON PK Fc 2000 Hz Gain 0.1 dB Q 1.41
Filter 8: ON PK Fc 4000 Hz Gain -1.0 dB Q 1.41
Filter 9: ON PK Fc 8000 Hz Gain 2.4 dB Q 1.41
Filter 10: ON PK Fc 16000 Hz Gain -3.0 dB Q 1.41`;
  assert.deepEqual(parseFixedBand(txt), [6.9, 3.3, -1.1, -1.6, 0.6, -0.8, 0.1, -1.0, 2.4, -3.0]);
  assert.throws(() => parseFixedBand('Preamp: -1 dB'));
});

test('search matches every word, any order', () => {
  const list = parseIndex(INDEX);
  assert.deepEqual(searchHeadphones(list, 'sony xm4').map((h) => h.name), ['Sony WH-1000XM4']);
  assert.deepEqual(searchHeadphones(list, '600 sennheiser').map((h) => h.name), ['Sennheiser HD 600']);
  assert.deepEqual(searchHeadphones(list, ' '), []);
});
