// Offline app shell. Same-origin app files are cached so the whole app opens without a connection;
// audio and API calls always go to the network (saved music is played from IndexedDB by the app).
// precache.json (written at build time, see vite.config.ts) lists every build file, including the
// lazily loaded ones (languages, the analysis worker), so they are all available offline, not only
// the parts that were already opened. Only successful responses are cached, and files of older
// builds are deleted once the new ones are in.
const CACHE = 'resonix-shell-v4';
// covers of tracks saved for offline whose host doesn't allow pages to read them (the app stores
// the others itself); must match ART_CACHE in src/lib/stores/offline.svelte.ts
const ART_CACHE = 'resonix-offline-art';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './app-icon.svg']))
      .then(() => syncAssets())
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ART_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Cache every file of the current build that isn't cached yet, then drop files of older builds. */
async function syncAssets() {
  let files;
  try {
    const r = await fetch('./precache.json', { cache: 'no-store' });
    if (!r.ok) return;
    files = await r.json();
  } catch { return; }
  const c = await caches.open(CACHE);
  const wanted = new Set(files.map((f) => new URL(f, self.registration.scope).href));
  for (const url of wanted) {
    if (await c.match(url, { ignoreVary: true })) continue;
    try { const r = await fetch(url); if (r.ok) await c.put(url, r); } catch { return; } // offline again: try next time
  }
  for (const req of await c.keys()) {
    if (new URL(req.url).pathname.includes('/assets/') && !wanted.has(req.url)) await c.delete(req);
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    // a saved cover: answer from the device; any other image goes to the network as usual
    if (e.request.destination === 'image') {
      e.respondWith(caches.open(ART_CACHE).then((c) => c.match(e.request.url)).then((hit) => hit || fetch(e.request)));
    }
    return;
  }
  if (e.request.mode === 'navigate') {
    // network first so deploys show up immediately; the cached shell only when offline
    e.respondWith(
      fetch(e.request)
        .then(async (r) => {
          if (r.ok) {
            const c = await caches.open(CACHE);
            await c.put('./index.html', r.clone());
            e.waitUntil(syncAssets());
          }
          return r;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }
  if (url.pathname.includes('/assets/')) {
    // hashed build assets never change: cache first, but never cache failures
    e.respondWith(
      // ignoreVary: precached copies were fetched without the page's Origin header (module scripts send one)
      caches.match(e.request, { ignoreVary: true }).then((hit) => hit || fetch(e.request).then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return r;
      })),
    );
  }
});
