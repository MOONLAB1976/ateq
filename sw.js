// ATEQ Portugal - Service Worker Offline Completo (PWA)
// Versão do Cache v2: Suporte total a Treino, Planner e Calculadora ATEQ
const CACHE_NAME = 'ateq-pwa-cache-v3';

const URLS_TO_CACHE = [
  './',
  './planner.html',
  './img/01_corte_camara_inserto_delrin.jpg',
  './img/02_mordente_linear_selagem.jpg',
  './img/03_familia_3_camaras_insertos.jpg',
  './img/04_posto_trabalho_bancada_aberta.jpg',
  './img/05_posto_trabalho_f620_medicane_real.jpg',
  './treino.html',
  './index.html',
  './fugas-ateq-calculadora.html',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap'
];

// Instalação do Service Worker e pré-carregamento dos ficheiros
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceção de pedidos de rede
// ESTRATÉGIA:
// Para páginas HTML: Network-First (Tenta internet para ter a versão mais fresca; se estiver offline, entrega o cache).
// Para fontes e recursos estáticos: Cache-First.
self.addEventListener('fetch', event => {
  const request = event.request;
  const isHtml = request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

  if (isHtml) {
    // Modo Network-First com Fallback Offline para HTML
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se falhar a rede (offline), vai ao cache
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback para planner ou treino se a rota direta falhar
            if (request.url.includes('planner')) {
              return caches.match('./planner.html');
            }
            if (request.url.includes('treino')) {
              return caches.match('./treino.html');
            }
            return caches.match('./index.html');
          });
        })
    );
  } else {
    // Modo Cache-First para fontes e outros ficheiros
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
