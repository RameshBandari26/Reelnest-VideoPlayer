# Lumo

A local video and music player for desktop (Electron) and mobile (Expo / React Native).
Shared logic lives in `packages/core`, so playlists, sorting, resume rules and subtitle handling behave the same everywhere.

```
apps/desktop    Electron + React (Vite)
apps/web        Browser version (reuses the desktop UI; static site)
apps/mobile     Expo (React Native)
packages/core   queue, resume, sort/filter, SRT->VTT, file-type helpers (tested)
```

## Run it

```bash
npm install
npm test                 # core unit tests
npm run desktop          # Electron app with hot reload
npm run web              # browser version at http://localhost:5173
npm run mobile           # Expo dev server
```

Mobile needs a dev build (media library + video are native modules), not Expo Go:
`cd apps/mobile && npx expo install --fix && npx expo run:android`
(`--fix` pins every Expo package to the versions your installed SDK expects.)

Package the desktop app: `npm run dist -w @lumo/desktop` (installers go to `apps/desktop/release`).

## Web version

`npm run build:web` produces a static site in `apps/web/dist`. Upload that folder to any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages).
The first screen offers two paths: play in the browser (choose files, a folder, or paste a direct link),
or download the desktop/mobile app. Set the real download links in `apps/web/src/config.js`
after you publish your installers; links left empty show as "coming soon".
Browser limits: files must be re-chosen after a reload (resume points are remembered), and the browser
only plays codecs it supports (MP4/H.264, WebM, MP3, AAC, FLAC...), so some MKV/HEVC files need the app.

## What works in this first pass

Desktop: open files or whole folders, drag and drop, library search/filter/sort, video and audio playback,
seek bar, volume, speed (0.5x-2x), auto-loaded subtitles (.srt/.vtt with the same file name),
resume where you left off, queue with shuffle and repeat, fullscreen, keyboard shortcuts
(Space/K play, arrows seek and volume, Shift+arrows 30s, F fullscreen, M mute, N/P next/previous, < > speed).

Mobile: scans the device library, search/filter/sort, video and music playback with native controls,
resume, queue, shuffle, speed, picture-in-picture, background audio.

## Next

1. Thumbnails (ffmpeg on desktop, `expo-video-thumbnails` on mobile)
2. Saved playlists and favorites (SQLite)
3. Equalizer and lock-screen controls on mobile
4. Wi-Fi transfer between phone and PC (QR pairing)
5. HLS/URL streaming, then cloud sync
