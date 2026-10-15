// Platform-neutral logic shared by the desktop and mobile apps.
// No DOM, Node, or React Native APIs in here.

export const VIDEO_EXT = ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', '3gp', 'ts', 'flv', 'wmv'];
export const AUDIO_EXT = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'wma'];
export const SUB_EXT = ['srt', 'vtt'];
export const ALL_EXT = [...VIDEO_EXT, ...AUDIO_EXT, ...SUB_EXT];

export function extOf(name = '') {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

/** @returns {'video'|'audio'|'subtitle'|null} */
export function kindOf(name) {
  const e = extOf(name);
  if (VIDEO_EXT.includes(e)) return 'video';
  if (AUDIO_EXT.includes(e)) return 'audio';
  if (SUB_EXT.includes(e)) return 'subtitle';
  return null;
}

export function titleFromFile(name = '') {
  return name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim();
}

export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Convert SRT text to WebVTT (what <video><track> understands). */
export function srtToVtt(text = '') {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (clean.startsWith('WEBVTT')) return clean + '\n';
  return 'WEBVTT\n\n' + clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') + '\n';
}

const stripExt = (p) => p.replace(/\.[^./\\]+$/, '').toLowerCase();

/** Find the subtitle that belongs to a media file: same name, or "name.en.srt". */
export function pairSubtitle(mediaPath, subtitlePaths = []) {
  const base = stripExt(mediaPath);
  const exact = subtitlePaths.find((s) => stripExt(s) === base);
  if (exact) return exact;
  return subtitlePaths.find((s) => stripExt(s).startsWith(base + '.')) ?? null;
}

/** Resume only if the viewer got past the first seconds and didn't finish. */
export function shouldResume(pos, dur) {
  if (!Number.isFinite(pos) || pos < 5) return false;
  return !Number.isFinite(dur) || dur <= 0 || pos < dur * 0.95;
}

export function filterItems(items, query = '') {
  const q = query.trim().toLowerCase();
  return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
}

export function sortItems(items, by = 'name', dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1;
  const cmp =
    by === 'name'
      ? (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      : (a, b) => (a[by] ?? 0) - (b[by] ?? 0);
  return [...items].sort((a, b) => sign * cmp(a, b));
}

export class Queue {
  constructor(items = [], { rng = Math.random } = {}) {
    this.rng = rng;
    this.repeat = 'off'; // 'off' | 'all' | 'one'
    this.shuffle = false;
    this.setItems(items);
  }
  get current() {
    return this.items[this.index] ?? null;
  }
  setItems(items, start = 0) {
    this.items = [...items];
    this.index = this.items.length ? Math.min(Math.max(start, 0), this.items.length - 1) : -1;
    this.history = [];
    return this.current;
  }
  jump(i) {
    if (i < 0 || i >= this.items.length) return this.current;
    if (this.index >= 0) this.history.push(this.index);
    this.index = i;
    return this.current;
  }
  /** auto=true means "the track ended by itself"; manual skips never stop playback. */
  next({ auto = false } = {}) {
    if (!this.items.length) return null;
    if (auto && this.repeat === 'one') return this.current;
    if (this.shuffle && this.items.length > 1) {
      let i;
      do i = Math.floor(this.rng() * this.items.length);
      while (i === this.index);
      return this.jump(i);
    }
    if (this.index < this.items.length - 1) return this.jump(this.index + 1);
    if (this.repeat === 'all') return this.jump(0);
    return auto ? null : this.current;
  }
  prev() {
    if (this.history.length) this.index = this.history.pop();
    else if (this.index > 0) this.index -= 1;
    return this.current;
  }
  cycleRepeat() {
    this.repeat = { off: 'all', all: 'one', one: 'off' }[this.repeat];
    return this.repeat;
  }
}
