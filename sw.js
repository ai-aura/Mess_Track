// MessTrack Service Worker
// Version 1.0.0

const CACHE_NAME = 'messtrack-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[Service Worker] Install complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Install failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Cache the fetched response for future use
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(error => {
                    console.error('[Service Worker] Fetch failed:', error);
                    // You could return a custom offline page here
                    return new Response('Offline - Please check your internet connection', {
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

// Handle background sync for marking attendance
self.addEventListener('sync', event => {
    if (event.tag === 'sync-attendance') {
        console.log('[Service Worker] Syncing attendance data...');
        event.waitUntil(syncAttendance());
    }
});

// Handle push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Don\'t forget to mark your mess attendance!',
        icon: 'icon-192.png',
        badge: 'icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'mark-lunch',
                title: 'Mark Lunch',
                icon: 'icon-72.png'
            },
            {
                action: 'mark-dinner',
                title: 'Mark Dinner',
                icon: 'icon-72.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('MessTrack Reminder', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'mark-lunch') {
        // Open app and mark lunch
        event.waitUntil(
            clients.openWindow('/?action=lunch')
        );
    } else if (event.action === 'mark-dinner') {
        // Open app and mark dinner
        event.waitUntil(
            clients.openWindow('/?action=dinner')
        );
    } else {
        // Just open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Utility function for syncing attendance
async function syncAttendance() {
    try {
        // In a real app, this would sync with a server
        console.log('[Service Worker] Attendance synced successfully');
        return true;
    } catch (error) {
        console.error('[Service Worker] Sync failed:', error);
        return false;
    }
}

// Listen for messages from the main app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
