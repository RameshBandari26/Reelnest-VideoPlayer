import { useEffect, useRef, useState } from 'react';
import { formatTime, srtToVtt, titleFromFile } from '@lumo/core';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const PATHS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  prev: 'M6 6h2v12H6zM9.5 12L18 6v12z',
  next: 'M16 6h2v12h-2zM6 18V6l8.5 6z',
  vol: 'M3 9v6h4l5 4V5L7 9z',
  full: 'M5 5h5v2H7v3H5zM14 5h5v5h-2V7h-3zM5 14h2v3h3v2H5zM17 14h2v5h-5v-2h3z',
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={PATHS[name]} fill="currentColor" /></svg>
);

export default function Player({
  item, startAt, settings, subtitlePath, queue,
  onProgress, onEnded, onPrev, onNext, onSettings, onQueueChange,
}) {
  const vref = useRef(null);
  const stage = useRef(null);
  const lastSave = useRef(0);
  const hideTimer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [subUrl, setSubUrl] = useState(null);
  const [showSubs, setShowSubs] = useState(true);
  const [hud, setHud] = useState(true);

  // Subtitles: read the file, convert SRT -> VTT, hand the <track> a blob URL.
  useEffect(() => {
    let url; let dead = false;
    setSubUrl(null);
    if (!subtitlePath) return undefined;
    window.lumo.readText(subtitlePath).then((txt) => {
      if (dead) return;
      url = URL.createObjectURL(new Blob([srtToVtt(txt)], { type: 'text/vtt' }));
      setSubUrl(url);
    }).catch(() => {});
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, [subtitlePath]);

  const applyTrackMode = () => {
    const t = vref.current?.textTracks?.[0];
    if (t) t.mode = showSubs ? 'showing' : 'hidden';
  };
  useEffect(applyTrackMode, [subUrl, showSubs]);

  const wake = () => {
    setHud(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHud(false), 2500);
  };
  useEffect(() => { wake(); return () => clearTimeout(hideTimer.current); }, [item.path]);

  const seekBy = (d) => {
    const v = vref.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + d));
  };
  const toggle = () => { const v = vref.current; if (v) (v.paused ? v.play() : v.pause()); };
  const setVol = (x) => onSettings({ volume: Math.max(0, Math.min(1, x)) });
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen());

  // Keyboard shortcuts (re-bound each render so handlers see fresh props).
  useEffect(() => {
    const h = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const keys = {
        ' ': toggle, k: toggle,
        ArrowRight: () => seekBy(e.shiftKey ? 30 : 10),
        ArrowLeft: () => seekBy(e.shiftKey ? -30 : -10),
        ArrowUp: () => setVol(settings.volume + 0.05),
        ArrowDown: () => setVol(settings.volume - 0.05),
        m: () => setVol(settings.volume > 0 ? 0 : 1),
        f: fullscreen, n: onNext, p: onPrev,
        '>': () => onSettings({ rate: RATES[Math.min(RATES.length - 1, RATES.indexOf(settings.rate) + 1)] }),
        '<': () => onSettings({ rate: RATES[Math.max(0, RATES.indexOf(settings.rate) - 1)] }),
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); wake(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const isAudio = item.kind === 'audio';

  return (
    <div className={`stage ${hud || !playing ? 'hud' : ''}`} ref={stage} onMouseMove={wake}>
      <video
        ref={vref}
        key={item.path}
        className={isAudio ? 'is-audio' : ''}
        src={window.lumo.urlFor(item.path)}
        autoPlay
        onClick={toggle}
        onDoubleClick={fullscreen}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.volume = settings.volume; v.playbackRate = settings.rate;
          if (startAt) v.currentTime = startAt;
          setDur(v.duration);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCur(v.currentTime);
          if (Date.now() - lastSave.current > 5000) { lastSave.current = Date.now(); onProgress(v.currentTime, v.duration); }
        }}
        onEnded={() => { onProgress(0, 0); onEnded(); }}
      >
        {subUrl && <track kind="subtitles" src={subUrl} default onLoad={applyTrackMode} />}
      </video>

      {isAudio && (
        <div className="art" onClick={toggle}>
          <div className="disc" style={{ '--h': hueOf(item.name) }} />
          <h2>{titleFromFile(item.name)}</h2>
        </div>
      )}

      <div className="controls">
        <input
          className="seek" type="range" min="0" max={dur || 0} step="0.1" value={cur}
          aria-label="Seek"
          onChange={(e) => { vref.current.currentTime = Number(e.target.value); }}
        />
        <div className="row">
          <button onClick={onPrev} aria-label="Previous"><Icon name="prev" /></button>
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="big"><Icon name={playing ? 'pause' : 'play'} /></button>
          <button onClick={onNext} aria-label="Next"><Icon name="next" /></button>
          <span className="time">{formatTime(cur)} / {formatTime(dur)}</span>
          <span className="grow" />
          <button className={queue.shuffle ? 'on' : ''} onClick={() => { queue.shuffle = !queue.shuffle; onQueueChange(); }}>Shuffle</button>
          <button className={queue.repeat !== 'off' ? 'on' : ''} onClick={() => { queue.cycleRepeat(); onQueueChange(); }}>
            Repeat {queue.repeat === 'off' ? 'off' : queue.repeat === 'all' ? 'all' : 'one'}
          </button>
          {subtitlePath && <button className={showSubs ? 'on' : ''} onClick={() => setShowSubs((s) => !s)}>Subtitles</button>}
          <select value={settings.rate} aria-label="Speed" onChange={(e) => { const r = Number(e.target.value); vref.current.playbackRate = r; onSettings({ rate: r }); }}>
            {RATES.map((r) => <option key={r} value={r}>{r}x</option>)}
          </select>
          <Icon name="vol" />
          <input
            className="vol" type="range" min="0" max="1" step="0.01" value={settings.volume} aria-label="Volume"
            onChange={(e) => { const x = Number(e.target.value); vref.current.volume = x; setVol(x); }}
          />
          <button onClick={fullscreen} aria-label="Fullscreen"><Icon name="full" /></button>
        </div>
      </div>
    </div>
  );
}

function hueOf(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
