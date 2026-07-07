const CACHE = 'market-pool-v1';
const FONT_CACHE = 'market-pool-fonts-v1';
const SHELL = ['/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(e.request).then(
          (hit) =>
            hit ||
            fetch(e.request).then((r) => {
              cache.put(e.request, r.clone());
              return r;
            })
        )
      )
    );
    return;
  }

  // Never cache API calls (Supabase REST, Soroban RPC, Horizon) -- this is
  // a live wallet/blockchain app, stale reads here would be actively wrong.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok && e.request.method === 'GET') {
          caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
