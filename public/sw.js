// Service Worker for Push Notifications
const CACHE_NAME = 'property-manager-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {
    title: 'Property Manager',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Push data:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || data.type || notificationData.tag,
        data: data,
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [],
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  const notificationPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    data: notificationData.data,
    requireInteraction: notificationData.requireInteraction,
    actions: notificationData.actions,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  }).then(() => {
    console.log('[Service Worker] ✅ Notification displayed successfully!');
  }).catch((error) => {
    console.error('[Service Worker] ❌ Failed to show notification:', error);
  });

  event.waitUntil(notificationPromise);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    // Sync logic here if needed
    console.log('[Service Worker] Syncing notifications...');
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
  }
}

// Fetch event (optional - for caching static assets)
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Don't cache API requests
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }
  
  // For preview/localhost, don't intercept fetches to avoid errors
  if (event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      // Try to fetch, but don't fail if it errors
      return fetch(event.request).catch((error) => {
        console.error('[Service Worker] Fetch failed:', error);
        // Return a basic response instead of failing
        return new Response('Network error', { status: 408 });
      });
    }).catch((error) => {
      console.error('[Service Worker] Cache match failed:', error);
      // Fallback to fetch
      return fetch(event.request).catch(() => {
        return new Response('Service unavailable', { status: 503 });
      });
    })
  );
});
