const CACHE_NAME = "crm-gotec-shell-v2";
const VIEW_CACHE = "crm-gotec-views-v2";
const BASE_PATH = self.location.pathname.replace(/service-worker\.js$/, "");
const ASSETS = [
  "index.html",
  "manifest.json",
  "css/tailwind.css",
  "assets/logo.svg",
  "js/app.js",
  "js/config.js",
  "js/auth.js",
  "js/sheets-api.js",
  "js/store.js",
  "js/router.js",
  "js/utils.js",
  "views/dashboard-gestao.html",
  "views/dashboard-comercial.html",
  "views/oportunidades.html",
  "views/detalhe-oportunidade.html",
  "views/clientes.html",
  "views/propostas.html",
  "views/perfil.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map((asset) => new URL(asset, self.location).toString()))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_NAME, VIEW_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const normalizedPath = url.pathname.replace(BASE_PATH, "");

  if (ASSETS.includes(normalizedPath)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith(`${BASE_PATH}views`)) {
    event.respondWith(networkFirst(request, VIEW_CACHE));
    return;
  }
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request));
}

function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      const responseClone = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, responseClone));
      return response;
    })
    .catch(() => caches.match(request));
}
