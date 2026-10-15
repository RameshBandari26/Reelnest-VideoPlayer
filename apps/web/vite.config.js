import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web app reuses the desktop UI (App, Player, styles) and swaps in a browser
// implementation of window.lumo (see src/platform.js).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['../..'] } },
  build: { outDir: 'dist', emptyOutDir: true },
});
