// Offline app shell. Only same-origin app files are cached; audio and API calls always go to the network.
// Only successful responses are cached, and build assets no longer referenced by index.html are pruned.
const CACHE = 'resonix-shell-v3';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './app-icon.svg']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Drop cached /assets/ files that the current index.html no longer references (old deploys). */
async function prune(html) {
  const keep = new Set([...html.matchAll(/assets\/[\w.-]+/g)].map((m) => m[0]));
  const c = await caches.open(CACHE);
  for (const req of await c.keys()) {
    const m = new URL(req.url).pathname.match(/assets\/[\w.-]+$/);
    // lazily loaded chunks (languages, worker) are not in index.html: keep them unless they are older builds' entry files
    if (m && !keep.has(m[0]) && /^assets\/index-/.test(m[0])) await c.delete(req);
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    // network first so deploys show up immediately; the cached shell only when offline
    e.respondWith(
      fetch(e.request)
        .then(async (r) => {
          if (r.ok) {
            const copy = r.clone();
            const c = await caches.open(CACHE);
            await c.put('./index.html', copy.clone());
            copy.text().then(prune).catch(() => {});
          }
          return r;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  if (url.pathname.includes('/assets/')) {
    // hashed build assets never change: cache first, but never cache failures
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return r;
      })),
    );
  }
});
