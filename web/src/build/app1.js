'use strict';
/* ---------- veri ---------- */
const REGIONS = ['Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];
const GROUPS = { kultur: 'Tarih ve kültür', doga: 'Doğa', deniz: 'Deniz ve kıyı', sehir: 'Şehir ve kasaba', manzara: 'Manzara' };
const SUBS = {
  cami: ['kultur', 'Cami ve türbe'], kilise: ['kultur', 'Kilise ve manastır'], antik: ['kultur', 'Antik kent ve ören yeri'], kale: ['kultur', 'Kale ve sur'],
  saray: ['kultur', 'Saray ve köşk'], muze: ['kultur', 'Müze'], anit: ['kultur', 'Anıt'], yapi: ['kultur', 'Tarihi yapı'],
  park: ['doga', 'Park ve milli park'], gol: ['doga', 'Göl'], selale: ['doga', 'Şelale'], kanyon: ['doga', 'Kanyon ve vadi'], dag: ['doga', 'Dağ ve yayla'],
  magara: ['doga', 'Mağara ve obruk'], olusum: ['doga', 'Doğal oluşum'], kaplica: ['doga', 'Kaplıca'],
  plaj: ['deniz', 'Plaj ve koy'], ada: ['deniz', 'Ada'], sahil: ['deniz', 'Sahil kasabası'],
  carsi: ['sehir', 'Çarşı ve pazar'], mahalle: ['sehir', 'Tarihi mahalle'], kasaba: ['sehir', 'Kasaba ve köy'], cadde: ['sehir', 'Meydan ve cadde'],
  seyir: ['manzara', 'Seyir noktası'], kule: ['manzara', 'Kule']
};
const CATS = Object.fromEntries(Object.entries(SUBS).map(([k, v]) => [k, v[1]]));
PLACES.forEach(p => { p.g = (SUBS[p.c] || ['manzara'])[0]; });
const SORTS = [['visits', 'En çok gidilen'], ['favs', 'En favori'], ['rating', 'En yüksek puan'], ['reviews', 'En çok yorum']];
const rnd = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
PLACES.forEach((p, i) => {
  const t = p.t || 3;
  const count = Math.round(12 * Math.pow(2.6, t) * (0.7 + rnd(i, 2) * 0.8));
  const visits = Math.round(count * (6 + rnd(i, 3) * 6));
  p.base = {
    rating: Math.min(4.9, Math.round((4.0 + t * 0.08 + rnd(i, 1) * 0.4) * 10) / 10),
    count, visits, favs: Math.round(visits * (0.05 + rnd(i, 4) * 0.12))
  };
});
const SAMPLES = [
  ['ayasofya', 'Elif', 5, 'Sabah ilk saatte gittim, içerisi kalabalık olmadan gezebildim. Kubbeye bakmak için biraz zaman ayırın.', 'photo', 12, [['Mehmet', 'Hafta içi sabah gitmeyi deneyeceğim, teşekkürler.']], '2 gün önce'],
  ['ayasofya', 'James', 4, 'Giriş sırası biraz uzundu ama içeri girince değdi.', null, 4, [], '1 hafta önce'],
  ['galatakulesi', 'Zeynep', 5, 'Gün batımında çıkmak harika, manzara tüm şehri kapsıyor.', 'video', 9, [], '3 gün önce'],
  ['galatakulesi', 'Alex', 3, 'Manzara güzel ama terası çok kalabalıktı; erken gitmenizi öneririm.', null, 2, [], '2 hafta önce'],
  ['kapalicarsi', 'Ahmet', 4, 'Kaybolmak işin bir parçası; pazarlık yapmayı unutmayın.', 'photo', 6, [], '5 gün önce'],
  ['kizkulesi', 'Marta', 5, 'Vapurdan görünüşü bile yeterince güzel.', 'photo', 7, [], '1 hafta önce'],
  ['goreme', 'Can', 5, 'Gün doğumunda balonları izlemek için erken kalktım, kesinlikle değdi.', 'photo', 15, [], '4 gün önce'],
  ['pamukkale', 'Ayşe', 4, 'Travertenlerde çıplak ayakla yürünüyor; güneş gözlüğü ve su almayı unutmayın.', null, 8, [], '1 hafta önce']
];
const S = {
  sel: null, tab: 'ov', sort: 'visits', cat: 'all', reg: -1, q: '', collapsed: false,
  visited: new Set(), faved: new Set(), liked: new Set(), open: new Set(), drafts: {}, rep: {},
  posts: SAMPLES.map((s, i) => ({ id: 's' + i, pid: s[0], author: s[1], rating: s[2], text: s[3], media: s[4] ? { kind: s[4], url: null } : null, likes: s[5], replies: s[6].map(r => ({ a: r[0], t: r[1] })), ago: s[7], sample: true })),
  cRating: 0, cMedia: null
};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/â/g, 'a');
const LOC = () => ({ tr: 'tr-TR', en: 'en-US' }[window.LANG] || window.LANG || 'tr-TR') + '-u-nu-latn';
const fmt = n => n.toLocaleString(LOC());
const rt = n => n.toLocaleString(LOC(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const byId = id => PLACES.find(p => p.id === id);

function stats(p) {
  const mine = S.posts.filter(x => x.pid === p.id && !x.sample);
  const count = p.base.count + mine.length;
  return {
    rating: count ? (p.base.rating * p.base.count + mine.reduce((a, x) => a + x.rating, 0)) / count : 0,
    count,
    visits: p.base.visits + (S.visited.has(p.id) ? 1 : 0),
    favs: p.base.favs + (S.faved.has(p.id) ? 1 : 0)
  };
}
function matchPlace(p, q, ignoreSub) {
  return (S.reg < 0 || p.r === S.reg) && (S.cat === 'all' || p.g === S.cat) && (ignoreSub || !S.sub || S.sub === 'all' || p.c === S.sub)
    && (!q || fold(p.n + ' ' + p.il + ' ' + (p.semt || '') + ' ' + CATS[p.c]).includes(q));
}
function results() {
  const q = fold(S.q.trim());
  const cmp = {
    visits: (a, b) => b.s.visits - a.s.visits,
    favs: (a, b) => b.s.favs - a.s.favs,
    rating: (a, b) => (b.s.rating - a.s.rating) || (b.s.count - a.s.count),
    reviews: (a, b) => b.s.count - a.s.count
  }[S.sort];
  return PLACES.filter(p => matchPlace(p, q, false))
    .map(p => ({ p, s: stats(p) })).sort(cmp);
}

/* ---------- harita motoru (Web Mercator, zoom 10 birimleri) ---------- */
const MAP = $('map');
const V = { s: 0.03, tx: 0, ty: 0, minS: 0.01, maxS: 16 };
function proj(lon, lat) {
  const W0 = 256 * Math.pow(2, GEO.z), sn = Math.sin(lat * Math.PI / 180);
  return [(lon + 180) / 360 * W0 - GEO.x0, (0.5 - Math.log((1 + sn) / (1 - sn)) / (4 * Math.PI)) * W0 - GEO.y0];
}
PLACES.forEach(p => { [p.x, p.y] = proj(p.lng, p.lat); });
$('world').innerHTML =
  `<path class="p-land" d="${GEO.land}"/><path class="p-tr" d="${GEO.tr}"/><path class="p-prov" d="${GEO.prov}"/><path class="p-lake" d="${GEO.lakes}"/>`;

const wide = () => matchMedia('(min-width:820px)').matches;
function sheetPx() {
  if (wide()) return 0;
  if (S.dragH) return S.dragH;
  if (S.full && !S.collapsed) return Math.round(innerHeight - ($('top').offsetHeight || 60) - 24);
  return S.collapsed ? 64 : Math.round(innerHeight * (S.sel ? 0.62 : 0.46));
}
function setSheet() {
  document.documentElement.style.setProperty('--sheet', sheetPx() + 'px');
  $('grip').setAttribute('aria-expanded', String(!S.collapsed));
  $('grip').setAttribute('aria-label', S.collapsed ? 'Paneli büyüt' : 'Paneli küçült');
}
function viewRect() {
  const W = MAP.clientWidth, H = MAP.clientHeight;
  const top = $('top').offsetHeight + 24;
  return { x: 16, y: top, w: Math.max(80, W - 32), h: Math.max(80, H - top - sheetPx() - 16) };
}
function fitBox(x0, y0, x1, y1, maxS, animate) {
  const r = viewRect();
  const s = Math.min(maxS || V.maxS, Math.max(V.minS, Math.min(r.w / Math.max(x1 - x0, 1), r.h / Math.max(y1 - y0, 1))));
  flyTo((x0 + x1) / 2, (y0 + y1) / 2, s, animate);
}
function flyTo(ux, uy, s, animate = true) {
  const r = viewRect(), ax = r.x + r.w / 2, ay = r.y + r.h / 2;
  const s0 = V.s, cx0 = (ax - V.tx) / s0, cy0 = (ay - V.ty) / s0;
  const set = (k) => {
    const sk = Math.exp(Math.log(s0) + (Math.log(s) - Math.log(s0)) * k);
    const cx = cx0 + (ux - cx0) * k, cy = cy0 + (uy - cy0) * k;
    V.s = sk; V.tx = ax - cx * sk; V.ty = ay - cy * sk; draw();
  };
  if (!animate || matchMedia('(prefers-reduced-motion:reduce)').matches) return set(1);
  const t0 = performance.now(), D = 500;
  const step = (t) => { const k = Math.min(1, (t - t0) / D); set(1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function zoomAt(px, py, f) {
  const ns = Math.min(V.maxS, Math.max(V.minS, V.s * f)), k = ns / V.s;
  V.tx = px - (px - V.tx) * k; V.ty = py - (py - V.ty) * k; V.s = ns; draw();
}
function fitTurkey(animate) {
  const a = proj(25.7, 42.2), b = proj(44.8, 35.8);
  fitBox(a[0], a[1], b[0], b[1], null, animate);
}

let raf = 0;
function draw() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); }
function render() {
  $('world').setAttribute('transform', `matrix(${V.s},0,0,${V.s},${V.tx},${V.ty})`);
  const W = MAP.clientWidth, H = MAP.clientHeight, sx = u => u * V.s + V.tx, sy = u => u * V.s + V.ty;
  const boxes = [];
  $('labels').innerHTML = V.s >= 0.05 && V.s <= 3 ? GEO.labels.map(l => {
    const x = sx(l[1]), y = sy(l[2]), w = l[0].length * 7.5 + 8;
    if (x < -60 || x > W + 60 || y < -20 || y > H + 20) return '';
    if (boxes.some(b => Math.abs(b[0] - x) < (b[2] + w) / 2 && Math.abs(b[1] - y) < 16)) return '';
    boxes.push([x, y, w]);
    return `<span class="lbl" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px">${esc(l[0])}</span>`;
  }).join('') : '';
  const vis = results().map(r => r.p).filter(p => p.id !== S.sel);
  // ünlü yerler önce yerleşir: içinde ünlü yer olan küme o yerin çizimiyle ve sayıyla görünür
  const isLm = p => typeof MKI !== 'undefined' && !!MKI.lm[p.id];
  const clusters = [];
  const R = V.s >= V.maxS * 0.99 ? 0 : 38;
  vis.sort((a, b) => (isLm(b) ? 10 : b.t || 3) - (isLm(a) ? 10 : a.t || 3)).forEach(p => {
    const x = sx(p.x), y = sy(p.y);
    if (x < -40 || x > W + 40 || y < -40 || y > H + 80) return;
    const c = R && clusters.find(c => Math.abs(c.x - x) < R && Math.abs(c.y - y) < R);
    if (c) c.m.push(p); else clusters.push({ x, y, m: [p] });
  });
  const mk = p => typeof MKI !== 'undefined' ? `<i class="mk">${pinSVG(p)}</i>` : '<i></i>';
  const small = V.s < (MAP.classList.contains('ml') ? 0.35 : 1.2) ? ' sm' : '';
  const at = c => `style="left:${c.x.toFixed(1)}px;top:${c.y.toFixed(1)}px"`;
  let h = clusters.map(c => {
    const lm = isLm(c.m[0]) ? c.m[0] : null;
    if (c.m.length === 1) return lm
      ? `<button class="pin lmp${small}" data-a="pick" data-v="${lm.id}" ${at(c)} aria-label="${esc(lm.n)}">${mk(lm)}</button>`
      : `<button class="pin${typeof MKI !== 'undefined' ? ' mkp' : ''}" data-a="pick" data-v="${c.m[0].id}" ${at(c)} aria-label="${esc(c.m[0].n)}">${mk(c.m[0])}</button>`;
    return lm
      ? `<button class="pin lmp lmc${small}" data-a="cl" data-v="${c.m.map(p => p.id).join(',')}" ${at(c)} aria-label="${esc(lm.n)} · ${c.m.length} yer, yakınlaştır">${mk(lm)}<span class="cnt">${c.m.length}</span></button>`
      : `<button class="cl" data-a="cl" data-v="${c.m.map(p => p.id).join(',')}" ${at(c)} aria-label="${c.m.length} yer, yakınlaştır"><span>${c.m.length}</span></button>`;
  }).join('');
  const sp = S.sel && byId(S.sel);
  if (sp) h += `<button class="pin sel${typeof MKI !== 'undefined' ? (isLm(sp) ? ' lmp' : ' mkp') : ''}" data-a="pick" data-v="${sp.id}" style="left:${sx(sp.x).toFixed(1)}px;top:${sy(sp.y).toFixed(1)}px" aria-label="${esc(sp.n)}">${mk(sp)}<span class="tag">${esc(sp.n)}</span></button>`;
  $('pins').innerHTML = h;
}

/* sürükleme, iki parmakla ve tekerlekle yakınlaştırma */
const ptrs = new Map();
let moved = 0, lastDist = 0;
MAP.addEventListener('pointerdown', e => {
  if (e.button !== 0 || MAP.classList.contains('ml')) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastDist = Math.hypot(a.x - b.x, a.y - b.y); }
});
addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5) { MAP.classList.add('drag'); V.tx += dx; V.ty += dy; draw(); }
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), rc = MAP.getBoundingClientRect();
    moved = 99;
    if (lastDist) zoomAt((a.x + b.x) / 2 - rc.left, (a.y + b.y) / 2 - rc.top, d / lastDist);
    lastDist = d;
  }
});
const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) lastDist = 0; if (!ptrs.size) MAP.classList.remove('drag'); };
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
MAP.addEventListener('click', e => { if (moved > 5) { e.stopPropagation(); e.preventDefault(); } }, true);
MAP.addEventListener('wheel', e => {
  if (MAP.classList.contains('ml')) return;
  e.preventDefault();
  const rc = MAP.getBoundingClientRect();
  zoomAt(e.clientX - rc.left, e.clientY - rc.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });
