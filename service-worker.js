

const CACHE_NAME = 'storyboard-studio-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/geminiService.ts',
  '/services/ragService.ts',
  '/components/InputPanel.tsx',
  '/components/ImageGrid.tsx',
  '/components/icons.tsx',
  '/components/SettingsModal.tsx',
  '/components/Storyboard.tsx',
  '/components/ScriptViewer.tsx',
  '/components/InspirationBoard.tsx',
  '/components/VideoGenerator.tsx',
  '/components/FaceRepairStudio.tsx',
  '/components/PhotorealismStudio.tsx',
  '/components/BeforeAfterModal.tsx',
  '/components/AgentsStudio.tsx',
  '/components/LoreStudio.tsx',
  '/components/DynamicPromptsStudio.tsx',
  '/components/AgentChatStudio.tsx',
  '/components/DashboardStudio.tsx',
  '/components/AutomationStudio.tsx',
  '/components/Sidebar.tsx',
  '/vite.svg',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/@google/genai@^1.29.0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        const promises = urlsToCache.map(url => {
            return cache.add(new Request(url, {cache: 'reload'}))
                .catch(err => console.warn(`Failed to cache ${url}:`, err));
        });
        return Promise.all(promises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, go to network.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response to cache
            // Do not cache API calls to Google
            if(!response || (response.status !== 200 && response.status !== 0) || event.request.url.includes('googleapis.com')) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});