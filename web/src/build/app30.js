/* ===== aşama 10 (3A): rota seçenekleri (kaçınma, varış saatleri, yol üstü mola, yoldaki yerler, rotayı paylaş, mola hatırlatıcısı),
   açılış saatleri ve "şu an açık", cami ziyaret saatleri, acil durum, döviz çevirici, fiyat rehberi, gezi günlerine hava tahmini ===== */

/* ---------- OpenStreetMap Overpass (tarayıcıdan doğrudan; kendi IP'n engellenmez) ---------- */
const OVP = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
async function overpassQ(q, ms) {
  let last = null;
  for (const u of OVP) {
    const ctl = new AbortController(), h = setTimeout(() => ctl.abort(), ms || 15000);
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: 'data=' + encodeURIComponent(q), signal: ctl.signal });
      if (r.ok) return (await r.json()).elements || [];
      last = new Error('overpass ' + r.status);
    } catch (e) { last = e; } finally { clearTimeout(h); }
  }
  throw last || new Error('overpass');
}
const OSMQ = { fuel: '[amenity=fuel]', food: '[amenity~"^(restaurant|fast_food)$"]', cafe: '[amenity=cafe]', wc: '[amenity=toilets]', rest: '[highway~"^(rest_area|services)$"]', hospital: '[amenity~"^(hospital|clinic)$"]', pharmacy: '[amenity=pharmacy]', police: '[amenity=police]' };
const osmKind = t => { const a = t.amenity; return a === 'fuel' ? 'fuel' : a === 'toilets' ? 'wc' : a === 'cafe' ? 'cafe' : (a === 'restaurant' || a === 'fast_food') ? 'food' : (a === 'hospital' || a === 'clinic') ? 'hospital' : a === 'pharmacy' ? 'pharmacy' : a === 'police' ? 'police' : (t.highway === 'rest_area' || t.highway === 'services') ? 'rest' : ''; };
function lineBoxes(line, r, per) {
  per = per || 5; const pts = line.length === 1 ? [line[0], line[0]] : line, out = [];
  for (let i = 0; i < pts.length - 1; i += per) {
    const part = pts.slice(i, i + per + 1), xs = part.map(p => p[0]), ys = part.map(p => p[1]), py = r / 110540, px = r / (111320 * Math.cos(ys[0] * Math.PI / 180));
    out.push(`${(Math.min(...ys) - py).toFixed(5)},${(Math.min(...xs) - px).toFixed(5)},${(Math.max(...ys) + py).toFixed(5)},${(Math.max(...xs) + px).toFixed(5)}`);
  }
  return out;
}
async function osmInBoxes(boxes, kinds) {
  const els = await overpassQ(`[out:json][timeout:20];(${boxes.map(bb => kinds.map(k => `nwr${OSMQ[k]}(${bb});`).join('')).join('')});out center 4000;`, 20000);
  const seen = new Set(), out = [];
  for (const e of els) {
    const key = e.type + e.id; if (seen.has(key)) continue; seen.add(key);
    const t = e.tags || {}, la = e.lat ?? (e.center && e.center.lat), lo = e.lon ?? (e.center && e.center.lon);
    if (la == null || lo == null || t.access === 'private' || t.access === 'no') continue;
    const k = osmKind(t); if (!k || !kinds.includes(k)) continue;
    out.push({ k, n: String(t.name || t.brand || t.operator || '').slice(0, 80), lat: +la, lng: +lo, h: t.opening_hours === '24/7' ? 1 : 0, ph: t.phone || t['contact:phone'] || '', em: t.emergency === 'yes' ? 1 : 0 });
  }
  return out;
}
function simplifyTrack(tr, n, from, to) {
  const a = Math.max(0, from || 0), b = Math.min(tr.total, to == null ? Infinity : to), out = [];
  if (b <= a) return out;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = a + (b - a) * i / (n - 1);
    while (j < tr.cum.length - 2 && tr.cum[j + 1] < target) j++;
    const seg = tr.cum[j + 1] - tr.cum[j] || 1, u = Math.max(0, Math.min(1, (target - tr.cum[j]) / seg));
    const [x1, y1] = tr.pts[j], [x2, y2] = tr.pts[Math.min(j + 1, tr.pts.length - 1)];
    out.push([+(x1 + u * (x2 - x1)).toFixed(5), +(y1 + u * (y2 - y1)).toFixed(5)]);
  }
  return out;
}
async function fetchAlong(tr, kinds, from, to) {
  from = from || 0; to = to == null ? tr.total : to;
  const line = simplifyTrack(tr, Math.min(78, Math.max(12, Math.round((Math.min(tr.total, to) - from) / 6000))), from, to);
  if (line.length < 2) return [];
  let raw;
  try { raw = await osmInBoxes(lineBoxes(line, 1200), kinds); }
  catch (_) { const { data, error } = await sb.functions.invoke('along', { body: { line, kinds, radius: 1200 } }); if (error) throw error; raw = (data && data.items) || []; }
  const items = raw.map(it => { const s = snapTo(tr, it.lat, it.lng, 0); return { ...it, along: s.along, off: s.off }; }).filter(it => it.off < 1300 && it.along >= from - 500 && it.along <= to + 500).sort((a, b) => a.along - b.along);
  const out = [];
  for (const it of items) if (!out.some(o => o.k === it.k && meters(o.lat, o.lng, it.lat, it.lng) < 120)) out.push(it);
  return out;
}
const pickSpread = (items, n) => { if (items.length <= n) return items; const named = items.filter(x => x.n), pool = named.length >= n ? named : items, out = []; for (let i = 0; i < n; i++) out.push(pool[Math.floor(i * pool.length / n)]); return out; };
const ALONGK = [['fuel', '⛽', 'Benzinlik'], ['food', '🍽', 'Yemek'], ['cafe', '☕', 'Kafe'], ['wc', '🚻', 'Tuvalet'], ['rest', '🅿', 'Dinlenme tesisi']];
const kIcon = k => (ALONGK.find(x => x[0] === k) || ['', '📍'])[1];
const trClockMs = ms => { const d = new Date(ms + 3 * 3600e3); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };

