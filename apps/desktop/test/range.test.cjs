const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { serveFile } = require('../electron/range.cjs');

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-')), 'clip.mp4');
const data = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
fs.writeFileSync(file, data);
const bytes = async (res) => Buffer.from(await res.arrayBuffer());

test('no Range header: 200, full file, advertises byte ranges', async () => {
  const r = await serveFile(file);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('accept-ranges'), 'bytes');
  assert.equal(r.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(await bytes(r), data);
});

test('bytes=100-199: 206 with the right slice', async () => {
  const r = await serveFile(file, 'bytes=100-199');
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 100-199/1000');
  assert.equal(r.headers.get('content-length'), '100');
  assert.deepEqual(await bytes(r), data.subarray(100, 200));
});

test('open-ended range (seek to the middle): bytes=500-', async () => {
  const r = await serveFile(file, 'bytes=500-');
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 500-999/1000');
  assert.deepEqual(await bytes(r), data.subarray(500));
});

test('suffix range bytes=-50 and end clamped past EOF', async () => {
  assert.deepEqual(await bytes(await serveFile(file, 'bytes=-50')), data.subarray(950));
  const r = await serveFile(file, 'bytes=900-5000');
  assert.equal(r.headers.get('content-range'), 'bytes 900-999/1000');
});

test('out-of-range or malformed: 416', async () => {
  assert.equal((await serveFile(file, 'bytes=2000-')).status, 416);
  assert.equal((await serveFile(file, 'bytes=abc')).status, 416);
});
