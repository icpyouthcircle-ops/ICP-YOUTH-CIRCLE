const CACHE_NAME = 'icp-portal-shell-20260926-v3';
const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css?v=20260926-responsive-v2',
  './js/app.js?v=20260926-responsive-v2',
  './js/mdcat.js?v=20260926-responsive-v2',
  './js/mdcat-study.js?v=20260926-responsive-v2',
  './js/mdcat-account.js?v=20260926-responsive-v2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('icp-portal-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isPortalNavigation = request.mode === 'navigate' && !url.pathname.endsWith('/admin.html');
  const isShellAsset = SHELL_ASSETS.some(asset => {
    const assetURL = new URL(asset, self.registration.scope);
    return assetURL.pathname === url.pathname && (!assetURL.search || assetURL.search === url.search);
  });
  if (!isPortalNavigation && !isShellAsset) return;

  event.respondWith(
    caches.match(isPortalNavigation ? './index.html' : request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(isPortalNavigation ? './index.html' : request, copy));
        }
        return response;
      }).catch(error => {
        if (cached) return cached;
        throw error;
      });
      return cached || network;
    })
  );
});
