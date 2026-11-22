import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Static build: every music source is called directly from the browser
// (all of them send CORS headers), so no server or proxy is required.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: { port: 5173 },
  build: { target: 'es2022', sourcemap: false },
});