/* ---------- rota: kaçınma seçenekleri ---------- */
let AVOID = ls.get('gezi-avoid', []);
const AVOIDS = [['tollways', 'Paralı yol yok'], ['highways', 'Otoyol yok'], ['ferries', 'Feribot yok']];
fetchRoute = async function (profile, coords) {
  if (!ONLINE()) { const e = new Error('no_key'); e.code = 'no_key'; throw e; }
  let res;
  const avoid = profile === 'driving-car' ? AVOID : [];
  try { res = await sb.functions.invoke('route', { body: { profile, coordinates: coords, language: window.LANG || 'tr', ...(avoid.length ? { avoid } : {}) } }); }
  catch (_) { const e = new Error('network'); e.code = 'network'; throw e; }
  if (res.error) { let code = 'no_route'; try { code = (await res.error.context.json()).error || code; } catch (_) { code = 'network'; } const e = new Error(code); e.code = code; throw e; }
  const r = res.data;
  r.steps = (r.steps || []).map(s => ({ i: s.i || '', d: s.d || 0, t: s.t || 0, w: s.w || 0, e: s.e || 0, y: s.y ?? -1, k: s.k || 0 }));
  r.legs = r.legs || []; r.lang = r.lang || window.LANG || 'tr';
  return r;
};
/* tek yere yol tarifi de fetchRoute'u (kaçınma seçenekleriyle) kullansın */
loadRoute = async function () {
  const p = byId(ROUTE.pid); if (!p) return;
  if (ROUTE.mode === 'transit') { window.open(gmaps(p, 'transit'), '_blank', 'noopener'); return; }
  ROUTE.state = 'loading'; ROUTE.data = null; ROUTE.along = null; ROUTE.ak = null; drawRoute(); renderDetail();
  try {
    if (!MEPOS) await locate();
    const [ox, oy] = proj(MEPOS.lng, MEPOS.lat); ROUTE.ends = [[ox, oy], [p.x, p.y]];
    if (!ONLINE()) { ROUTE.state = 'nokey'; renderDetail(); draw(); return; }
    const mode = ROUTE.mode, av = AVOID.join();
    const r = await fetchRoute(mode, [[MEPOS.lng, MEPOS.lat], [p.lng, p.lat]]);
    if (!ROUTE || ROUTE.mode !== mode || AVOID.join() !== av) return;
    ROUTE.state = 'ok'; ROUTE.data = r; ROUTE.track = prepTrack(r.geometry); ROUTE.t0 = Date.now();
  } catch (e) { ROUTE.state = e && e.code === 'no_key' ? 'nokey' : 'error'; ROUTE.err = e && e.code ? ROUTE_ERR(e.code) : ((e && e.message) || 'Rota bulunamadı.'); }
  renderDetail(); drawRoute();
};
const avoidChips = (act) => `<div class="chips wrapc" style="margin-top:6px">${AVOIDS.map(([k, l]) => `<button type="button" class="chip" data-a="${act}" data-v="${k}" aria-pressed="${AVOID.includes(k)}">${AVOID.includes(k) ? '✓ ' : ''}<span>${l}</span></button>`).join('')}</div>`;
const toggleAvoid = k => { AVOID = AVOID.includes(k) ? AVOID.filter(x => x !== k) : [...AVOID, k]; ls.set('gezi-avoid', AVOID); };

/* yol üstü mola bölümü (R: ROUTE ya da TROUTE) */
function alongHTML(R, act) {
  if (!R || !R.data || !R.track || R.mode === 'foot-walking') return '';
  const t0 = R.t0 || Date.now();
  const list = R.along === 'loading' ? '<p class="note">Aranıyor…</p>' : R.along === 'error' ? '<p class="note">Mola yerleri şu an yüklenemedi</p>'
    : Array.isArray(R.along) ? (R.along.length ? pickSpread(R.along, 12).map(a => `<div class="alrow"><span class="ali" aria-hidden="true">${kIcon(a.k)}</span><span class="fn"><b>${a.n ? esc(a.n) : `<span>${(ALONGK.find(x => x[0] === a.k) || ['', '', 'Durak'])[2]}</span>`}</b><span class="count"><span>${fmtDist(a.along)} sonra</span> · ~${trClockMs(t0 + a.along / Math.max(1, R.data.distance) * R.data.duration * 1000)}${a.off > 300 ? ` · <span>rotadan ${fmtDist(a.off)}</span>` : ''}${a.h ? ' · 24/7' : ''}</span></span><a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}" target="_blank" rel="noopener" aria-label="Google Haritalar’da aç">↗</a></div>`).join('') + '<p class="note">© OpenStreetMap</p>' : '<p class="note">Rotanın yakınında bulunamadı.</p>') : '';
  return `<div class="alongbox"><b>Yol üstü mola</b><p class="note" style="margin-top:2px">Rotadan çok sapmadan uğrayabileceğin yerler.</p>
    <div class="chips wrapc">${ALONGK.map(([k, ic, l]) => `<button type="button" class="chip" data-a="${act}along" data-v="${k}" aria-pressed="${R.ak === k}"><span aria-hidden="true">${ic}</span> <span>${l}</span></button>`).join('')}</div>${list}</div>`;
}
/* rehberdeki, rotaya yakın yerler */
function nearAlongHTML(R, skip, addable) {
  if (!R || !R.data || !R.track || R.mode === 'foot-walking') return '';
  const tr = R.track, xs = tr.pts.map(p => p[0]), ys = tr.pts.map(p => p[1]), maxOff = R.mode === 'driving-car' ? 8000 : 3000, pad = maxOff / 90000;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const out = [];
  for (const p of PLACES) {
    if (skip.has(p.id) || p.lng < x0 || p.lng > x1 || p.lat < y0 || p.lat > y1) continue;
    const s = snapTo(tr, p.lat, p.lng, 0); if (s.off <= maxOff) out.push({ p, along: s.along, off: s.off });
  }
  if (!out.length) return '';
  out.sort((a, b) => a.along - b.along);
  return `<div class="alongbox"><b>Yolun üstünde, kaçırma</b><p class="note" style="margin-top:2px">Rotana yakın, rehberdeki görülecek yerler.</p>
    ${out.slice(0, 8).map(({ p, along, off }) => `<div class="alrow"><button class="tname fn" data-a="pick" data-v="${p.id}"><b>${esc(p.n)}</b><span class="count"><span>${CATS[p.c] || ''}</span> · <span>${fmtDist(along)} sonra</span> · <span>rotadan ${fmtDist(off)}</span></span></button>${addable ? `<button class="btn sm" data-a="tradd" data-v="${p.id}">＋ <span>Ekle</span></button>` : ''}</div>`).join('')}</div>`;
}
/* rotayı paylaş: ?rota=yer1~yer2&m=a&k=t (uygulamayla aynı biçim) */
const MODEC = { 'driving-car': 'a', 'foot-walking': 'y', 'cycling-regular': 'b' }, AVC = { tollways: 't', highways: 'h', ferries: 'f' };
const rotaLink = (ids, mode) => `${location.origin}${location.pathname}?rota=${encodeURIComponent(ids.join('~'))}&m=${MODEC[mode] || 'a'}${AVOID.length ? '&k=' + AVOID.map(a => AVC[a]).join('') : ''}`;

