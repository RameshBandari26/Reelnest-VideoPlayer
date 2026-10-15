// Serves a local file with proper HTTP Range support (206 Partial Content).
// Chromium needs this to seek in <video>/<audio>; without it every seek restarts at 0:00.
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');

const MIME = {
  mp4: 'video/mp4', m4v: 'video/mp4', mkv: 'video/x-matroska', webm: 'video/webm', mov: 'video/quicktime',
  avi: 'video/x-msvideo', '3gp': 'video/3gpp', ts: 'video/mp2t', flv: 'video/x-flv', wmv: 'video/x-ms-wmv',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac',
  ogg: 'audio/ogg', opus: 'audio/ogg', wma: 'audio/x-ms-wma',
};

async function serveFile(filePath, rangeHeader) {
  const { size } = await fs.promises.stat(filePath);
  const headers = {
    'Content-Type': MIME[path.extname(filePath).slice(1).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
  };
  const unsatisfiable = () =>
    new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });

  let start = 0;
  let end = size - 1;
  let status = 200;

  if (rangeHeader) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!m || (m[1] === '' && m[2] === '')) return unsatisfiable();
    if (m[1] === '') {
      start = Math.max(0, size - Number(m[2])); // "last N bytes"
    } else {
      start = Number(m[1]);
      if (m[2] !== '') end = Math.min(Number(m[2]), size - 1);
    }
    if (size === 0 || start >= size || start > end) return unsatisfiable();
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }

  if (size === 0) return new Response(null, { status: 200, headers: { ...headers, 'Content-Length': '0' } });
  headers['Content-Length'] = String(end - start + 1);
  return new Response(Readable.toWeb(fs.createReadStream(filePath, { start, end })), { status, headers });
}

module.exports = { serveFile, MIME };
