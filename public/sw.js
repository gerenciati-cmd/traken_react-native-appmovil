const CACHE_NAME = 'traken-mobile-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Red primero, y si falla (sin datos/señal) usa lo ultimo que se guardo en
// cache. Esto aplica a TODO GET, incluyendo las llamadas a la API
// (/me.php, /orders/open.php, etc.) a proposito: asi, sin conexion, la app
// puede seguir mostrando lo ultimo que se cargo (perfil, ordenes abiertas)
// en vez de pantalla en blanco. Login es POST, nunca pasa por aqui, asi
// que jamas se sirve un login cacheado/viejo.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Nunca se guardo nada de esto (primera vez que se pide, sin
        // señal): se contesta algo entendible en vez de dejar que el
        // navegador truene con un error de red crudo.
        return new Response(JSON.stringify({ ok: false, error: 'Sin conexión y sin datos guardados.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
  );
});
