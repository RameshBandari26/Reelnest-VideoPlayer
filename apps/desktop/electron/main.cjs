const { app, BrowserWindow, dialog, ipcMain, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { serveFile } = require('./range.cjs');

// lumo://media/<encoded path> lets the renderer stream local files with seeking,
// without turning off web security. Only paths the user opened/dropped/scanned are served.
protocol.registerSchemesAsPrivileged([
  { scheme: 'lumo', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

const allowed = new Set();
const allow = (p) => allowed.add(path.resolve(p));
const statePath = () => path.join(app.getPath('userData'), 'state.json');

async function entryFor(p) {
  const st = await fs.stat(p);
  allow(p);
  return { path: p, name: path.basename(p), size: st.size, mtime: st.mtimeMs };
}

async function walk(dir, exts, out, depth = 0) {
  if (depth > 8 || out.length > 20000) return;
  let ents;
  try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, exts, out, depth + 1);
    else if (exts.includes(path.extname(e.name).slice(1).toLowerCase())) out.push(await entryFor(full));
  }
}

async function ingest(paths, exts) {
  const out = [];
  for (const p of paths) {
    try {
      const st = await fs.stat(p);
      if (st.isDirectory()) await walk(p, exts, out);
      else if (exts.includes(path.extname(p).slice(1).toLowerCase())) out.push(await entryFor(p));
    } catch { /* unreadable path: skip */ }
  }
  return out;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 740, minWidth: 820, minHeight: 520,
    backgroundColor: '#15121f',
    title: 'Lumo',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  });
  if (process.env.LUMO_DEV) win.loadURL('http://localhost:5173');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  protocol.handle('lumo', async (req) => {
    const p = path.resolve(decodeURIComponent(new URL(req.url).pathname.slice(1)));
    if (!allowed.has(p)) return new Response('Forbidden', { status: 403 });
    try { return await serveFile(p, req.headers.get('range')); } // 206 responses make seeking work
    catch { return new Response('Not found', { status: 404 }); }
  });

  ipcMain.handle('files:open', async (_e, exts) => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Media and subtitles', extensions: exts }],
    });
    return r.canceled ? [] : ingest(r.filePaths, exts);
  });
  ipcMain.handle('folder:open', async (_e, exts) => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? [] : ingest(r.filePaths, exts);
  });
  ipcMain.handle('files:ingest', (_e, paths, exts) => ingest(paths, exts));
  ipcMain.handle('text:read', async (_e, p) => {
    if (!allowed.has(path.resolve(p))) throw new Error('Not allowed');
    return fs.readFile(p, 'utf8');
  });
  ipcMain.handle('state:load', async () => {
    try {
      const s = JSON.parse(await fs.readFile(statePath(), 'utf8'));
      [...(s.library ?? []).map((i) => i.path), ...(s.subs ?? [])].forEach(allow);
      return s;
    } catch { return null; }
  });
  ipcMain.handle('state:save', (_e, s) => fs.writeFile(statePath(), JSON.stringify(s)));

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
