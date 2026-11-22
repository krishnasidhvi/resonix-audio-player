import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, activeLine } from '../src/lib/lyrics/lrc.ts';
import { transliterate, hasIndicScript, dominantScript } from '../src/lib/lyrics/translit.ts';

test('parses plain and multi-timestamp LRC lines, sorted', () => {
  const l = parseLrc('[ti:x]\n[00:10.50]second\n[00:01.00][00:20.00]chorus\n');
  assert.deepEqual(l.map((x) => [x.t, x.text]), [[1, 'chorus'], [10.5, 'second'], [20, 'chorus']]);
});

test('parses enhanced word timing', () => {
  const [line] = parseLrc('[00:12.30]<00:12.30>Hello <00:12.80>world');
  assert.equal(line.text, 'Hello world');
  assert.equal(line.words?.length, 2);
  assert.equal(line.words?.[1].t, 12.8);
});

test('applies [offset:] in ms', () => {
  const [line] = parseLrc('[offset:+500]\n[00:02.00]x');
  assert.equal(line.t, 1.5);
});

test('activeLine binary search', () => {
  const l = parseLrc('[00:01.00]a\n[00:05.00]b\n[00:09.00]c');
  assert.equal(activeLine(l, 0.5), -1);
  assert.equal(activeLine(l, 5), 1);
  assert.equal(activeLine(l, 100), 2);
});

test('Devanagari with schwa deletion', () => {
  assert.equal(transliterate('तुम ही हो'), 'Tum hee ho');
  assert.equal(transliterate('राग यमन'), 'Raag yaman');
});

test('Telugu keeps inherent vowel', () => {
  assert.equal(transliterate('ఎందరో మహానుభావులు'), 'Endaro mahaanubhaavulu');
});

test('Tamil', () => {
  assert.equal(transliterate('வணக்கம்'), 'Vanakkam');
});

test('Latin text passes through; detection works', () => {
  assert.equal(transliterate('hello'), 'Hello');
  assert.ok(hasIndicScript('abc తె'));
  assert.ok(!hasIndicScript('abc'));
});

test('dominantScript picks the main Brahmic script', () => {
  assert.equal(dominantScript('ఎందరో మహానుభావులు (Endaro)'), 'telugu');
  assert.equal(dominantScript('तुम ही हो'), 'devanagari');
  assert.equal(dominantScript('hello'), null);
});
