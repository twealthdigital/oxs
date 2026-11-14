import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    cssMinify: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700, // three.js is its own lazy chunk
  },
});
