// Service worker mínimo: SOLO cachea assets estáticos (JS/CSS/fuentes/íconos).
// Nunca cachea HTML ni /api: los datos del control siempre van a la red
// (la cola de reintento offline la maneja la página, no el SW).
const CACHE = "assets-v1";
const ESTATICOS = /^\/(_next\/static\/|icono|manifest\.webmanifest)/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || !ESTATICOS.test(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) c.put(e.request, res.clone());
      return res;
    }),
  );
});
