import { useState } from 'react';
import { ALL_EXT } from '@lumo/core';
import { DOWNLOADS } from './config.js';

const APPS = [
  ['Windows', 'windows'], ['macOS', 'mac'], ['Linux', 'linux'], ['Android', 'android'], ['iPhone and iPad', 'ios'],
];

export default function Welcome({ ingest }) {
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const playLink = (e) => {
    e.preventDefault();
    try {
      const u = new URL(link.trim());
      if (!/^https?:$/.test(u.protocol)) throw new Error();
      const entry = window.lumo.addUrl(u.toString());
      const ok = ingest([entry]);
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
        <h3>Get the app</h3>
        <p>Scans your whole device library and plays in the background.</p>
        <ul className="web-downloads">
          {APPS.map(([label, key]) => (
            <li key={key}>
              {DOWNLOADS[key]
                ? <a className="btn" href={DOWNLOADS[key]} rel="noopener">Download for {label}</a>
                : <span className="btn disabled" aria-disabled="true">{label}: coming soon</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