/* tek yer yol tarifi kutusuna eklemeler */
const rh30 = routeHTML;
routeHTML = function (p) {
  let h = rh30(p);
  const R = ROUTE;
  if (R.mode === 'driving-car') h = h.replace(/(<div class="chips wrapc">[\s\S]*?<\/div>)/, `$1${avoidChips('ravoid')}`);
  if (R.data && R.state === 'ok') {
    const arr = `<span class="count"> · <span>Varış ${trClockMs(Date.now() + R.data.duration * 1000)}</span></span>`;
    h = h.replace('</span></div>\n    <details class="steps">', `</span>${arr}</div>\n    <details class="steps">`);
    h = h.replace(/(<a class="btn"[^>]*>Google Haritalar’da aç<\/a>)<\/div>$/, `$1<button class="btn" style="margin-top:8px;width:100%" data-a="rshare">↗ <span>Rotayı paylaş</span></button>${alongHTML(R, 'r')}${nearAlongHTML(R, new Set([p.id]), false)}</div>`);
  }
  if (R.state === 'error' && AVOID.length && R.mode === 'driving-car') h = h.replace('</p>', '</p><p class="note">Kaçınma seçeneklerini kapatıp tekrar dene.</p>');
  return h;
};

/* gezi listesi rota kutusuna eklemeler: kaçınma, varış saatleri, durakta kalma süresi, mola, yoldaki yerler, paylaş */
let STAY = ls.get('gezi-stay', {});
const STAYS = [0, 15, 30, 60, 90, 120, 180];
const durShort = m => m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ' ' + (m % 60) + ' dk' : ''}` : `${m} dk`;
const th30 = tripHTML;
tripHTML = function () {
  let h = th30();
  const R = TROUTE; if (!R) return h;
  const items = LIST().map(byId).filter(Boolean);
  if (R.mode === 'driving-car') h = h.replace(/(<div class="chips wrapc"><button type="button" class="chip" data-a="trmode"[\s\S]*?<\/div>)/, `$1${avoidChips('travoid')}`);
  if (R.data) {
    const off = R.fromMe ? 0 : 1; let tm = R.t0 || Date.now(), stayTot = 0;
    const rows = items.map((p, i) => {
      const leg = R.data.legs[i - off];
      if (leg) tm += leg.t * 1000;
      const at = tm, st = STAY[p.id] || 0; tm += st * 60000; stayTot += st;
      return `<li><span class="lnum">${i + 1}</span><span class="fn"><b>${esc(p.n)}</b><span class="count">${leg ? `${fmtDist(leg.d)} · ${durTxt(leg.t)} · ` : ''}${leg || !off ? `<span>Varış ${trClockMs(at)}</span>` : ''}</span></span><button class="chip stay" data-a="tstay" data-v="${p.id}" aria-label="Kalma süresi ekle">⏱ ${st ? `<span>${durTxt(st * 60)} kal</span>` : '＋'}</button></li>`;
    }).join('');
    h = h.replace(/<ol class="legs">[\s\S]*?<\/ol>/, `<ol class="legs">${rows}</ol>${stayTot ? `<p class="note"><span>${durTxt(stayTot * 60)} mola dahil</span> · <span>Varış ${trClockMs(tm)}</span></p>` : `<p class="note"><span>Varış ${trClockMs(tm)}</span></p>`}`);
    const extra = `<button class="btn" style="margin-top:8px;width:100%" data-a="trshare">↗ <span>Rotayı paylaş</span></button>${alongHTML(R, 'tr')}${nearAlongHTML(R, new Set(items.map(p => p.id)), !Array.isArray(XV.arg))}`;
    h = h.replace(/(Google Haritalar’da aç<\/a>)<\/div>/, `$1${extra}</div>`);
  }
  if (R.state === 'error' && AVOID.length && R.mode === 'driving-car') h = h.replace('</p>\n      <button class="btn pri" style="margin-top:10px;width:100%" data-a="tnav"', '</p><p class="note">Kaçınma seçeneklerini kapatıp tekrar dene.</p>\n      <button class="btn pri" style="margin-top:10px;width:100%" data-a="tnav"');
  return h;
};
const tr30 = tripRoute;
tripRoute = async function (mode) { await tr30(mode); if (TROUTE && TROUTE.data) { TROUTE.track = prepTrack(TROUTE.data.geometry); TROUTE.t0 = Date.now(); TROUTE.along = null; TROUTE.ak = null; renderX(); } };
async function loadAlong(R, k, rerender) {
  if (R.ak === k) { R.ak = null; R.along = null; rerender(); return; }
  R.ak = k; R.along = 'loading'; rerender();
  try { const list = await fetchAlong(R.track, k === 'rest' ? ['rest', 'fuel'] : [k]); if (R.ak === k) R.along = list; }
  catch (_) { if (R.ak === k) R.along = 'error'; }
  rerender();
}
Object.assign(A, {
  ravoid: v => { toggleAvoid(v); loadRoute(); },
  travoid: v => { toggleAvoid(v); tripRoute(); },
  ralong: v => { if (ROUTE) loadAlong(ROUTE, v, renderDetail); },
  tralong: v => { if (TROUTE) loadAlong(TROUTE, v, renderX); },
  tstay: v => { const c = STAY[v] || 0; STAY[v] = STAYS[(STAYS.indexOf(c) + 1) % STAYS.length]; if (!STAY[v]) delete STAY[v]; ls.set('gezi-stay', STAY); renderX(); },
  tradd: v => { if (!TRIP.includes(v)) { const items = TRIP.map(byId).filter(Boolean), p = byId(v); let idx = TRIP.length; if (TROUTE && TROUTE.track && p) { const at = snapTo(TROUTE.track, p.lat, p.lng, 0).along; const j = items.findIndex(x => snapTo(TROUTE.track, x.lat, x.lng, 0).along > at); if (j >= 0) idx = j; } if (TRIP.length >= 24) { toast('Gezi listen dolu (en fazla 24 yer).'); return; } TRIP.splice(idx, 0, v); tripSave(); toast('Gezi listene eklendi'); tripRoute(); } },
  rshare: () => { if (ROUTE) shareLink(rotaLink([ROUTE.pid], ROUTE.mode), tx('Rotam'), byId(ROUTE.pid) ? byId(ROUTE.pid).n : ''); },
  trshare: () => { const ids = LIST().slice(); if (ids.length && TROUTE) shareLink(rotaLink(ids, TROUTE.mode), tx('Rotam'), ids.map(id => (byId(id) || {}).n).filter(Boolean).join(' → ')); },
});
/* ?rota= bağlantısı: duraklar (rehberdeki yerler) geçici gezi planı olarak açılır, rota çizilir */
(function openRotaLink() {
  let q = null; try { q = new URLSearchParams(location.search); } catch (_) { }
  const raw = q && q.get('rota'); if (!raw) return;
  const ids = raw.split('~').filter(x => /^[a-z0-9_-]{1,64}$/i.test(x)).slice(0, 23);
  const mode = Object.keys(MODEC).find(k => MODEC[k] === q.get('m')) || 'driving-car', k = q.get('k') || '';
  AVOID = Object.keys(AVC).filter(x => k.includes(AVC[x]));
  let n = 0;
  const go = () => {
    const ok = ids.filter(id => byId(id));
    if (ok.length || n++ >= 20) { if (ok.length) { track('act:open_link'); showX('trip', ok); tripRoute(mode); toast('Seninle bir rota paylaşıldı'); } try { history.replaceState(null, '', location.pathname); } catch (_) { } }
    else setTimeout(go, 500);
  };
  setTimeout(go, 700);
})();

/* ---------- navigasyonda uzun yol molası: 2 saat aralıksız sürüşte hatırlat ---------- */
document.querySelector('#navui .npanel').insertAdjacentHTML('beforebegin', '<div class="nbreak" id="nbreak" hidden></div>');
$('nmute').insertAdjacentHTML('beforebegin', '<button class="nicon" data-a="nbreakfind" id="nbrk" aria-label="Mola yeri bul" hidden>☕</button>');
const ns30 = navStart;
navStart = async function (ids, mode) { await ns30(ids, mode); if (NAV) { NAV.drive0 = Date.now(); NAV.lastMove = null; NAV.brkAsked = false; } };
const nf30 = navFix;
navFix = function (c) {
  nf30(c);
  if (!NAV || NAV.mode !== 'driving-car' || !NAV.route) return;
  $('nbrk').hidden = NAV.status !== 'nav';
  const now = Date.now(), me = { lat: c.latitude, lng: c.longitude }, lm = NAV.lastMove;
  if (!lm || meters(lm.lat, lm.lng, me.lat, me.lng) > 80) NAV.lastMove = { ...me, at: now };
  else if (now - lm.at > 10 * 60000) { NAV.drive0 = now; NAV.brkAsked = false; }
  if (now - (NAV.drive0 || now) > 2 * 3600e3 && !NAV.brkAsked) {
    NAV.brkAsked = true; navSay(tx('2 saattir yoldasın. Kısa bir mola vermeye ne dersin?'));
    const b = $('nbreak'); b.hidden = false;
    b.innerHTML = `<b>☕ <span>2 saattir yoldasın. Kısa bir mola iyi gelir.</span></b><div class="acts"><button class="btn pri" data-a="nbreakfind"><span>Mola yeri bul</span></button><button class="btn" data-a="nbreakx"><span>Sonra</span></button></div>`;
  }
};
Object.assign(A, {
  nbreakx: () => { $('nbreak').hidden = true; if (NAV) { NAV.drive0 = Date.now(); NAV.brkAsked = false; } },
  nbreakfind: async () => {
    if (!NAV || !NAV.track) return;
    const b = $('nbreak'); b.hidden = false; b.innerHTML = '<b>İleride mola yerleri</b><p class="note">Aranıyor…</p>';
    const from = (NAV.sn ? NAV.sn.along : 0) + 300;
    let list = [];
    try { list = (await fetchAlong(NAV.track, ['rest', 'fuel', 'food'], from, from + 45000)).slice(0, 5); } catch (_) { }
    NAV.brkList = list;
    b.innerHTML = `<div class="rhead"><b>İleride mola yerleri</b><button type="button" class="xb" data-a="nbreakx" aria-label="Kapat">${CLOSE_SVG}</button></div>${list.length ? list.map((a, i) => `<button class="alrow nbr" data-a="nbreakadd" data-v="${i}"><span class="ali" aria-hidden="true">${kIcon(a.k)}</span><span class="fn"><b>${a.n ? esc(a.n) : '<span>Mola</span>'}</b></span><span class="count">${fmtDist(Math.max(0, a.along - from + 300))}</span><span aria-hidden="true">＋</span></button>`).join('') : '<p class="note">Önümüzdeki 45 km içinde bulunamadı.</p>'}`;
  },
  nbreakadd: v => {
    if (!NAV || !NAV.brkList) return;
    const a = NAV.brkList[+v]; if (!a) return;
    const at = NAV.leg0 + NAV.lastLeg;
    NAV.stops.splice(at, 0, { n: a.n || tx('Mola'), lat: a.lat, lng: a.lng, k: a.k });
    $('nbreak').hidden = true; NAV.drive0 = Date.now(); NAV.brkAsked = false;
    if (MEPOS) { NAV.status = 'reroute'; navPaint(); navLoad(MEPOS, at); }
  },
});
const ne30 = A.navend;
A.navend = () => { const b = $('nbreak'); if (b) b.hidden = true; ne30(); };

/* ---------- açılış saatleri (OpenStreetMap; sunucu place_hours tablosunu doldurur) ---------- */
const OHD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], OHM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function ohDays(s) { const out = new Set(); for (const part of s.split(',')) { const m = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(part.trim()); if (!m) return null; const a = OHD.indexOf(m[1]), b = m[2] ? OHD.indexOf(m[2]) : a; for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; } } return out; }
function ohMonths(s) { const out = new Set(); for (const part of s.split(',')) { const m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{1,2})?(?:-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{1,2})?)?$/.exec(part.trim()); if (!m) return null; const a = OHM.indexOf(m[1]), b = m[2] ? OHM.indexOf(m[2]) : a; for (let i = a; ; i = (i + 1) % 12) { out.add(i); if (i === b) break; } } return out; }
const ohMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
function parseOH(raw) {
  const s = raw.trim(); if (s === '24/7') return 'always';
  const rules = [];
  for (let part of s.split(/;|\|\|/)) {
    part = part.trim(); if (!part || /^(PH|SH)\b/.test(part)) continue;
    part = part.replace(/,\s*PH\b/g, '').replace(/\bPH\s*,/g, '').replace(/\s*,\s*/g, ',');
    let months = null, days = null;
    const mm = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^:A-Z]*(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\d ]*)?(?:,(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\d -]*)*):?\s+/.exec(part);
    if (mm) { months = ohMonths(mm[1].replace(/:$/, '').trim()); if (!months) return null; part = part.slice(mm[0].length).trim(); }
    const dm = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s*/.exec(part);
    if (dm) { days = ohDays(dm[1]); if (!days) return null; part = part.slice(dm[0].length).trim(); }
    if (/^(off|closed)$/i.test(part)) { rules.push({ months, days, spans: 'off' }); continue; }
    if (part === '24/7' || part === '00:00-24:00') { rules.push({ months, days, spans: [[0, 1440]] }); continue; }
    const spans = [];
    for (const sp of part.split(',')) { const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\+?$/.exec(sp.trim()); if (!m) return null; let a = ohMin(m[1]), b = ohMin(m[2]); if (b <= a) b += 1440; spans.push([a, b]); }
    if (!spans.length) return null;
    rules.push({ months, days, spans });
  }
  return rules.length ? rules : null;
}
const trNowOH = ms => { const d = new Date((ms || Date.now()) + 3 * 3600e3); return { wd: (d.getUTCDay() + 6) % 7, mon: d.getUTCMonth(), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; };
const spansFor = (rules, wd, mon) => { let res = []; for (const r of rules) { if (r.months && !r.months.has(mon)) continue; if (r.days && !r.days.has(wd)) continue; res = r.spans === 'off' ? [] : r.spans; } return res; };
function openState(raw, ms) {
  const r = parseOH(raw); if (!r) return null;
  if (r === 'always') return { open: true, always: true };
  ms = ms || Date.now(); const { wd, mon, min } = trNowOH(ms);
  for (const [, b] of spansFor(r, (wd + 6) % 7, mon)) if (b > 1440 && min < b - 1440) return { open: true, until: b - 1440 - min };
  for (const [a, b] of spansFor(r, wd, mon)) if (min >= a && min < b) return a <= 0 && b >= 1440 ? { open: true, allDay: true } : { open: true, until: b - min };
  for (let k = 0; k < 8; k++) { const sp = spansFor(r, (wd + k) % 7, trNowOH(ms + k * 864e5).mon).map(x => x[0]).sort((x, y) => x - y).filter(a => k > 0 || a > min); if (sp.length) return { open: false, next: { day: k, min: sp[0] } }; }
  return { open: false };
}
const hhmm = m => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const DAYN = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'], DAYS3 = { Mo: 'Pzt', Tu: 'Sal', We: 'Çar', Th: 'Per', Fr: 'Cum', Sa: 'Cmt', Su: 'Paz' };
function openTxt(st) {
  if (st.always) return ['ok', '<span>7/24 açık</span>'];
  if (st.allDay) return ['ok', '<span>Bugün 24 saat açık</span>'];
  if (st.open) return st.until != null && st.until <= 60 ? ['warn', `<span>Açık</span> · <span>kapanmasına ${st.until} dk</span>`] : ['ok', `<span>Açık</span> · <span>${hhmm(trNowOH().min + st.until)} kapanır</span>`];
  if (!st.next) return ['bad', '<span>Kapalı</span>'];
  const t = hhmm(st.next.min), when = st.next.day === 0 ? `<span>bugün ${t} açılır</span>` : st.next.day === 1 ? `<span>yarın ${t} açılır</span>` : `<span>${DAYN[(trNowOH().wd + st.next.day) % 7]}</span> <span>${t} açılır</span>`;
  return ['bad', `<span>Kapalı</span> · ${when}`];
}
let HOURS = null;
async function loadHours() {
  if (HOURS) return HOURS;
  try {
    const all = [];
    for (let from = 0; from < 3000; from += 1000) { const { data, error } = await sb.from('place_hours').select('place_id,oh').not('oh', 'is', null).range(from, from + 999); if (error) throw error; all.push(...(data || [])); if (!data || data.length < 1000) break; }
    HOURS = new Map(all.map(r => [r.place_id, r.oh])); ls.set('gezi-hours', all);
  } catch (_) { HOURS = new Map((ls.get('gezi-hours', []) || []).map(r => [r.place_id, r.oh])); }
  return HOURS;
}
const isOpenNow = id => { const oh = HOURS && HOURS.get(id); if (!oh) return null; const st = openState(oh); return st ? st.open : null; };
function hoursHTML(p) {
  const oh = HOURS && HOURS.get(p.id); if (!oh) return '';
  const st = openState(oh), [tone, txt] = st ? openTxt(st) : ['', ''];
  const pretty = esc(oh).replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, d => `<span>${DAYS3[d]}</span>`).replace(/\boff\b|\bclosed\b/gi, '<span>kapalı</span>').replace(/\bPH\b/g, '<span>resmi tatil</span>').replace(/;\s*/g, '<br>');
  return `<div class="box hoursbox"><b>🕒 <span>Açılış saatleri</span></b>${st ? `<p class="ohs ${tone}">${txt}</p>` : ''}<p style="margin:4px 0 0">${pretty}</p><p class="note">OpenStreetMap verisi; bayram ve özel günlerde değişebilir. Gitmeden önce resmi kaynaktan kontrol et.</p></div>`;
}

/* ---------- cami ziyaret saatleri (vakitler hesaplanır; Diyanet'e yakın açılar ve temkin) ---------- */
function prayerTimes(lat, lng, ms) {
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const tr = new Date((ms || Date.now()) + 3 * 3600e3), y = tr.getUTCFullYear(), m = tr.getUTCMonth() + 1, d = tr.getUTCDate();
  const jd = 367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + d + 1721013.5 + 0.5, D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360, q = (280.459 + 0.98564736 * D) % 360, L = (q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g))) % 360, e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  let eqt = q / 15 - ((RA + 24) % 24); eqt = ((eqt + 12) % 24 + 24) % 24 - 12;
  const noon = 12 - eqt - lng / 15 + 3;
  const ha = a => deg(Math.acos(Math.max(-1, Math.min(1, (-Math.sin(rad(a)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl))))))) / 15;
  const asr = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl)))))), M = h => Math.round(h * 60);
  return { imsak: M(noon - ha(18)) - 2, gunes: M(noon - ha(0.833)) - 7, ogle: M(noon) + 5, ikindi: M(noon + ha(asr)) + 4, aksam: M(noon + ha(0.833)) + 7, yatsi: M(noon + ha(17)) + 2 };
}
function mosqueHTML(p) {
  if (p.c !== 'cami') return '';
  const pt = prayerTimes(p.lat, p.lng), tr = new Date(Date.now() + 3 * 3600e3), min = tr.getUTCHours() * 60 + tr.getUTCMinutes(), fri = tr.getUTCDay() === 5;
  const closed = [[pt.ogle - (fri ? 45 : 10), pt.ogle + (fri ? 60 : 35), fri ? 'Cuma namazı' : 'Öğle namazı'], [pt.ikindi - 10, pt.ikindi + 30, 'İkindi namazı'], [pt.aksam - 10, pt.aksam + 30, 'Akşam namazı']];
  const vs = Math.max(pt.gunes + 60, 540), ve = pt.yatsi - 15, inP = closed.find(([a, b]) => min >= a && min < b);
  const head = min < vs || min >= ve ? ['bad', '<span>Ziyaret saatleri dışında</span>'] : inP ? ['warn', `<span>${inP[2]}</span> · <span>${hhmm(inP[1])} sonrası tekrar uygun</span>`] : ['ok', '<span>Şu an ziyarete uygun</span>'];
  const open = []; let cur = vs;
  for (const [a, b] of closed) { if (a > cur && a < ve) open.push([cur, Math.min(a, ve)]); cur = Math.max(cur, b); }
  if (cur < ve) open.push([cur, ve]);
  const T = [['İmsak', pt.imsak], ['Güneş', pt.gunes], ['Öğle', pt.ogle], ['İkindi', pt.ikindi], ['Akşam', pt.aksam], ['Yatsı', pt.yatsi]];
  return `<div class="box hoursbox"><b>🕌 <span>Ziyaret saatleri</span></b><p class="ohs ${head[0]}">${head[1]}</p>
    <p style="margin:4px 0 0"><span>Bugün uygun aralıklar</span>: ${open.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join(', ')}</p>
    <div class="ptimes">${T.map(([n, v]) => `<span><small>${n}</small><b>${hhmm(v)}</b></span>`).join('')}</div>
    ${fri ? '<p style="margin:6px 0 0">Cuma günleri öğle namazı daha kalabalık ve uzundur; öğle saatlerinden kaçın.</p>' : ''}
    <p style="margin:6px 0 0">Ayakkabılar girişte çıkarılır. Kadınlar başını örter; omuzlar ve dizler kapalı olmalıdır. Namaz kılanların önünden geçme, fotoğraf çekerken flaş kullanma.</p>
    <p class="note">Vakitler hesaplanmıştır ve birkaç dakika farklı olabilir.</p></div>`;
}
const rd30 = renderDetail;
renderDetail = function () {
  rd30();
  if (S.tab !== 'ov' || !S.sel) return;
  const p = byId(S.sel); if (!p) return;
  const at = $('detail').querySelector('.sunbox') || $('detail').querySelector('.para');
  const html = mosqueHTML(p) + hoursHTML(p);
  if (html) { if (at) at.insertAdjacentHTML('afterend', html); else $('detail').insertAdjacentHTML('beforeend', html); }
  if (!HOURS && ONLINE()) loadHours().then(() => { if (S.sel === p.id && S.tab === 'ov' && HOURS.get(p.id)) renderDetail(); });
};
/* liste: "Şu an açık" süzgeci */
S.open = false;
const mp30 = matchPlace;
matchPlace = function (p, q, ig) { return mp30(p, q, ig) && (!S.open || isOpenNow(p.id) === true); };
const rc30 = renderChips;
renderChips = function () {
  rc30();
  const s = $('regions').querySelector('[data-a="season"]');
  const h = `<button class="chip" data-a="opennow" aria-pressed="${S.open}"><span aria-hidden="true">🕒</span> <span>Şu an açık</span></button>`;
  if (s) s.insertAdjacentHTML('afterend', h); else $('regions').insertAdjacentHTML('afterbegin', h);
};
A.opennow = async () => { if (!S.open && !HOURS) await loadHours(); S.open = !S.open; renderChips(); renderList(); if (S.sel) back(); fitResults(); };
setTimeout(() => { if (ONLINE()) loadHours(); }, 4000);

/* ---------- acil durum, döviz çevirici, fiyat rehberi ---------- */
const NUMS = [['112', 'Acil çağrı', 'Ambulans, polis, itfaiye, jandarma ve sahil güvenlik: tüm acil durumlar için tek numara. Ücretsiz aranır.'],
  ['157', 'YİMER · Yabancılar iletişim merkezi', 'Yabancılar için 7/24 danışma: Türkçe, İngilizce, Arapça, Rusça, Almanca ve Farsça.'],
  ['177', 'Orman yangını ihbar', 'Ormanda duman ya da ateş görürsen.']];
const ERK = [['hospital', '🏥', 'Hastane'], ['pharmacy', '💊', 'Eczane'], ['police', '👮', 'Polis']];
const ER = { k: 'hospital', items: null, state: '' };
function emergencyHTML() {
  const list = ER.state === 'loading' ? '<p class="note">Aranıyor…</p>' : ER.state === 'noloc' ? '<p class="note">Yakındaki yerleri görmek için konum izni ver.</p>' : ER.state === 'error' ? '<p class="note">Şu an yüklenemedi. İnternet bağlantını kontrol et.</p>'
    : ER.items ? (ER.items.length ? ER.items.map(x => `<div class="alrow"><span class="fn"><b>${x.n ? esc(x.n) : `<span>${(ERK.find(e => e[0] === x.k) || ['', '', ''])[2]}</span>`}</b><span class="count">${fmtDist(x.d)}${x.em ? ' · <span>Acil servis var</span>' : ''}${x.h ? ' · <span>7/24 açık</span>' : ''}</span></span>${x.ph ? `<a class="btn sm" href="tel:${esc(x.ph.split(';')[0].replace(/[^\d+]/g, ''))}" aria-label="Ara">📞</a>` : ''}<a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}" target="_blank" rel="noopener" aria-label="Yol tarifi">🧭</a></div>`).join('') : '<p class="note">Yakında bulunamadı.</p>') : '';
  return `<h1 class="xh">Acil durum</h1>
    ${NUMS.map(([n, l, d], i) => `<a class="ernum${i ? '' : ' main'}" href="tel:${n}"><span class="ern">${n}</span><span class="fn"><b>${l}</b><span class="count">${d}</span></span><span aria-hidden="true">📞</span></a>`).join('')}
    <p class="note">155, 156 ve 110 gibi eski numaralar da 112’ye yönlendirilir.</p>
    <a class="box planit" href="https://www.mfa.gov.tr/diplomatic-missions-in-turkey.en.mfa" target="_blank" rel="noopener"><span class="pic" aria-hidden="true">🏛</span><span class="pt"><b>Büyükelçilik ve konsolosluklar</b><span class="count">Pasaportunu kaybettiysen ülkenin temsilciliğine başvur.</span></span><span class="count">↗</span></a>
    <h2 class="xh2">Yakınındakiler</h2>
    <div class="chips wrapc">${ERK.map(([k, ic, l]) => `<button type="button" class="chip" data-a="erk" data-v="${k}" aria-pressed="${ER.k === k}"><span aria-hidden="true">${ic}</span> <span>${l}</span></button>`).join('')}</div>
    ${list}${ER.k === 'pharmacy' ? '<p class="note">Gece ve tatil günlerinde nöbetçi eczane listesi her eczanenin kapısında asılıdır.</p>' : ''}<p class="note">© OpenStreetMap</p>`;
}
async function loadER(k) {
  ER.k = k; ER.items = null; ER.state = 'loading'; renderX();
  try { if (!MEPOS) await locate(); } catch (_) { }
  if (!MEPOS) { ER.state = 'noloc'; renderX(); return; }
  const me = MEPOS;
  try {
    let list;
    try { list = await osmInBoxes(lineBoxes([[me.lng, me.lat]], k === 'hospital' ? 8000 : 3000), [k]); ls.set('gezi-er-' + k, list); }
    catch (_) { list = ls.get('gezi-er-' + k, null); if (!list) throw new Error('offline'); }
    ER.items = list.map(x => ({ ...x, d: meters(me.lat, me.lng, x.lat, x.lng) })).sort((a, b) => (b.em || 0) - (a.em || 0) || a.d - b.d).slice(0, 12); ER.state = '';
  } catch (_) { ER.state = 'error'; }
  if (XV && XV.kind === 'emergency') renderX();
}
let FX = null;
async function loadFx() {
  if (FX) return FX;
  try { const { data, error } = await sb.functions.invoke('fx', { body: {} }); if (error || !data || !data.rates) throw error || new Error('fx'); FX = data; ls.set('gezi-fx', FX); }
  catch (_) { const c = ls.get('gezi-fx', null); FX = c ? { ...c, stale: true } : null; }
  return FX;
}
const toTRY = (amount, cur) => cur === 'TRY' ? amount : FX && FX.rates[cur] ? amount * FX.rates[cur] : null;
const FXC = ['EUR', 'USD', 'GBP', 'RUB', 'CHF', 'SAR', 'AED', 'JPY', 'CNY', 'AZN', 'SEK', 'NOK', 'DKK', 'CAD', 'AUD', 'PLN', 'RON', 'KWD', 'QAR'];
const FXS = { cur: 'EUR', amt: '100', dir: 'to' };
const money2 = (n, c) => { try { return n.toLocaleString(window.LANG || 'tr', { style: 'currency', currency: c, maximumFractionDigits: 2 }); } catch (_) { return `${n.toFixed(2)} ${c}`; } };
function fxResult() { const v = parseFloat(String(FXS.amt).replace(',', '.')) || 0, r = FX && FX.rates[FXS.cur]; return r ? money2(FXS.dir === 'to' ? v * r : v / r, FXS.dir === 'to' ? 'TRY' : FXS.cur) : '—'; }
function fxHTML() {
  if (!FX) return `<h1 class="xh">Döviz çevirici</h1><p class="note">${FX === null && FXS.tried ? 'Kurlar şu an alınamadı.' : 'Yükleniyor…'}</p>`;
  const r = FX.rates[FXS.cur];
  return `<h1 class="xh">Döviz çevirici</h1>
    <div class="chips" style="overflow-x:auto;flex-wrap:nowrap">${FXC.filter(c => FX.rates[c]).map(c => `<button type="button" class="chip" data-a="fxc" data-v="${c}" aria-pressed="${FXS.cur === c}" translate="no">${c}</button>`).join('')}</div>
    <div class="box"><b translate="no">${FXS.dir === 'to' ? `${FXS.cur} → TRY` : `TRY → ${FXS.cur}`}</b><input id="fxamt" class="fxin" inputmode="decimal" value="${esc(FXS.amt)}" aria-label="Tutar"><p class="fxres" id="fxres">= ${fxResult()}</p><button class="btn" data-a="fxdir">⇅ <span>Yönü değiştir</span></button></div>
    ${r ? `<p class="note">1 ${FXS.cur} = ${money2(r, 'TRY')} · <span>TCMB döviz satış kuru, ${esc(FX.date)}</span>${FX.stale ? ' · <span>çevrimdışı, son bilinen kur</span>' : ''}</p>` : ''}
    <p class="note">Döviz bürosu ve kart kurları farklı olabilir; gösterilen değer yaklaşıktır.</p>
    <div class="box">${['EUR', 'USD', 'GBP'].filter(c => FX.rates[c]).map(c => `<p style="margin:2px 0;display:flex;justify-content:space-between"><b>1 ${c}</b><span>${money2(FX.rates[c], 'TRY')}</span></p>`).join('')}</div>
    <button class="btn" style="width:100%;margin-top:12px" data-a="mprices">🏷 <span>Fiyat rehberi</span></button>`;
}
document.addEventListener('input', ev => { if (ev.target && ev.target.id === 'fxamt') { FXS.amt = ev.target.value; const o = $('fxres'); if (o) o.textContent = '= ' + fxResult(); } });
let PRICES;
async function loadPrices() {
  try { const { data } = await sb.from('app_settings').select('value').eq('key', 'price_guide').maybeSingle(); PRICES = JSON.parse((data && data.value) || 'null'); ls.set('gezi-prices', PRICES); }
  catch (_) { PRICES = ls.get('gezi-prices', null); }
  if (XV && XV.kind === 'prices') renderX();
}
function pricesHTML() {
  const g = PRICES;
  const body = g === undefined ? '<p class="note">Yükleniyor…</p>' : !g ? '<p class="note">Fiyat rehberi şu an yüklenemedi.</p>'
    : `<p class="note">Yaklaşık fiyatlar; enflasyon nedeniyle sık değişir. Parantez içinde fiyatın tarihi var.</p>
      <div class="box">${g.items.map(([ic, l, pr, when]) => `<div class="alrow"><span class="ali" aria-hidden="true">${ic}</span><span class="fn"><b>${esc(l)}</b>${when ? `<span class="count">(${esc(when)})</span>` : ''}</span><b class="price" translate="no">${esc(pr)}</b></div>`).join('')}</div>
      <h2 class="xh2">İpuçları</h2>${g.tips.map(x => `<p style="margin:6px 0">• ${esc(x)}</p>`).join('')}`;
  return `<h1 class="xh">Fiyat rehberi</h1>${body}<button class="btn" style="width:100%;margin-top:12px" data-a="mfx">💱 <span>Döviz çevirici</span></button>`;
}
const pl30 = planHTML;
planHTML = function () {
  return pl30().replace('<button class="planit" data-a="mpaint">', `<button class="planit" data-a="mfx"><span class="pic" aria-hidden="true">💱</span><span class="pt"><b>Döviz çevirici</b><span class="count">Merkez Bankası kuruyla TL hesabı</span></span><span class="count" aria-hidden="true">›</span></button><button class="planit" data-a="mprices"><span class="pic" aria-hidden="true">🏷</span><span class="pt"><b>Fiyat rehberi</b><span class="count">Simit, ulaşım, taksi ve müze fiyatları</span></span><span class="count" aria-hidden="true">›</span></button><button class="planit" data-a="memerg"><span class="pic" aria-hidden="true">🆘</span><span class="pt"><b>Acil durum</b><span class="count">112, en yakın hastane ve eczane</span></span><span class="count" aria-hidden="true">›</span></button><button class="planit" data-a="mpaint">`);
};
const rx30 = renderX;
renderX = function () {
  if (XV && ['emergency', 'fx', 'prices'].includes(XV.kind)) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>${XV.prev ? 'Geri' : 'Tüm yerler'}</span></button>`;
    $('xbody').innerHTML = back + (XV.kind === 'emergency' ? emergencyHTML() : XV.kind === 'fx' ? fxHTML() : pricesHTML());
    return;
  }
  rx30();
};
(function menuEmergency() {
  const m = $('acctmenu'), h = m && m.querySelector('[data-a="mhelp"]'); if (!h) return;
  h.insertAdjacentHTML('afterend', '<button role="menuitem" data-a="memerg"><span class="emi" aria-hidden="true">🆘</span><span>Acil durum</span></button>');
})();
Object.assign(A, {
  memerg: () => { toggleMenu(false); showX('emergency', null, XV && XV.kind === 'plan' ? 'plan' : null); if (!ER.items) loadER(ER.k); },
  erk: v => loadER(v),
  mfx: () => { toggleMenu(false); showX('fx', null, XV && ['plan', 'prices'].includes(XV.kind) ? XV.kind : null); if (!FX) loadFx().then(() => { FXS.tried = true; if (XV && XV.kind === 'fx') renderX(); }); },
  fxc: v => { FXS.cur = v; renderX(); },
  fxdir: () => { FXS.dir = FXS.dir === 'to' ? 'from' : 'to'; renderX(); },
  mprices: () => { toggleMenu(false); showX('prices', null, XV && ['plan', 'fx'].includes(XV.kind) ? XV.kind : null); if (PRICES === undefined) loadPrices(); },
});

/* harcamalar: yabancı paralar varsa yaklaşık TL toplamı */
const eh30 = expHTML;
expHTML = function (jid) {
  let h = eh30(jid); const list = EXP[jid];
  if (!list || !list.length || list.every(e => e.currency === 'TRY')) return h;
  if (!FX) { loadFx().then(() => { const b = $('expbox'); if (b && FX) { const open = b.querySelector('details') && b.querySelector('details').open; b.innerHTML = expHTML(jid); if (open) b.querySelector('details').open = true; } }); return h; }
  let sum = 0; for (const e of list) { const x = toTRY(e.amount, e.currency); if (x == null) return h; sum += x; }
  return h.replace('</span><span class="note" style="display:block;margin:2px 0 0">', `</span><span class="count" style="display:block">≈ ${fmt(Math.round(sum))} ₺ · <span>TCMB kuruyla</span></span><span class="note" style="display:block;margin:2px 0 0">`);
};

/* ---------- şehir planı: gidiş günü seç, o günün hava tahmini ---------- */
REC.start = null;
const dayLbl = o => o === 0 ? '<span>Bugün</span>' : o === 1 ? '<span>Yarın</span>' : esc((() => { try { return new Date(Date.now() + o * 864e5).toLocaleDateString(window.LANG || 'tr', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (_) { return '+' + o; } })());
function dayWxHTML(p, o) {
  const k = p.lat.toFixed(2) + ',' + p.lng.toFixed(2), hit = WX[k];
  if (!hit) { getWeather(p).then(() => { if (XV && XV.kind === 'city') renderX(); }).catch(() => { }); return '<p class="note">Yükleniyor…</p>'; }
  const d = hit.w.days[o]; if (!d) return '<p class="note">Bu gün için hava tahmini henüz yok.</p>';
  const [ic, l] = wmo(d.c);
  return `<div class="daywx"><span class="wxi" aria-hidden="true">${ic}</span><span><b><span>${l}</span> · ${fmt(Math.round(d.hi))}° / ${fmt(Math.round(d.lo))}°</b>${d.p != null ? `<br><span class="count"><span>Yağış olasılığı %${fmt(d.p)}</span></span>` : ''}${d.p != null && d.p >= 60 ? '<br><span class="count" style="color:var(--accent);font-weight:700">Yağmurlu görünüyor; kapalı mekânları bu güne koymayı düşün.</span>' : ''}</span></div>`;
}
const ch30 = cityHTML;
cityHTML = function () {
  let h = ch30();
  const chips = `<p class="row-label" style="margin-top:12px">Ne zaman gidiyorsun?</p><div class="chips" style="overflow-x:auto;flex-wrap:nowrap">${[0, 1, 2, 3, 4, 5, 6].map(o => `<button class="chip" data-a="rstart" data-v="${o}" aria-pressed="${REC.start === o}">${dayLbl(o)}</button>`).join('')}</div>`;
  let wx = '';
  if (REC.start != null) {
    const cur = curPlan(), o = REC.start + REC.day;
    wx = cur[0] ? (o <= 6 ? `<p class="row-label" style="margin-top:10px">${dayLbl(o)} · <span>Hava tahmini</span></p>${dayWxHTML(cur[0], o)}` : '<p class="note">Bu gün için hava tahmini henüz yok.</p>') : '';
  }
  return h.replace('<ol class="plan">', chips + wx + '<ol class="plan">');
};
A.rstart = v => { REC.start = REC.start === +v ? null : +v; renderX(); };
