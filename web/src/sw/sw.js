/* Türkiye Gezi Rehberi: çevrimdışı kullanım
   - sayfa: önce ağ, olmazsa son kaydedilen sürüm
   - kütüphaneler (jsdelivr): önbellekten, arkada yenilenir
   - harita karoları, stiller, yazı tipleri (openfreemap): önbellekten; en fazla ~4000 parça
   - Supabase istekleri (hesap, yorumlar) hiç önbelleğe alınmaz */
const V = 'v8', PAGE = 'gezi-page-' + V, LIB = 'gezi-lib-' + V, TILE = 'gezi-tile-' + V, MAXT = 4000;
self.addEventListener('install', e => { e.waitUntil(caches.open(PAGE).then(c => c.add('./')).catch(() => { })); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gezi-') && !k.endsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
let trimming = false;
async function trim() {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(TILE), ks = await c.keys(); for (let i = 0; i < ks.length - MAXT; i++) await c.delete(ks[i]); } finally { trimming = false; }
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (/supabase\.co$/.test(u.hostname) || u.hostname === 'api.open-meteo.com') return;
  if (r.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(PAGE).then(c => c.put('./', cp)); return res; })
      .catch(() => caches.match('./', { ignoreSearch: true }).then(m => m || Response.error())));
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(LIB).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // yer fotoğrafları (Wikimedia): görülenler çevrimdışında da görünsün
  if (u.hostname === 'upload.wikimedia.org' || (u.hostname === 'commons.wikimedia.org' && u.pathname.startsWith('/wiki/Special:FilePath/'))) {
    e.respondWith(caches.open(TILE).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r);
      if (res.ok || res.type === 'opaque') { c.put(r, res.clone()).then(trim); }
      return res;
    }));
    return;
  }
  if (/(^|\.)openfreemap\.org$/.test(u.hostname)) {
    e.respondWith(caches.open(TILE).then(async c => {
      const hit = await c.match(r); if (hit) return hit;
      const res = await fetch(r);
      if (res.ok) { c.put(r, res.clone()).then(trim); }
      return res;
    }));
  }
});
