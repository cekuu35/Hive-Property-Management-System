// Service Worker for Lovly Property Management PWA
const CACHE_NAME = 'lovly-prop-v1.0.0';
const STATIC_CACHE = 'lovly-static-v1.0.0';
const DYNAMIC_CACHE = 'lovly-dynamic-v1.0.0';

// Check if a request can be cached (exclude unsupported schemes)
function isCacheableRequest(request) {
  const url = new URL(request.url);
  // Exclude chrome-extension, moz-extension, and other unsupported schemes
  return !url.protocol.startsWith('chrome-extension:') && 
         !url.protocol.startsWith('moz-extension:') &&
         !url.protocol.startsWith('safari-extension:') &&
         !url.protocol.startsWith('ms-browser-extension:') &&
         (url.protocol === 'http:' || url.protocol === 'https:');
}

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/health/,
  /\/api\/mpesa\/payment-status/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static files...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful responses (only for supported schemes)
    if (networkResponse.ok && isCacheableRequest(request)) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('🌐 Dynamic cache failed for:', request.url, cacheError.message);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, trying cache for API:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'You are offline. Please check your connection.' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache the response for future use (only for supported schemes)
    if (networkResponse.ok && isCacheableRequest(request)) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.log('🌐 Cache failed for:', request.url, cacheError.message);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed for static file:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline');
    }
    
    // Return a fallback for other requests
    return new Response('Resource not available offline', { status: 404 });
  }
}

// Handle background sync for payment requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'payment-sync') {
    console.log('🔄 Background sync for payments...');
    event.waitUntil(syncPayments());
  }
});

// Sync payment data when back online
async function syncPayments() {
  try {
    // Get pending payments from IndexedDB
    const pendingPayments = await getPendingPayments();
    
    for (const payment of pendingPayments) {
      try {
        await fetch('/api/mpesa/payment-status/' + payment.checkoutRequestID);
        // Remove from pending if successful
        await removePendingPayment(payment.id);
      } catch (error) {
        console.error('Failed to sync payment:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Lovly Property Management', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper functions for IndexedDB (simplified)
async function getPendingPayments() {
  // In a real implementation, you would use IndexedDB
  return [];
}

async function removePendingPayment(id) {
  // In a real implementation, you would use IndexedDB
  console.log('Removing pending payment:', id);
}

