import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Queue, formatTime, kindOf, pairSubtitle, shouldResume, sortItems, filterItems, srtToVtt, titleFromFile,
} from '../src/index.js';

test('kindOf / titleFromFile', () => {
  assert.equal(kindOf('Movie.MKV'), 'video');
  assert.equal(kindOf('a.flac'), 'audio');
  assert.equal(kindOf('a.srt'), 'subtitle');
  assert.equal(kindOf('notes.txt'), null);
  assert.equal(titleFromFile('my_cool_song.mp3'), 'my cool song');
});

test('formatTime', () => {
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3725), '1:02:05');
  assert.equal(formatTime(NaN), '0:00');
});

test('srtToVtt converts commas and adds header', () => {
  const out = srtToVtt('1\r\n00:00:01,500 --> 00:00:03,000\r\nHi\r\n');
  assert.ok(out.startsWith('WEBVTT\n\n'));
  assert.ok(out.includes('00:00:01.500 --> 00:00:03.000'));
  assert.equal(srtToVtt('WEBVTT\n\nx').startsWith('WEBVTT'), true);
});

test('pairSubtitle', () => {
  const subs = ['/m/a.en.srt', '/m/b.srt'];
  assert.equal(pairSubtitle('/m/a.mkv', subs), '/m/a.en.srt');
  assert.equal(pairSubtitle('/m/B.mp4', subs), '/m/b.srt');
  assert.equal(pairSubtitle('/m/c.mp4', subs), null);
});

test('shouldResume', () => {
  assert.equal(shouldResume(3, 100), false);
  assert.equal(shouldResume(50, 100), true);
  assert.equal(shouldResume(97, 100), false);
});

test('sort + filter', () => {
  const items = [{ name: 'ep10', size: 1 }, { name: 'ep2', size: 3 }];
  assert.deepEqual(sortItems(items, 'name').map((i) => i.name), ['ep2', 'ep10']);
  assert.deepEqual(sortItems(items, 'size', 'desc').map((i) => i.name), ['ep2', 'ep10']);
  assert.equal(filterItems(items, 'EP1').length, 1);
});

test('Queue next/prev/repeat', () => {
  const q = new Queue([1, 2, 3]);
  assert.equal(q.next(), 2);
  assert.equal(q.next(), 3);
  assert.equal(q.next({ auto: true }), null);       // end of queue, auto -> stop
  assert.equal(q.next(), 3);                         // manual skip stays put
  q.repeat = 'all';
  assert.equal(q.next({ auto: true }), 1);
  q.repeat = 'one';
  assert.equal(q.next({ auto: true }), 1);
  assert.equal(q.prev(), 3);                         // history pop
});

test('Queue shuffle never repeats current', () => {
  const seq = [0, 0.5]; let n = 0;
  const q = new Queue([1, 2, 3], { rng: () => seq[n++ % 2] });
  q.shuffle = true;
  assert.equal(q.next(), 2); // first draw lands on current (index 0), second draw picks index 1
});
