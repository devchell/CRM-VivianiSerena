// Viviani Serena CRM — Service Worker
// Incrementar CACHE_VERSION quando fizer deploy com mudanças visuais
const CACHE_VERSION = 'vs-crm-v3'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`

// Assets que ficam em cache permanente (shell do app)
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/icons/icon-192.png?v=3',
  '/icons/icon-512.png?v=3',
  '/icons/icon-192.svg?v=3',
  '/icons/icon-512.svg?v=3',
]

// ── Install: pré-cache do shell ───────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  // Ativa imediatamente sem esperar abas antigas fecharem
  self.skipWaiting()
})

// ── Activate: limpa caches antigos ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: estratégia por tipo de recurso ────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições não-GET e chamadas de API (sempre vai para rede)
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname !== self.location.hostname) return

  // Arquivos _next/static → Cache First (imutáveis com hash no nome)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Ícones e imagens públicas → Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Páginas do app → Network First (sempre tenta rede, cai em cache se offline)
  event.respondWith(networkFirst(request))
})

// ── Estratégias ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Se não tem cache e está offline, mostra página offline
    const offlinePage = await caches.match('/offline')
    return offlinePage ?? new Response('Sem conexão', { status: 503 })
  }
}
