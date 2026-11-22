import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Static build: every music source is called directly from the browser
// (all of them send CORS headers), so no server or proxy is required.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  // shown in Settings → About
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173 },
  build: { target: 'es2022', sourcemap: false },
});
