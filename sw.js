// Bump with every release and keep SHELL in sync with versioned entry points.
const VERSION = '5.5';
// Cache Storage is shared by all project sites on this origin. Never delete
// caches belonging to the original analyzer or any other GitHub Pages project.
const PREFIX = 'card-analyzer-5:' + self.registration.scope + ':';
// A private cache revision changes without a public version bump. Each same-version
// fix replaces the populated shell so the updated rubric reaches installed PWAs.
const CACHE = PREFIX + VERSION + ':hotfix-5';
const SHELL = [
  './index.html', './manifest.webmanifest', './styles.css?v=' + VERSION,
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  ...['app', 'pwa', 'classifier', 'evaluator', 'greeting-context', 'card-context', 'charx', 'immersion-modules', 'immersion-panel',
    'importer', 'model-browser', 'openrouter-models', 'providers', 'report', 'version',
    'report-history', 'cost-estimate', 'static-lint', 'field-editor', 'card-diff', 'model-output', 'output-review', 'quoted-json', 'font-size',
    'vendor/jsonrepair/regular/jsonrepair', 'vendor/jsonrepair/utils/JSONRepairError', 'vendor/jsonrepair/utils/stringUtils',
    'rubrics/greetings', 'rubrics/assemble', 'rubrics/components', 'rubrics/core', 'rubrics/specialists'
  ].map(name => './src/' + name + '.js?v=' + VERSION)
].map(path => new URL(path, self.registration.scope).href);
const ASSETS = new Set(SHELL);
const INDEX = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  // Atomic precache: a failed download must not activate a partial offline app.
  // Bypass stale HTTP cache when URLs retain ?v=5.5 for a same-version hotfix.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, {cache:'reload'})))));
  // Updates wait until all old clients close, or the user explicitly reloads.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  // Model calls, keys, uploads and API responses never enter this cache.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const root = new URL(self.registration.scope);
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
  const navigation = request.mode === 'navigate' &&
    (url.pathname === root.pathname || url.pathname === new URL(INDEX).pathname);
  if (!navigation && !ASSETS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve a consistent release, not a new HTML page with old cached modules.
    const cached = await cache.match(navigation ? INDEX : request.url);
    return cached || fetch(request);
  })());
});
