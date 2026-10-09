// ============================================================
// SERVICE WORKER: fa funzionare Smart Move anche senza rete (app installata o pagina già visitata).
// Strategia "prima la rete": se c'è connessione scarica sempre i file aggiornati e ne tiene una copia;
// senza connessione usa la copia. Così dopo un push non serve cambiare versione a mano.
// I percorsi sono relativi: il sito su GitHub Pages sta sotto /smart-move/.
// ============================================================
const CACHE = 'smart-move';
// Tutti i file del sito, salvati subito all'installazione: offline funziona già dalla seconda apertura.
// Se aggiungi un file al sito (es. un nuovo modulo in js/), aggiungilo anche qui.
const FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/app.js', 'js/plan.js', 'js/sounds.js', 'js/test.js', 'js/ics.js',
  'fonts/titillium-web-400.woff2', 'fonts/titillium-web-600.woff2', 'fonts/titillium-web-700.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting(); // il nuovo service worker entra in funzione subito, senza aspettare che si chiudano le schede
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Copia aggiornata nella cache (solo risposte riuscite)
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      // Senza rete: la copia salvata. ignoreSearch: "./?qualcosa" usa la copia di "./"
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
