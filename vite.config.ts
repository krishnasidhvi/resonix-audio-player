import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Static build: every music source is called directly from the browser
// (all of them send CORS headers), so no server or proxy is required.
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    {
      // precache.json lists every built file so the service worker (public/sw.js) can make the
      // whole app available offline on the first visit, including lazily loaded chunks
      name: 'resonix-precache-list',
      apply: 'build',
      generateBundle(_, bundle) {
        const files = Object.keys(bundle).filter((f) => f.startsWith('assets/')).sort();
        this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
      },
    },
  ],
  // shown in Settings → About
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173 },
  build: { target: 'es2022', sourcemap: false },
});
