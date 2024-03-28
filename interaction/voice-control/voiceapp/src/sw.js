const CACHE_NAME = 'cars-cache';

const PRECACHE_ASSETS = [
    './img/cars',
    './js',
    './index.html'
]

self.addEventListener('install', event => {
    console.log('Service worker se namešča');
    
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        console.log('Dodajam v cache...');
        cache.addAll(PRECACHE_ASSETS);
    })());
});


self.addEventListener('activate', event => {
    console.log('Service worker je aktiviran in čaka na zahteve');
});

// self.addEventListener('fetch', event => {
//     const url = new URL(event.request.url);
    
//     const isPrecachedRequest = PRECACHE_ASSETS.includes(url.pathname);

//     if (isPrecachedRequest) {
//         console.log('Nalagam iz predpomnilnika...' + url.pathname);
//         event.respondWith(caches.open(CACHE_NAME).then((cache) => {
//             return cache.match(event.request.url);
//         }));
//     } else {
        
//         return fetch(url);
//     }
// });

self.addEventListener('fetch', (event) => {
    // Check if this is a request for an image
    
    if (event.request.destination === 'image') {
      event.respondWith(caches.open(CACHE_NAME).then((cache) => {
        // najprej pojdi v cache
        
        return cache.match(event.request.url).then((cachedResponse) => {

          // Return a cached response if we have one
          if (cachedResponse) {
            console.log('Vračam iz CACHE: ' + event.request.url);
            return cachedResponse;
          }
  
          // Otherwise, hit the network
          return fetch(event.request).then((fetchedResponse) => {
            // Add the network response to the cache for later visits
            cache.put(event.request, fetchedResponse.clone());
  
            // Return the network response
            return fetchedResponse;
          });
        });
      }));
    } else {
      return;
    }
  });


//   self.addEventListener('fetch', (event) => {
//     // Check if this is a navigation request
    
//     if (event.request.mode === 'navigate') {
//       // Open the cache
//       event.respondWith(caches.open(CACHE_NAME).then((cache) => {
//         // Go to the network first
//         return fetch(event.request.url).then((fetchedResponse) => {
//           cache.put(event.request, fetchedResponse.clone());
  
//           return fetchedResponse;
//         }).catch(() => {
//           // If the network is unavailable, get
//           return cache.match(event.request.url);
//         });
//       }));
//     } else {
//       return;
//     }
//   });

//   self.addEventListener('fetch', (event) => {
//     if (event.request.destination === 'image') {
//       event.respondWith(caches.open(CACHE_NAME).then((cache) => {
//         return cache.match(event.request).then((cachedResponse) => {
//           const fetchedResponse = fetch(event.request).then((networkResponse) => {
//             cache.put(event.request, networkResponse.clone());
  
//             return networkResponse;
//           });
  
//           return cachedResponse || fetchedResponse;
//         });
//       }));
//     } else {
//       return;
//     }
//   });


self.addEventListener('push', (event)=>{

  if (event.data) {
    console.log('Ta dogodek potisnega obvestila ima podatke: ', event.data.text());
    } else {
    console.log('Ta dogodek o potisnem obvestilu nima podatkov.');
    }
});
  // console.log('push');
  // console.log(JSON.parse(event.data));

  // const podatkiObvestila = JSON.parse(event.data);
  // event.waitUntil(
  //   self.registration.showNotification( podatkiObvestila.title,
  //     {
  //       body: podatkiObvestila.message,
  //       icon: podatkiObvestila.icon,
  //       data: podatkiObvestila.data
  //     })
  // );