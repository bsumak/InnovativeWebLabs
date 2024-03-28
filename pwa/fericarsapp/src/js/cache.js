const CACHE_NAME = 'cars-cache';

const PRECACHE_ASSETS = [
    '/img/cars/audia31.jpg',
    '/img/cars/audia32.jpg',
    '/img/cars/audia33.jpg',
    '/img/cars/bmw2coupe1.jpg',
    '/img/cars/bmw2coupe2.jpg',
    '/img/cars/bmw2coupe3.jpg',
    '/img/cars/gls1.jpg',
    '/img/cars/gls2.jpg',
    '/img/cars/gls3.jpg',
    '/img/cars/gls4.jpg',
    '/img/cars/porsche1.jpg',
    '/img/cars/porsche2.jpg',
    '/img/cars/porsche.jpg',
    '/js/main.js',
    '/index.html',
    '/manifest.json',
    '/sw.js',
    '/scss/styles.scss',
    '/img/ios/144.png',
    '/img/Screenshot.png'
]


self.addEventListener('install', async (event) => {
    console.log('Začenjam s predpomnjenjem...');
    const cache = await caches.open(CACHE_NAME);
    console.log('Dodajam v cache...');
    cache.addAll(PRECACHE_ASSETS);
    console.log('Dodano v cache');
});

// cache-only
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    const isPrecachedRequest = PRECACHE_ASSETS.includes(url.pathname);

    //če je v predpomnilniku, naloži
    if (isPrecachedRequest) {
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request.url);
        }));
    }
    //ne najdem.. pojdi na omrežje
    else {
        return fetch(url);
    }
});


// network-only
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    return fetch(url);
});

//Cache first, falling back to network
self.addEventListener('fetch', (event) => {

    if (event.request.destination === 'image') {
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            // najprej pojdi v predpomnilnik
            return cache.match(event.request.url).then((cachedResponse) => {
                // vrni odgovor iz predpomnilka (če obstaja)
                if (cachedResponse) {
                    return cachedResponse;
                }
                // sicer naloži iz omrežja
                return fetch(event.request).then((fetchedResponse) => {
                    // dodaj vsebino iz omrežja v predpomnilnik
                    cache.put(event.request, fetchedResponse.clone());
                    // in vrni vsebino iz omrežjka aplikaciji
                    return fetchedResponse;
                });
            });
        }));
    } else {
        return;
    }
});


//network first, falling back to cache
self.addEventListener('fetch', (event) => {

    if (event.request.mode === 'navigate') {
        // Odpri predpomnilnik
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            // Najprej pošlji zahtevo na omrežje
            return fetch(event.request.url).then((fetchedResponse) => {
                cache.put(event.request, fetchedResponse.clone());
                return fetchedResponse;
            }).catch(() => {
                // Če omrežje ni na voljo, pridobi iz predpomnilnika
                return cache.match(event.request.url);
            });
        }));
    } else {
        return;
    }
});

//stale-while-revalidate
self.addEventListener('fetch', (event) => {
    if (event.request.destination === 'image') {
        event.respondWith(caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchedResponse = fetch(event.request).then((networkResponse) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return cachedResponse || fetchedResponse;
            });
        }));
    } else {
        return;
    }
});

