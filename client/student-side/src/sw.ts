/// <reference lib="webworker" />
/**
 * SIPI Student Portal — Service Worker (Workbox, injectManifest mode)
 * ------------------------------------------------------------------------
 * SAFETY FIRST. This SW is scoped to "/" on https://spisg.gov.bd, which also
 * serves the Django API (/api), Django admin (/admin), websockets (/ws), and
 * uploaded files (/media, /files, /static). A careless SW here can take the
 * whole production stack down. The rules below are deliberate:
 *
 *   1. Navigation fallback serves the SPA shell (index.html) ONLY for real
 *      app routes. It DENYLISTS /api, /admin, /ws, /media, /files, /static so
 *      Django admin and file downloads keep working.
 *   2. /api is NETWORK-ONLY by default — authenticated, per-user, cookie-based
 *      responses are never cached. Only a small allowlist of clearly
 *      non-personal reference GETs (notices list, class routines, departments,
 *      subjects) is cached NetworkFirst so online users always get fresh data
 *      and offline users see the last-seen reference copy.
 *   3. Only GET is ever cached. POST/PUT/PATCH/DELETE are never cached.
 *   4. Updates use the "prompt" flow: the SW waits until the user accepts,
 *      then skipWaiting — so a teacher mid-entry is never force-reloaded.
 */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setDefaultHandler } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & {
  // Injected at build time by vite-plugin-pwa (injectManifest).
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// Bump when the SW's own logic changes so old runtime caches are cleaned up.
const SW_VERSION = 'v1';
const CACHE_PREFIX = 'sipi';
const cacheName = (n: string) => `${CACHE_PREFIX}-${n}-${SW_VERSION}`;

const RUNTIME = {
  static: cacheName('static'),
  images: cacheName('images'),
  gfontsStyle: cacheName('gfonts-style'),
  gfontsFile: cacheName('gfonts-file'),
  referenceApi: cacheName('reference-api'),
  offline: cacheName('offline'),
};

// ── Precache the app shell (injected at build time, revision-aware) ─────────
// self.__WB_MANIFEST is the list of hashed build assets from vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const OFFLINE_URL = '/offline.html';

// Make sure the offline fallback page is always available, even before it is
// requested for the first time.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(RUNTIME.offline).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))),
  );
});

// ── Navigation handling (SPA) ───────────────────────────────────────────────
// Real navigations get the precached index.html shell (so the app boots
// offline and its own React offline UI takes over). Non-app prefixes are
// denylisted so Django admin, the API, websockets and file routes are never
// hijacked. If even the shell is unavailable, fall back to offline.html.
const spaShellHandler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(
  async (params) => {
    try {
      return await spaShellHandler(params);
    } catch {
      const cache = await caches.open(RUNTIME.offline);
      const cached = await cache.match(OFFLINE_URL);
      return cached ?? Response.error();
    }
  },
  {
    denylist: [
      /^\/api\//,
      /^\/admin\/?/,
      /^\/ws\//,
      /^\/media\//,
      /^\/files\//,
      /^\/static\//,
      /^\/sw\.js$/,
      /^\/manifest\.webmanifest$/,
      // anything that looks like a file (has an extension) is not an app route
      /\/[^/?]+\.[^/?]+$/,
    ],
  },
);
registerRoute(navigationRoute);

// ── Static build assets (hashed JS/CSS in /assets) ──────────────────────────
// Precache already covers the shell; this SWR route catches lazily-loaded
// chunks so they work offline after first use without blocking navigation.
registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith('/assets/') && (request.destination === 'script' || request.destination === 'style'),
  new StaleWhileRevalidate({
    cacheName: RUNTIME.static,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

// ── Same-origin images (logo, favicon, illustrations, covers) ───────────────
registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin &&
    request.destination === 'image' &&
    !url.pathname.startsWith('/media/') && // user uploads: always fresh, never cache
    !url.pathname.startsWith('/api/'),
  new CacheFirst({
    cacheName: RUNTIME.images,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  }),
);

// ── Google Fonts (stylesheet SWR, font files CacheFirst long-lived) ─────────
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: RUNTIME.gfontsStyle, plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })] }),
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: RUNTIME.gfontsFile,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  }),
);

// ── Background Sync for a safe, idempotent mutation ──────────────────────────
// Marking notices read is idempotent, so replaying it after reconnect can never
// cause harm — a genuine, safe use of Background Sync. Auth and other mutations
// are deliberately NOT queued (replaying them could double-submit).
const noticeReadSync = new BackgroundSyncPlugin('sipi-notice-read-queue', {
  maxRetentionTime: 24 * 60, // minutes
});
registerRoute(
  ({ url, request }) => request.method === 'POST' && url.pathname === '/api/notices/bulk-mark-read/',
  new NetworkOnly({ plugins: [noticeReadSync] }),
  'POST',
);

// ── Reference API (non-personal GETs only) — NetworkFirst ───────────────────
// Online users ALWAYS get fresh data (network is tried first); offline users
// get the last-seen reference copy. Personal/per-user endpoints are excluded.
const REFERENCE_API = [
  /^\/api\/notices\/(?:\?.*)?$/, // list (NOT unread-count / bulk-mark-read)
  /^\/api\/notices\/[^/]+\/$/, // single notice detail
  /^\/api\/class-routines\//,
  /^\/api\/departments\//,
  /^\/api\/subjects\//,
];
const isReferenceApi = (pathnameWithSearch: string) =>
  REFERENCE_API.some((re) => re.test(pathnameWithSearch)) && !pathnameWithSearch.includes('unread-count');

registerRoute(
  ({ url, request, sameOrigin }) => sameOrigin && request.method === 'GET' && isReferenceApi(url.pathname + url.search),
  new NetworkFirst({
    cacheName: RUNTIME.referenceApi,
    networkTimeoutSeconds: 8,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  }),
);

// ── Everything else under /api → NETWORK-ONLY (never cached) ────────────────
// Explicit so no future route accidentally caches authenticated data.
registerRoute(({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'), new NetworkOnly());
// Django admin, websockets, uploads, static → always straight to network.
registerRoute(
  ({ url, sameOrigin }) =>
    sameOrigin &&
    (/^\/(admin|ws|media|files|static)\b/.test(url.pathname) || url.pathname.startsWith('/admin')),
  new NetworkOnly(),
);

// Default: try network, don't cache. Keeps unknown requests working normally.
setDefaultHandler(new NetworkOnly());

// ── Update flow (prompt) ─────────────────────────────────────────────────────
// The SW does NOT skipWaiting on its own. The page shows an "update available"
// prompt; when the user accepts, it posts SKIP_WAITING and we activate.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any of our runtime caches from a previous SW_VERSION.
      const keep = new Set(Object.values(RUNTIME));
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && !keep.has(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});
clientsClaim();

// ── Push notifications (infrastructure; backend push can be added later) ─────
self.addEventListener('push', (event) => {
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() };
  }
  const title = payload.title || 'SIPI Student Portal';
  const options: NotificationOptions = {
    body: payload.body || 'You have a new notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: payload.tag,
    data: { url: payload.url || '/dashboard/notifications' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard/notifications';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })(),
  );
});

// Allow the app to purge cached reference data on logout (privacy hygiene).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PURGE_CACHES') {
    event.waitUntil?.(
      (async () => {
        await caches.delete(RUNTIME.referenceApi);
        await caches.delete(RUNTIME.images);
      })(),
    );
  }
});
