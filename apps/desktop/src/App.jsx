import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_EXT, Queue, filterItems, formatTime, kindOf, pairSubtitle, shouldResume, sortItems, titleFromFile } from '@lumo/core';
import Player from './Player.jsx';

export default function App({ extra }) {
  const api = window.lumo; // read at render time: the platform layer may install it after imports run
  const [lib, setLib] = useState([]);
  const [subs, setSubs] = useState([]);
  const [resume, setResume] = useState({});
  const [settings, setSettings] = useState({ volume: 1, rate: 1 });
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [kind, setKind] = useState('all');
  const [dragging, setDragging] = useState(false);
  const [, bump] = useState(0);
  const queue = useRef(new Queue()).current;
  const loaded = useRef(false);
  const refresh = () => bump((n) => n + 1);

  useEffect(() => {
    api.loadState().then((s) => {
      if (s) { setLib(s.library ?? []); setSubs(s.subs ?? []); setResume(s.resume ?? {}); setSettings((x) => ({ ...x, ...s.settings })); }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return undefined;
    const t = setTimeout(() => api.saveState({ library: lib, subs, resume, settings }), 400);
    return () => clearTimeout(t);
  }, [lib, subs, resume, settings]);

  const ingest = useCallback((entries) => {
    const media = []; const sub = [];
    for (const e of entries) {
      const k = kindOf(e.name);
      if (k === 'subtitle') sub.push(e.path);
      else if (k) media.push({ ...e, kind: k });
    }
    setLib((old) => {
      const seen = new Set(old.map((i) => i.path));
      return [...old, ...media.filter((m) => !seen.has(m.path))];
    });
    setSubs((old) => [...new Set([...old, ...sub])]);
    return media;
  }, []);

  const visible = useMemo(() => {
    const byKind = kind === 'all' ? lib : lib.filter((i) => i.kind === kind);
    return sortItems(filterItems(byKind, query), sortBy, sortBy === 'mtime' ? 'desc' : 'asc');
  }, [lib, kind, query, sortBy]);

  const play = (item) => { queue.setItems(visible, visible.findIndex((i) => i.path === item.path)); refresh(); };
  const current = queue.current;
  const startAt = current && resume[current.path] && shouldResume(resume[current.path].pos, resume[current.path].dur) ? resume[current.path].pos : 0;

  const onProgress = (pos, dur) => {
    if (!current) return;
    const path = current.path;
    setResume((r) => {
      const next = { ...r };
      if (shouldResume(pos, dur)) next[path] = { pos, dur, at: Date.now() };
      else delete next[path];
      return next;
    });
  };

  const openFiles = async () => ingest(await api.openFiles(ALL_EXT));
  const openFolder = async () => ingest(await api.openFolder(ALL_EXT));
  const onDrop = async (e) => {
    e.preventDefault(); setDragging(false);
    ingest(await api.ingest(api.pathsForFiles(e.dataTransfer.files), ALL_EXT));
  };
  const remove = (item) => setLib((l) => l.filter((i) => i.path !== item.path));

  return (
    <div
      className={`app ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <aside className="side">
        <header>
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
            <path d="M12.5 9.5v13l10-6.5z" fill="var(--warm)" />
          </svg>
          <h1>Reelnest</h1>
        </header>
        <div className="actions">
          <button onClick={openFiles}>Open files</button>
          <button onClick={openFolder}>Add folder</button>
        </div>
        <input className="search" placeholder="Search your library" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="filters">
          {['all', 'video', 'audio'].map((k) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k === 'all' ? 'All' : k === 'video' ? 'Videos' : 'Music'}</button>
          ))}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
            <option value="name">Name</option>
            <option value="mtime">Newest</option>
            <option value="size">Size</option>
          </select>
        </div>
        <ul className="list">
          {visible.map((i) => (
            <li key={i.path} className={current?.path === i.path ? 'active' : ''}>
              <button className="item" onClick={() => play(i)}>
                <span className={`badge ${i.kind}`}>{i.kind === 'video' ? 'V' : 'M'}</span>
                <span className="name">{titleFromFile(i.name)}</span>
                {resume[i.path] && <span className="left">{formatTime(resume[i.path].pos)}</span>}
              </button>
              <button className="x" aria-label={`Remove ${i.name} from library`} onClick={() => remove(i)}>×</button>
            </li>
          ))}
          {!visible.length && <li className="empty">{lib.length ? 'Nothing matches that search.' : 'Your library is empty.'}</li>}
        </ul>
      </aside>

      <main className="main">
        {current ? (
          <Player
            item={current} startAt={startAt} settings={settings} queue={queue}
            subtitlePath={pairSubtitle(current.path, subs)}
            onProgress={onProgress}
            onEnded={() => { queue.next({ auto: true }); refresh(); }}
            onNext={() => { queue.next(); refresh(); }}
            onPrev={() => { queue.prev(); refresh(); }}
            onSettings={(p) => setSettings((s) => ({ ...s, ...p }))}
            onQueueChange={refresh}
          />
        ) : (
          <div className="welcome">
            <h2>Drop videos or music anywhere in this window</h2>
            <p>Or use Open files or Add folder. Subtitles (.srt, .vtt) with the same file name load automatically.</p>
            {extra?.({ ingest })}
          </div>
        )}
      </main>
    </div>
  );
}
