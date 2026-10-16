import { useMemo, useState } from 'react';
import { ALL_EXT } from '@lumo/core';
import { DOWNLOADS } from './config.js';

const PLATFORMS = [
  ['windows', 'Windows'], ['mac', 'macOS'], ['linux', 'Linux'], ['android', 'Android'], ['ios', 'iPhone and iPad'],
];

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows/i.test(ua)) return 'windows';
  if (/macintosh|mac os/i.test(ua)) return 'mac';
  if (/linux|x11|cros/i.test(ua)) return 'linux';
  return null;
}

export default function Welcome({ ingest }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const mine = useMemo(detectPlatform, []);
  // The visitor's own platform goes first, but every option stays visible so they can choose.
  const ordered = useMemo(() => [...PLATFORMS].sort((a, b) => (b[0] === mine) - (a[0] === mine)), [mine]);

  const playLink = (e) => {
    e.preventDefault();
    try {
      const u = new URL(link.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      const ok = ingest([window.lumo.addUrl(u.toString())]);
      if (!ok.length) setError('That link does not end in a supported video or audio file (.mp4, .webm, .mp3 ...).');
      else { setError(''); setLink(''); }
    } catch { setError('Enter a full link that starts with http:// or https://'); }
  };

  return (
    <div className="web-choices">
      <section>
        <h3>Play in this browser</h3>
        <p>Files stay on your device. Nothing is uploaded.</p>
        <div className="web-buttons">
          <button onClick={async () => ingest(await window.lumo.openFiles(ALL_EXT))}>Choose files</button>
          <button onClick={async () => ingest(await window.lumo.openFolder(ALL_EXT))}>Choose a folder</button>
        </div>
        <form onSubmit={playLink} className="web-link">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Or paste a direct link to a video or song" aria-label="Link to a media file" />
          <button type="submit">Play link</button>
        </form>
        {error && <p className="web-error" role="alert">{error}</p>}
      </section>

      <section>
        <h3>Download the app</h3>
        <p>Scans your whole library, remembers where you stopped, plays offline.</p>
        <ul className="web-downloads">
          {ordered.map(([key, label]) => (
            <li key={key}>
              {DOWNLOADS[key]
                ? <a className={`btn ${key === mine ? 'rec' : ''}`} href={DOWNLOADS[key]} rel="noopener">Download for {label}{key === mine ? ' (your device)' : ''}</a>
                : <span className="btn disabled" aria-disabled="true">{label}: coming soon</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
