const CACHE_NAME = "crm-gotec-shell-v2";
const VIEW_CACHE = "crm-gotec-views-v2";
const BASE_PATH = new URL(self.registration.scope).pathname;
const ASSETS = [
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}css/tailwind.css`,
  `${BASE_PATH}assets/logo.svg`,
  `${BASE_PATH}js/app.js`,
  `${BASE_PATH}js/config.js`,
  `${BASE_PATH}js/auth.js`,
  `${BASE_PATH}js/sheets-api.js`,
  `${BASE_PATH}js/store.js`,
  `${BASE_PATH}js/router.js`,
  `${BASE_PATH}js/utils.js`,
  `${BASE_PATH}views/dashboard-gestao.html`,
  `${BASE_PATH}views/dashboard-comercial.html`,
  `${BASE_PATH}views/oportunidades.html`,
  `${BASE_PATH}views/detalhe-oportunidade.html`,
  `${BASE_PATH}views/clientes.html`,
  `${BASE_PATH}views/propostas.html`,
  `${BASE_PATH}views/perfil.html`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

  if (ASSETS.includes(url.pathname)) {
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
