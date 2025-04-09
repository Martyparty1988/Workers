/**
 * service-worker.js
 * Service Worker pro PWA Pracovní výkazy
 */

const CACHE_NAME = 'vykazy-cache-v1';
const OFFLINE_PAGE = 'offline.html';
const OFFLINE_IMG = 'icons/offline.svg';

// Soubory, které mají být uloženy do cache při instalaci
const CACHE_ASSETS = [
  'index.html',
  'offline.html',
  'css/styles.css',
  'js/app.js',
  'js/storage.js',
  'js/timer.js',
  'js/worklog.js',
  'js/finance.js',
  'js/deductions.js',
  'js/debt.js',
  'js/charts.js',
  'js/export.js',
  'js/utils.js',
  'js/ui.js',
  'icons/icon-72x72.png',
  'icons/icon-96x96.png',
  'icons/icon-128x128.png',
  'icons/icon-144x144.png',
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-384x384.png',
  'icons/icon-512x512.png',
  'icons/offline.svg',
  'manifest.json'
];

// Instalace Service Workeru
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Ukládám soubory do cache...');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Aktivace Service Workeru
self.addEventListener('activate', (event) => {
  // Smazání starých verzí cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Odstraňuji starou cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Strategie Cache First, pak Network
self.addEventListener('fetch', (event) => {
  // Ignorovat POST požadavky a požadavky na chrome-extension
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Vrátit soubor z cache, pokud existuje
        if (response) {
          return response;
        }

        // Jinak zkusit získat z internetu
        return fetch(event.request)
          .then((networkResponse) => {
            // Pokud je požadavek úspěšný, uložit do cache
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Pokud selže připojení k internetu
            const url = new URL(event.request.url);
            
            // Pro HTML stránky vrátit offline.html
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match(OFFLINE_PAGE);
            }
            
            // Pro obrázky vrátit offline.svg
            if (event.request.headers.get('Accept').includes('image')) {
              return caches.match(OFFLINE_IMG);
            }
            
            // Pro ostatní soubory vrátit defaultní response
            return new Response('Obsah není dostupný offline.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Událost 'push' pro notifikace
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nová notifikace',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Pracovní výkazy',
      options
    )
  );
});

// Událost 'notificationclick' pro reakci na kliknutí na notifikaci
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((windowClients) => {
        // Pokud je již otevřeno okno, přepnout na něj
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Jinak otevřít nové okno
        if (clients.openWindow) {
          return clients.openWindow(notification.data.url);
        }
      })
  );
});