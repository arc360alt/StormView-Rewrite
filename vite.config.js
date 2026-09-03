import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // The Open-Meteo map layer ships an Emscripten module that loads its `.wasm`
  // via `new URL('...wasm', import.meta.url)`. esbuild's dep pre-bundling breaks
  // that relative path (the wasm 404s and comes back as HTML). Excluding these
  // packages makes Vite serve them straight from node_modules, where the wasm
  // sits next to its loader and resolves correctly.
  optimizeDeps: {
    exclude: [
      '@openmeteo/weather-map-layer',
      '@openmeteo/file-reader',
      '@openmeteo/file-format-wasm',
    ],
  },
});
