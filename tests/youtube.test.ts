import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoDuration, parseVideoTitle, parseYouTubeUrl } from '../src/lib/sources/youtube-core.ts';

test('parses every common YouTube / YouTube Music link shape', () => {
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), { videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?si=abc'), { videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI'), { videoId: 'dQw4w9WgXcQ', listId: 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI' });
  assert.deepEqual(parseYouTubeUrl('https://music.youtube.com/playlist?list=OLAK5uy_kAbCdEfGhIjKlMnOpQrStUvWxYz012'), { listId: 'OLAK5uy_kAbCdEfGhIjKlMnOpQrStUvWxYz012' });
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'), { videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseYouTubeUrl('m.youtube.com/watch?v=dQw4w9WgXcQ'), { videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseYouTubeUrl('dQw4w9WgXcQ'), { videoId: 'dQw4w9WgXcQ' });
});

test('ignores auto-generated mixes and non-YouTube links', () => {
  assert.deepEqual(parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ'), { videoId: 'dQw4w9WgXcQ' });
  assert.equal(parseYouTubeUrl('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseYouTubeUrl('hello world'), null);
});

test('ISO-8601 durations', () => {
  assert.equal(isoDuration('PT4M13S'), 253);
  assert.equal(isoDuration('PT1H2M3S'), 3723);
  assert.equal(isoDuration('PT45S'), 45);
  assert.equal(isoDuration('P0D'), 0);
});

test('cleans label-style titles', () => {
  assert.deepEqual(parseVideoTitle('Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)', 'Rick Astley'),
    { artist: 'Rick Astley', title: 'Never Gonna Give You Up', album: undefined });
  const telugu = parseVideoTitle('Full Video: Samajavaragamana Song | Ala Vaikunthapurramuloo | Allu Arjun | Thaman S', 'Aditya Music');
  assert.equal(telugu.title, 'Samajavaragamana Song');
  assert.equal(telugu.artist, 'Aditya Music');
  assert.equal(telugu.album, 'Ala Vaikunthapurramuloo');
  const topic = parseVideoTitle('Tum Hi Ho', 'Arijit Singh - Topic');
  assert.deepEqual(topic, { title: 'Tum Hi Ho', artist: 'Arijit Singh', album: undefined });
});
