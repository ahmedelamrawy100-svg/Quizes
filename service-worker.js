/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — SERVICE WORKER (PWA)
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v4.0.1'; 
const STATIC_CACHE = `quizhub-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `quizhub-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `quizhub-images-${CACHE_VERSION}`;

// ═══ الملفات الأساسية اللي بتتحفظ أول مرة (App Shell) ═══
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './quiz-style.css',
  './features/new-features.css',
  './pic/Logo.png'
];

// ═══ الملفات اللي بتتحفظ عشان تشتغل أوفلاين (محلي + خارجي) ═══
const ESSENTIAL_OFFLINE = [
  './questions.js',
  './quiz-core.js',
  './world_boss.js',
  './firebase-shared.js',
  './notifications.js',
  './theme-engine.js',
  './pwa-manager.js',
  './pwa-native.css',
  // السطور دي مهمة جداً عشان مكتبات فايربيز تشتغل وأنت مفصول عن النت:
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// ═══ قائمة الكويزات اللي تتخزن أوفلاين ═══
const QUIZZES = [
  'Ahmed Wa Ahmed Quiz.html', 'Annabelle Quiz.html', 'Avatar Quiz.html',
  'Avengers Quiz.html', 'Barshama Quiz.html', 'Beit El Ruby Quiz.html',
  'Birds of Prey Quiz.html', 'Conjuring Quiz.html', 'El Aref Quiz.html',
  'El Eskandarany Quiz.html', 'El Harifa Quiz.html', 'El Mamar Quiz.html',
  'El Mashroa X Quiz.html', 'El Serb Quiz.html', 'El Shater Quiz.html',
  'FNAF Quiz.html', 'Fall Quiz.html', 'Fasel Quiz.html', 'Fol El Seen Quiz.html',
  'Knives Out Quiz.html', 'Maze Runner Quiz.html', 'Meraty W Zegty Quiz.html',
  'Meraty X Quiz.html', 'Mister X Quiz.html', 'Nadi El Regal Quiz.html',
  'Rambo Quiz.html', 'Restart Quiz.html', 'Rocky El Ghalaba Quiz.html',
  'Scream Quiz.html', 'Shako Quiz.html', 'Shalaby Quiz.html', 'Siko Siko Quiz.html',
  'Spider-Man Quiz.html', 'Squid Game Quiz.html', 'Tag Quiz.html',
  'The Blue Elephant Quiz.html', 'The Nun Quiz.html', 'Train to Busan Quiz.html',
  'Venom Quiz.html', 'Wednesday Quiz.html', 'Wesh X Wesh Quiz.html'
];

// ═══════════════════════════════════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Precache partial fail:', err);
      });
    })
  );
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== IMAGE_CACHE) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ═══════════════════════════════════════════════════════════════════
// FETCH — استراتيجيات ذكية
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  
  if (req.method !== 'GET') return;
  
  // Firebase API لا يتدخل فيه الـ SW
  if (url.hostname.includes('firebaseio') || url.hostname.includes('identitytoolkit')) {
    return;
  }
  
  // الصفحات (Network First)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(req).then(cached => {
            if (cached) return cached;
            return caches.match('./offline.html');
          });
        })
    );
    return;
  }
  
  // الصور (Cache First)
  if (req.destination === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(IMAGE_CACHE).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
  
  // JS / CSS / Fonts / CDNs (Stale While Revalidate)
  if (url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.hostname.includes('fonts.googleapis') ||
      url.hostname.includes('fonts.gstatic') ||
      url.hostname.includes('cdn.jsdelivr') ||
      url.hostname.includes('gstatic')) {
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // الباقي
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./offline.html');
        return new Response('', { status: 503 });
      });
    })
  );
});

// ═══════════════════════════════════════════════════════════════════
// MESSAGE — التواصل مع الصفحات
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('message', event => {
  const data = event.data;
  
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  
  if (data.type === 'CACHE_QUIZZES') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then(cache => {
        return Promise.all(
          QUIZZES.map(q => 
            cache.add('./' + q).catch(err => console.warn('[SW] Failed to cache quiz:', q))
          )
        );
      }).then(() => {
        event.source?.postMessage({ type: 'QUIZZES_CACHED', count: QUIZZES.length });
      })
    );
    return;
  }
  
  if (data.type === 'CACHE_ESSENTIALS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then(cache => {
        return Promise.all(
          ESSENTIAL_OFFLINE.map(f => 
            cache.add(f).catch(err => console.warn('[SW] Failed to cache:', f))
          )
        );
      })
    );
    return;
  }
  
  if (data.type === 'GET_CACHE_STATUS') {
    Promise.all([
      caches.open(STATIC_CACHE).then(c => c.keys()),
      caches.open(RUNTIME_CACHE).then(c => c.keys()),
      caches.open(IMAGE_CACHE).then(c => c.keys())
    ]).then(([s, r, i]) => {
      event.source?.postMessage({
        type: 'CACHE_STATUS', static: s.length, runtime: r.length, images: i.length, total: s.length + r.length + i.length
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('push', event => {
  let data = {
    title: '🏰 Quiz Hub', body: 'عندك إشعار جديد!', icon: './pic/Logo.png',
    badge: './pic/Logo.png', url: './index.html', tag: 'quizhub-general'
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon, badge: data.badge, tag: data.tag,
      data: { url: data.url }, vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [], silent: false, dir: 'rtl', lang: 'ar', renotify: true
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './index.html';
  event.waitUntil(openOrFocus(targetUrl));
});

async function openOrFocus(url) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    if (client.url.includes(self.location.origin) && 'focus' in client) {
      client.navigate(url);
      return client.focus();
    }
  }
  if (clients.openWindow) return clients.openWindow(url);
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND SYNC
// ═══════════════════════════════════════════════════════════════════
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') event.waitUntil(syncPendingScores());
});

async function syncPendingScores() {
  console.log('[SW] Syncing scores (handled by page)');
}

console.log('[SW] ✅ Service Worker loaded — ' + CACHE_VERSION);