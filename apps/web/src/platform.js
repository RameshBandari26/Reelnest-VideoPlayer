// Browser implementation of the same `window.lumo` API the Electron preload provides.
// Files never leave the user's device: they are played through object URLs.
import { ALL_EXT } from '@lumo/core';

const files = new Map(); // id -> File | { url } for links
const STATE_KEY = 'lumo.web.state';
const nameOf = (url) => decodeURIComponent((url.split('?')[0].split('/').pop() || 'stream'));

function register(file) {
  let id = file.webkitRelativePath || file.name;
  const dot = id.lastIndexOf('.');
  const stem = dot < 0 ? id : id.slice(0, dot);
  const ext = dot < 0 ? '' : id.slice(dot);
  for (let n = 2; files.has(id) && !sameFile(files.get(id), file); n += 1) id = `${stem} (${n})${ext}`;
  files.set(id, file);
  return id;
}
const sameFile = (a, b) => a.size === b.size && a.lastModified === b.lastModified && a.name === b.name;
const entryFor = (id) => {
  const f = files.get(id);
  return f.url
    ? { path: id, name: nameOf(f.url), size: 0, mtime: Date.now(), url: f.url }
    : { path: id, name: f.name, size: f.size, mtime: f.lastModified };
};
const allowedExt = (id, exts) => exts.includes((id.split('.').pop() || '').toLowerCase());

function pick({ folder = false, exts = ALL_EXT } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    if (folder) input.webkitdirectory = true;
    else input.accept = exts.map((e) => `.${e}`).join(',');
    input.onchange = () => resolve(Array.from(input.files));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

export function installPlatform() {
  const urlMap = new Map(); // id -> object URL (revoked never within a session; freed on reload)
  window.lumo = {
    urlFor: (id) => {
      const f = files.get(id);
      if (!f) return '';
      if (f.url) return f.url;
      if (!urlMap.has(id)) urlMap.set(id, URL.createObjectURL(f));
      return urlMap.get(id);
    },
    openFiles: async (exts) => (await pick({ exts })).map(register).filter((id) => allowedExt(id, exts)).map(entryFor),
    openFolder: async (exts) => (await pick({ folder: true, exts })).map(register).filter((id) => allowedExt(id, exts)).map(entryFor),
    pathsForFiles: (list) => Array.from(list).map(register),
    ingest: async (ids, exts) => ids.filter((id) => allowedExt(id, exts)).map(entryFor),
    readText: async (id) => {
      const f = files.get(id);
      return f?.url ? (await fetch(f.url)).text() : f.text();
    },
    addUrl: (url) => {
      const id = `link:${url}`;
      files.set(id, { url });
      return entryFor(id);
    },
    // Files can't be re-opened after a reload, so only resume points and settings persist.
    loadState: async () => {
      try { return JSON.parse(localStorage.getItem(STATE_KEY)); } catch { return null; }
    },
    saveState: async ({ resume, settings }) => {
      try { localStorage.setItem(STATE_KEY, JSON.stringify({ resume, settings })); } catch { /* storage full or blocked */ }
    },
  };
}
