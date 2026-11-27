/* ---------- canlı navigasyon, gezi listesi, şehir önerisi, rozetler, hava durumu, paylaş,
   geri bildirim, şikâyet, gizlilik (uygulamadaki özelliklerin aynısı) ---------- */
const ONLINE = () => typeof sb !== 'undefined' && !!sb;
const CLOSE_SVG = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const openDlg = d => { if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', ''); };
const closeDlg = d => { d.close ? d.close() : d.removeAttribute('open'); };
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } } };
const isMine = x => x.ruid ? !!(ME && x.ruid === ME.id) : !!(CUR && x.uid === CUR.email);

/* ===== rota hesapları (uygulamadaki routing.ts ile aynı) ===== */
const ARROW = { 0: '←', 1: '→', 2: '↙', 3: '↘', 4: '↖', 5: '↗', 6: '↑', 7: '↻', 8: '↻', 9: '↶', 10: '⚑', 11: '↑', 12: '↖', 13: '↗' };
function prepTrack(geom) {
  const pts = geom.coordinates, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + meters(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]));
  return { pts, cum, total: cum[cum.length - 1] || 0 };
}
function snapTo(tr, lat, lng, hint) {
  const kx = 111320 * Math.cos(lat * Math.PI / 180), ky = 110540;
  let best = { idx: 0, along: 0, off: Infinity, lng: tr.pts[0][0], lat: tr.pts[0][1] };
  const scan = (a, b) => {
    for (let i = Math.max(0, a); i < Math.min(tr.pts.length - 1, b); i++) {
      const [x1, y1] = tr.pts[i], [x2, y2] = tr.pts[i + 1];
      const ax = (x1 - lng) * kx, ay = (y1 - lat) * ky, dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L = dx * dx + dy * dy;
      const u = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0, d = Math.hypot(ax + u * dx, ay + u * dy);
      if (d < best.off) best = { idx: i, along: tr.cum[i] + u * (tr.cum[i + 1] - tr.cum[i]), off: d, lng: x1 + u * (x2 - x1), lat: y1 + u * (y2 - y1) };
    }
  };
  scan((hint || 0) - 30, (hint || 0) + 400);
  if (best.off > 60) scan(0, tr.pts.length);
  return best;
}
const stepAt = (steps, idx) => { for (let k = 0; k < steps.length; k++) if (idx >= steps[k].w && idx < Math.max(steps[k].e, steps[k].w + 1)) return k; return Math.max(0, steps.length - 1); };
function nearestOrder(items, start) {
  const rest = items.slice(), out = [];
  let cur = start || rest[0];
  if (!start && rest.length) out.push(rest.shift());
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = meters(cur.lat, cur.lng, p.lat, p.lng); if (d < bd) { bd = d; bi = i; } });
    cur = rest[bi]; out.push(rest.splice(bi, 1)[0]);
  }
  return out;
}
const ROUTE_ERR = c => c === 'no_key' ? 'Uygulama içi yol tarifi çok yakında açılacak. Şimdilik Google Haritalar ile devam edebilirsin.'
  : c === 'rate_limited' ? 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.' : c === 'network' ? 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.' : 'Rota bulunamadı.';
async function fetchRoute(profile, coords) {
  if (!ONLINE()) { const e = new Error('no_key'); e.code = 'no_key'; throw e; }
  let res;
  try { res = await sb.functions.invoke('route', { body: { profile, coordinates: coords, language: window.LANG || 'tr' } }); }
  catch (_) { const e = new Error('network'); e.code = 'network'; throw e; }
  if (res.error) { let code = 'no_route'; try { code = (await res.error.context.json()).error || code; } catch (_) { code = 'network'; } const e = new Error(code); e.code = code; throw e; }
  const r = res.data;
  r.steps = (r.steps || []).map(s => ({ i: s.i || '', d: s.d || 0, t: s.t || 0, w: s.w || 0, e: s.e || 0, y: s.y ?? -1, k: s.k || 0 }));
  r.legs = r.legs || []; r.lang = r.lang || window.LANG || 'tr';
  return r;
}
const gmapsMulti = (stops, mode) => {
  const tm = (MODES.find(x => x[0] === mode) || MODES[0])[2], last = stops[stops.length - 1];
  const mids = (MEPOS ? stops.slice(0, -1) : stops.slice(1, -1)).map(p => `${p.lat},${p.lng}`).join('|');
  return `https://www.google.com/maps/dir/?api=1${MEPOS ? `&origin=${MEPOS.lat},${MEPOS.lng}` : ''}&destination=${last.lat},${last.lng}${mids ? `&waypoints=${encodeURIComponent(mids)}` : ''}&travelmode=${tm}`;
};
function drawPath(coords, fit) {
  const old = document.getElementById('routepath'); if (old) old.remove();
  if (!coords || coords.length < 2) { draw(); return; }
  const pts = coords.map(([lng, lat]) => proj(lng, lat));
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L');
  $('world').insertAdjacentHTML('beforeend', `<path id="routepath" d="${d}" fill="none" stroke="#1F6FEB" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
  if (fit) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), MAP.classList.contains('ml') ? 2048 : V.maxS, true); }
  else draw();
}

/* tek yere yol tarifi kutusu: navigasyon artık sitenin içinde */
routeHTML = function (p) {
  const R = ROUTE;
  const chips = MODES.map(([k, l, , ic]) => `<button type="button" class="chip" data-a="rmode" data-v="${k}" aria-pressed="${R.mode === k}"><span aria-hidden="true">${ic}</span> <span>${l}</span></button>`).join('');
  let body = '';
  if (R.state === 'loading') body = '<p class="note">Rota hesaplanıyor…</p>';
  else if (R.state === 'error') body = `<p class="note" style="color:var(--accent)">${esc(R.err)}</p>`;
  else if (R.state === 'nokey') body = '<p class="note">Uygulama içi yol tarifi çok yakında açılacak. Şimdilik Google Haritalar ile devam edebilirsin.</p>';
  else if (R.data) body = `<div class="rsum"><b>${durTxt(R.data.duration)}</b><span class="count">${fmtDist(R.data.distance)}</span></div>
    <details class="steps"><summary>Adım adım tarif</summary><ol>${R.data.steps.map(s => `<li>${esc(s.i)}${s.d ? `<span class="count"> · ${fmtDist(s.d)}</span>` : ''}</li>`).join('')}</ol><p class="note">© openrouteservice.org · © OpenStreetMap</p></details>`;
  const can = R.data && R.state === 'ok';
  return `<div class="box routebox" id="routebox"><div class="rhead"><b>Yol tarifi</b><button type="button" class="xb" data-a="rclose" aria-label="Kapat">${CLOSE_SVG}</button></div>
    <div class="chips wrapc">${chips}</div>${body}
    <button class="btn pri" style="margin-top:10px;width:100%" data-a="navgo" data-v="${p.id}" ${can ? '' : 'disabled'}><span aria-hidden="true">▶</span> <span>Navigasyonu başlat</span></button>
    <p class="note" style="margin-top:6px">Sesli yönlendirmeli canlı navigasyon sitenin içinde açılır.</p>
    <a class="btn" style="margin-top:8px;width:100%;box-sizing:border-box;height:40px;font-size:14px" href="${gmaps(p, R.mode)}" target="_blank" rel="noopener">Google Haritalar’da aç</a></div>`;
};

/* ===== canlı navigasyon ===== */
const NTUNE = { 'driving-car': { pre: 350, now: 70, off: 55, z: 16.4 }, 'cycling-regular': { pre: 150, now: 30, off: 35, z: 17 }, 'foot-walking': { pre: 60, now: 15, off: 30, z: 17.6 } };
let NAV = null;
document.body.insertAdjacentHTML('beforeend', `<div id="navui" hidden>
  <div class="nbanner" aria-live="polite"><div class="nrow"><span class="narrow" id="narrow">↑</span><div style="min-width:0;flex:1"><div class="ndist" id="ndist"></div><div class="ntxt" id="ntxt">Rota hesaplanıyor…</div></div></div><div class="nthen" id="nthen" hidden></div></div>
  <button class="nrecenter" id="nrecenter" data-a="navfollow" hidden><span aria-hidden="true">◎</span> <span>Ortala</span></button>
  <div class="npanel"><div style="flex:1;min-width:0"><div class="nbig" id="nbig">–</div><div class="nsmall" id="nsmall"></div></div>
    <button class="nicon" data-a="navmute" id="nmute" aria-label="Sesi kapat">🔊</button>
    <button class="nicon" data-a="navover" aria-label="Genel bakış">🗺</button>
    <button class="nend" data-a="navend">Bitir</button></div></div>`);
function navSay(text, lang) {
  if (!NAV || NAV.muted || !text || !window.speechSynthesis) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang || window.LANG || 'tr'; speechSynthesis.speak(u); } catch (_) { }
}
async function navStart(ids, mode) {
  const stops = ids.map(byId).filter(Boolean); if (!stops.length) return;
  if (!navigator.geolocation) { toast('Bu tarayıcı konum özelliğini desteklemiyor.'); return; }
  NAV = { stops, mode: NTUNE[mode] ? mode : 'driving-car', leg0: 0, lastLeg: 0, spoken: new Set(), off: 0, lastRe: 0, follow: true, muted: false, status: 'loading', sn: null };
  document.body.classList.add('navmode'); $('navui').hidden = false; navPaint();
  setTimeout(() => { if (ML.map) ML.map.resize(); render(); }, 60);
  if (ML.map && !ML.navHook) { ML.navHook = true; ML.map.on('dragstart', () => { if (NAV) { NAV.follow = false; navPaint(); } }); }
  try { if (navigator.wakeLock) NAV.lock = await navigator.wakeLock.request('screen'); } catch (_) { }
  NAV.watch = navigator.geolocation.watchPosition(p => navFix(p.coords), e => { if (NAV && !NAV.route) { NAV.status = 'error'; NAV.err = e && e.code === 1 ? 'Konum izni verilmedi. Tarayıcının site ayarlarından izin verebilirsin.' : 'Konumun bulunamadı. Cihazında konum servisinin açık olduğundan emin ol.'; navPaint(); } },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
async function navLoad(from, startLeg) {
  const rest = NAV.stops.slice(startLeg); if (!rest.length) return;
  try {
    const r = await fetchRoute(NAV.mode, [[from.lng, from.lat], ...rest.map(p => [p.lng, p.lat])]);
    if (!NAV) return;
    Object.assign(NAV, { route: r, track: prepTrack(r.geometry), leg0: startLeg, lastLeg: 0, spoken: new Set(), status: 'nav', sn: null });
    drawPath(r.geometry.coordinates, false);
    if (r.steps[0]) navSay(r.steps[0].i, r.lang);
    if (MEPOS) navFix({ latitude: MEPOS.lat, longitude: MEPOS.lng, accuracy: MEPOS.acc });
  } catch (e) { if (!NAV) return; NAV.status = NAV.route ? 'nav' : 'error'; NAV.err = ROUTE_ERR(e.code); }
  navPaint();
}
function navFix(c) {
  if (!NAV) return;
  const me = { lat: c.latitude, lng: c.longitude, acc: c.accuracy || 30 };
  MEPOS = me;
  if (!NAV.route) { if (!NAV.loading) { NAV.loading = true; navLoad(me, 0); } draw(); return; }
  if (NAV.status === 'arrived') { draw(); return; }
  const tr = NAV.track, r = NAV.route, tune = NTUNE[NAV.mode];
  const s = snapTo(tr, me.lat, me.lng, NAV.sn ? NAV.sn.idx : 0); NAV.sn = s;
  const last = NAV.stops[NAV.stops.length - 1];
  if (tr.total - s.along < 25 || meters(me.lat, me.lng, last.lat, last.lng) < 30) {
    NAV.status = 'arrived'; navSay(tx(`Hedefe ulaştın: ${last.n}`)); navPaint(); return;
  }
  if (s.off > tune.off && me.acc < 60) NAV.off++; else NAV.off = 0;
  if (NAV.off >= 2 && Date.now() - NAV.lastRe > 15000 && NAV.status === 'nav') {
    NAV.lastRe = Date.now(); NAV.off = 0; NAV.status = 'reroute'; navPaint();
    navSay(tx('Rota yeniden hesaplanıyor'));
    navLoad(me, NAV.leg0 + NAV.lastLeg); return;
  }
  const k = stepAt(r.steps, s.idx), st = r.steps[k], next = r.steps[k + 1];
  if (st && st.k > NAV.lastLeg) { const reached = NAV.stops[NAV.leg0 + st.k - 1]; NAV.lastLeg = st.k; if (reached) navSay(tx(`${reached.n} durağına ulaştın`)); }
  if (next) {
    const dist = tr.cum[Math.min(st.e, tr.cum.length - 1)] - s.along;
    if (dist <= tune.now && !NAV.spoken.has(k + 'n')) { NAV.spoken.add(k + 'n'); NAV.spoken.add(k + 'p'); navSay(next.i, r.lang); }
    else if (dist <= tune.pre && dist > tune.now * 1.6 && !NAV.spoken.has(k + 'p')) {
      NAV.spoken.add(k + 'p');
      navSay(r.lang === (window.LANG || 'tr') ? `${tx(`${fmtDist(dist)} sonra`)}, ${next.i}` : next.i, r.lang);
    }
  }
  drawPath([[s.lng, s.lat], ...tr.pts.slice(s.idx + 1)], false);
  if (NAV.follow) { const [x, y] = proj(s.off < 40 ? s.lng : me.lng, s.off < 40 ? s.lat : me.lat); flyTo(x, y, ML.on ? sOfZoom(tune.z) : V.maxS, true); }
  navPaint();
}
function navPaint() {
  if (!NAV) return;
  const r = NAV.route, tr = NAV.track, s = NAV.sn;
  $('nrecenter').hidden = NAV.follow || NAV.status === 'arrived';
  $('nmute').textContent = NAV.muted ? '🔇' : '🔊'; $('nmute').setAttribute('aria-label', NAV.muted ? 'Sesi aç' : 'Sesi kapat');
  $('nthen').hidden = true;
  if (NAV.status === 'loading' || !r && NAV.status !== 'error') { $('narrow').textContent = '…'; $('ndist').textContent = ''; $('ntxt').textContent = 'Rota hesaplanıyor…'; }
  else if (NAV.status === 'error') { $('narrow').textContent = '!'; $('ndist').textContent = ''; $('ntxt').textContent = NAV.err || 'Rota bulunamadı.'; }
  else if (NAV.status === 'arrived') {
    $('narrow').textContent = '⚑'; $('ndist').textContent = ''; $('ntxt').textContent = `Hedefe ulaştın: ${NAV.stops[NAV.stops.length - 1].n}`;
    $('nbig').textContent = 'Keyifli geziler!'; $('nsmall').textContent = ''; return;
  } else {
    const k = s ? stepAt(r.steps, s.idx) : 0, st = r.steps[k], next = r.steps[k + 1], after = r.steps[k + 2];
    const toTurn = s && st ? Math.max(0, tr.cum[Math.min(st.e, tr.cum.length - 1)] - s.along) : 0;
    const cur = next || st || {};
    $('narrow').textContent = ARROW[cur.y] || '↑';
    $('ndist').textContent = next ? fmtDist(toTurn) : fmtDist(s ? tr.total - s.along : r.distance);
    $('ntxt').textContent = NAV.status === 'reroute' ? 'Rota yeniden hesaplanıyor…' : (cur.i || '');
    if (after && NAV.status === 'nav') { $('nthen').hidden = false; $('nthen').textContent = `${tx('Sonra')}: ${ARROW[after.y] || ''} ${after.i}`; }
  }
  if (r) {
    const k = s ? stepAt(r.steps, s.idx) : 0, st = r.steps[k];
    let remT = r.duration, remD = r.distance;
    if (s && st) { remD = Math.max(0, tr.total - s.along); const toTurn = Math.max(0, tr.cum[Math.min(st.e, tr.cum.length - 1)] - s.along); remT = (st.d > 0 ? st.t * Math.min(1, toTurn / st.d) : 0) + r.steps.slice(k + 1).reduce((a, x) => a + x.t, 0); }
    const eta = new Date(Date.now() + remT * 1000);
    let et; try { et = eta.toLocaleTimeString(window.LANG || 'tr', { hour: '2-digit', minute: '2-digit' }); } catch (_) { et = `${eta.getHours()}:${String(eta.getMinutes()).padStart(2, '0')}`; }
    $('nbig').textContent = durTxt(remT);
    $('nsmall').innerHTML = `<span>${fmtDist(remD)}</span> · <span>Varış ${esc(et)}</span>`;
  }
}
function navEnd() {
  if (!NAV) return;
  try { navigator.geolocation.clearWatch(NAV.watch); } catch (_) { }
  try { NAV.lock && NAV.lock.release(); } catch (_) { }
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) { }
  NAV = null; $('navui').hidden = true; document.body.classList.remove('navmode');
  drawPath(null); setTimeout(() => { if (ML.map) ML.map.resize(); render(); }, 60);
}
function navOverview() {
  if (!NAV || !NAV.route) return;
  NAV.follow = false; navPaint();
  const pts = NAV.route.geometry.coordinates.map(([lng, lat]) => proj(lng, lat)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), MAP.classList.contains('ml') ? 2048 : V.maxS, true);
}

/* ===== gezi listem ===== */
let TRIP = ls.get('gezi-trip', []).filter(id => typeof id === 'string').slice(0, 24);
const tripSave = () => { ls.set('gezi-trip', TRIP); };
function tripToggle(id) {
  if (TRIP.includes(id)) { TRIP = TRIP.filter(x => x !== id); toast('Gezi listenden çıkarıldı'); }
  else if (TRIP.length >= 24) { toast('Gezi listen dolu (en fazla 24 yer).'); return; }
  else { TRIP.push(id); toast('Gezi listene eklendi'); }
  tripSave();
}
let TROUTE = null;

/* ===== ek panel görünümü: gezi listesi, şehir önerisi, şehir planı, moderatör paneli ===== */
$('pendv').insertAdjacentHTML('afterend', '<div id="xv" class="view" hidden><div class="vs" id="xbody"></div></div>');
let XV = null;
function showX(kind, arg, prev) {
  XV = { kind, arg, prev: prev || null };
  ['listv', 'detailv', 'profv', 'pendv', 'photov'].forEach(id => { $(id).hidden = true; });
  $('xv').hidden = false; S.sel = null; S.collapsed = false;
  renderX(); $('xbody').scrollTop = 0; setSheet(); draw();
}
function hideX() { if (!$('xv').hidden) { $('xv').hidden = true; XV = null; } }
const sv15 = showView; showView = function () { hideX(); sv15(); };
const sp15 = showProfile; showProfile = function (on) { if (on) hideX(); sp15(on); };
const spn15 = showPending; showPending = function (on) { if (on) hideX(); spn15(on); };
const sph15 = showPhotos; showPhotos = function (on) { if (on) hideX(); sph15(on); };
function renderX() {
  if (!XV) return;
  const back = `<button class="back" data-a="xback">${ICON.back}<span>${XV.prev ? 'Geri' : 'Tüm yerler'}</span></button>`;
  let h = '';
  if (XV.kind === 'trip') h = tripHTML();
  else if (XV.kind === 'rec') h = recHTML();
  else if (XV.kind === 'city') h = cityHTML();
  else if (XV.kind === 'mod') h = modHTML();
  $('xbody').innerHTML = back + h;
}

const LIST = () => (XV && XV.kind === 'trip' && Array.isArray(XV.arg)) ? XV.arg : TRIP;
let XV_city = null;
function tripHTML() {
  const temp = Array.isArray(XV.arg), items = LIST().map(byId).filter(Boolean);
  if (!items.length) return `<h1 class="xh">Gezi listem</h1><div class="box"><b>Gezi listen boş</b><p class="note">Yer kartlarındaki “Gezi listeme ekle” düğmesiyle gezmek istediğin yerleri buraya topla; uygulama hepsini tek rotada birleştirsin.</p>
    <button class="btn pri" style="margin-top:10px;width:100%" data-a="xrec">Nereye gitmeliyim?</button></div>`;
  const total = items.reduce((a, p, i) => a + (i ? meters(items[i - 1].lat, items[i - 1].lng, p.lat, p.lng) : 0), 0);
  const R = TROUTE;
  let rb = '';
  if (R) {
    const chips = MODES.map(([k, l, , ic]) => `<button type="button" class="chip" data-a="trmode" data-v="${k}" aria-pressed="${R.mode === k}"><span aria-hidden="true">${ic}</span> <span>${l}</span></button>`).join('');
    let body = R.state === 'loading' ? '<p class="note">Rota hesaplanıyor…</p>' : R.state === 'error' ? `<p class="note" style="color:var(--accent)">${esc(R.err)}</p>` : '';
    if (R.data) {
      const off = R.fromMe ? 0 : 1;
      body += `<div class="rsum"><b>${durTxt(R.data.duration)}</b><span class="count">${fmtDist(R.data.distance)}</span></div>
        <ol class="legs">${R.data.legs.map((l, i) => { const to = items[i + off]; return to ? `<li><span class="lnum">${i + off + 1}</span><b>${esc(to.n)}</b><span class="count">${fmtDist(l.d)} · ${durTxt(l.t)}</span></li>` : ''; }).join('')}</ol>`;
    }
    rb = `<div class="box routebox"><div class="rhead"><b>Rota</b><button type="button" class="xb" data-a="trclose" aria-label="Kapat">${CLOSE_SVG}</button></div><div class="chips wrapc">${chips}</div>${body}
      <button class="btn pri" style="margin-top:10px;width:100%" data-a="tnav" ${R.data && R.fromMe ? '' : 'disabled'}><span aria-hidden="true">▶</span> <span>Navigasyonu başlat</span></button>
      ${R.data && !R.fromMe ? '<p class="note">Navigasyon için konum izni gerekiyor.</p>' : ''}
      <a class="btn" style="margin-top:8px;width:100%;box-sizing:border-box;height:40px;font-size:14px" href="${gmapsMulti(items, R.mode)}" target="_blank" rel="noopener">Google Haritalar’da aç</a></div>`;
  }
  return `<h1 class="xh">${temp ? 'Gezi planı' : 'Gezi listem'}</h1><p class="count"><span>${items.length} durak</span> · <span>Kuş uçuşu toplam ${fmtDist(total)}</span></p>
    <ol class="trip">${items.map((p, i) => `<li><span class="lnum">${i + 1}</span><button class="tname" data-a="pick" data-v="${p.id}"><b>${esc(p.n)}</b><span class="count"><span>${esc(p.il)}</span> · <span>${CATS[p.c] || ''}</span>${i ? ` · <span>${fmtDist(meters(items[i - 1].lat, items[i - 1].lng, p.lat, p.lng))}</span>` : ''}</span></button>
      ${temp ? '' : `<button class="ib" data-a="tup" data-v="${p.id}" aria-label="Yukarı taşı" ${i ? '' : 'disabled'}>↑</button><button class="ib" data-a="tdown" data-v="${p.id}" aria-label="Aşağı taşı" ${i < items.length - 1 ? '' : 'disabled'}>↓</button><button class="ib" data-a="trm" data-v="${p.id}" aria-label="Listeden çıkar">✕</button>`}</li>`).join('')}</ol>
    <div class="acts">${!temp && items.length > 2 ? '<button class="btn" data-a="topt">⇅ <span>Sırayı en kısa yap</span></button>' : ''}${temp ? '<button class="btn" data-a="taddall">＋ <span>Gezi listeme ekle</span></button>' : ''}<button class="btn pri" data-a="troute">🧭 <span>Rotayı göster</span></button></div>
    ${rb}
    <p class="note">Rota konumundan başlar ve durakları bu sırayla dolaşır.</p>
    ${temp ? '' : '<button class="btn" style="width:100%;margin-top:8px" data-a="tclear">Listeyi temizle</button>'}`;
}
async function tripRoute(mode) {
  const items = LIST().map(byId).filter(Boolean); if (!items.length) return;
  if (mode === 'transit') { window.open(gmapsMulti(items, 'transit'), '_blank', 'noopener'); return; }
  TROUTE = { mode: mode || (TROUTE && TROUTE.mode) || 'driving-car', state: 'loading', data: null }; renderX();
  try { if (!MEPOS) await locate(); } catch (_) { }
  const fromMe = !!MEPOS && meters(MEPOS.lat, MEPOS.lng, items[0].lat, items[0].lng) < 1500000;
  const coords = [...(fromMe ? [[MEPOS.lng, MEPOS.lat]] : []), ...items.map(p => [p.lng, p.lat])];
  if (coords.length < 2) { TROUTE.state = 'error'; TROUTE.err = 'Rota için en az iki nokta gerekiyor. Konum iznini aç ya da listeye bir yer daha ekle.'; renderX(); return; }
  const want = TROUTE.mode;
  try { const r = await fetchRoute(want, coords); if (!TROUTE || TROUTE.mode !== want) return; Object.assign(TROUTE, { state: 'ok', data: r, fromMe }); drawPath(r.geometry.coordinates, true); }
  catch (e) { if (TROUTE) { TROUTE.state = 'error'; TROUTE.err = ROUTE_ERR(e.code); } }
  renderX();
}

/* ===== nereye gitmeliyim? ===== */
const LMSET = new Set(Object.keys(MKI.lm));
function pweight(p) {
  const s = stats(p); let w = 0.6 + 0.2 * (p.t || 3);
  if (s.count > 0) w += (s.rating - 3) * 0.3;
  w += Math.log10(1 + (s.visits || 0)) * 0.4;
  if (LMSET.has(p.id)) w += 0.8;
  return w;
}
const ilCenter = il => { const l = GEO.labels.find(x => x[0] === il); return l ? (([la, ln]) => ({ lat: la, lng: ln }))(toLatLng(l[1], l[2])) : null; };
function rankCities(subs, near) {
  if (!subs.length) return [];
  const want = new Set(subs), by = {};
  PLACES.forEach(p => { if (want.has(p.c)) (by[p.il] = by[p.il] || []).push(p); });
  return Object.entries(by).map(([il, ms]) => {
    const ws = new Map(ms.map(p => [p.id, pweight(p)]));
    let score = [...ws.values()].reduce((a, b) => a + b, 0) + 0.6 * (new Set(ms.map(p => p.c)).size - 1);
    const c = near && ilCenter(il), km = c ? meters(near.lat, near.lng, c.lat, c.lng) / 1000 : null;
    if (km != null) score /= 1 + km / 250;
    const rated = ms.map(stats).filter(s => s.count > 0);
    return { il, score, km, avg: rated.length ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : 0, matches: ms.slice().sort((a, b) => ws.get(b.id) - ws.get(a.id)) };
  }).sort((a, b) => b.score - a.score);
}
function planCity(il, subs, days) {
  const want = new Set(subs), inIl = PLACES.filter(p => p.il === il);
  const byW = xs => xs.map(p => [p, pweight(p)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const pick = [...byW(inIl.filter(p => want.has(p.c))), ...byW(inIl.filter(p => !want.has(p.c)))].slice(0, Math.min(inIl.length, 4 * days));
  const start = MEPOS && pick[0] && meters(MEPOS.lat, MEPOS.lng, pick[0].lat, pick[0].lng) < 150000 ? MEPOS : null;
  const ord = nearestOrder(pick, start), d = Math.max(1, Math.min(days, Math.ceil(ord.length / 2))), per = Math.ceil(ord.length / d), out = [];
  for (let i = 0; i < d; i++) out.push(ord.slice(i * per, (i + 1) * per));
  return { days: out.filter(x => x.length), total: inIl.length };
}
const REC = { subs: [], near: false, days: 2, day: 0 };
function recHTML() {
  const groups = Object.entries(GROUPS).map(([g, gl]) => `<div class="row-label">${gl}</div><div class="chips wrapc">${Object.entries(SUBS).filter(([, v]) => v[0] === g).map(([k]) =>
    `<button type="button" class="chip ichip" data-a="rsub" data-v="${k}" aria-pressed="${REC.subs.includes(k)}">${catMarker(MKI.glyphs[k], MKI.colors[g], 22)}<span>${CATS[k]}</span></button>`).join('')}</div>`).join('');
  const rows = rankCities(REC.subs, REC.near && MEPOS ? MEPOS : null).slice(0, 10);
  const list = !REC.subs.length ? '<p class="note">Önce yukarıdan en az bir tür seç</p>' : !rows.length ? '<p class="note">Bu türde yer bulunamadı.</p>'
    : rows.map((r, i) => `<button class="card city" data-a="rcity" data-v="${esc(r.il)}"><span class="lnum${i ? '' : ' top'}">${i + 1}</span><span style="flex:1;min-width:0"><b class="cn">${esc(r.il)}</b>
      <span class="count"><span>${r.matches.length} uygun yer</span>${r.avg ? ` · ★ ${rt(r.avg)}` : ''}${r.km != null ? ` · <span>${fmt(Math.round(r.km))} km uzakta</span>` : ''}</span>
      <span class="cm">${esc(r.matches.slice(0, 4).map(p => p.n).join(', '))}${r.matches.length > 4 ? ` <span>ve ${r.matches.length - 4} yer daha</span>` : ''}</span></span><span aria-hidden="true" class="count">›</span></button>`).join('');
  return `<h1 class="xh">Nereye gitmeliyim?</h1><p class="note" style="margin-top:0"><b>Ne gezmek istiyorsun?</b> <span>Birden fazla seçebilirsin. Seçtiğin türde en çok ve en iyi yere sahip şehirleri sıralarız.</span></p>
    ${groups}
    <label class="lrow box"><span><b>📍 <span>Konumuma yakın olsun</span></b><br><span class="count">Yakındaki şehirler öne çıkar.</span></span><input type="checkbox" data-a="rnear" ${REC.near ? 'checked' : ''}></label>
    <h2 class="xh2">Sana önerdiğimiz şehirler</h2>${list}`;
}
function cityHTML() {
  const il = XV.arg, plan = planCity(il, REC.subs, REC.days), cur = plan.days[Math.min(REC.day, plan.days.length - 1)] || [];
  const all = PLACES.filter(p => p.il === il).sort((a, b) => (REC.subs.includes(b.c) ? 1 : 0) - (REC.subs.includes(a.c) ? 1 : 0));
  return `<h1 class="xh">${esc(il)}</h1><p class="count">${REC.subs.map(k => `<span>${CATS[k]}</span>`).join(' · ')}</p>
    <h2 class="xh2">Gezi planı</h2>
    <div class="chips wrapc">${[1, 2, 3].map(n => `<button class="chip" data-a="rdays" data-v="${n}" aria-pressed="${REC.days === n}">${n} gün</button>`).join('')}</div>
    ${plan.days.length < REC.days ? `<p class="note">Bu ilde şimdilik ${plan.total} yer var; plan buna göre kısaltıldı.</p>` : ''}
    ${plan.days.length > 1 ? `<div class="tabs" role="tablist">${plan.days.map((_, i) => `<button class="tab" role="tab" data-a="rday" data-v="${i}" aria-selected="${REC.day === i}">${i + 1}. gün</button>`).join('')}</div>` : ''}
    <ol class="plan">${cur.map((p, i) => `<li><span class="lnum">${i + 1}</span><button class="tname" data-a="pick" data-v="${p.id}"><b>${esc(p.n)}</b><span class="count"><span>${CATS[p.c] || ''}</span>${i ? ` · <span>önceki duraktan ~${fmt(Math.max(1, Math.round(meters(cur[i - 1].lat, cur[i - 1].lng, p.lat, p.lng) / 1000)))} km</span>` : ''}</span></button></li>`).join('')}</ol>
    ${cur.length ? `<div class="acts"><button class="btn" data-a="raddtrip">＋ <span>Gezi listeme ekle</span></button><button class="btn pri" data-a="rroute">🧭 <span>Rotayı göster</span></button></div>` : ''}
    <p class="note">Plan, yerleri birbirine en yakın sırayla dizer. Açılış saatlerini gitmeden önce kontrol et.</p>
    <h2 class="xh2">${esc(il)} içindeki tüm yerler (${all.length})</h2>
    <ol class="rows">${all.slice(0, 40).map(p => `<li><button class="row" data-a="pick" data-v="${p.id}"><span class="rb"><span class="rn">${esc(p.n)}</span><span class="rm">${CATS[p.c] || ''}</span></span></button></li>`).join('')}</ol>`;
}
const curPlan = () => { const plan = planCity(XV.arg, REC.subs, REC.days); return plan.days[Math.min(REC.day, plan.days.length - 1)] || []; };

/* ===== hava durumu ===== */
const WX = {};
const wmo = c => c === 0 ? ['☀️', 'Açık'] : c <= 2 ? ['⛅', 'Parçalı bulutlu'] : c === 3 ? ['☁️', 'Bulutlu'] : (c === 45 || c === 48) ? ['🌫️', 'Sisli'] : (c >= 51 && c <= 57) ? ['🌦️', 'Çisenti']
  : ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) ? ['🌧️', 'Yağmurlu'] : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? ['🌨️', 'Karlı'] : c >= 95 ? ['⛈️', 'Gök gürültülü fırtına'] : ['🌤️', 'Parçalı bulutlu'];
async function getWeather(p) {
  const k = p.lat.toFixed(2) + ',' + p.lng.toFixed(2), hit = WX[k];
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.w;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(4)}&longitude=${p.lng.toFixed(4)}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`);
  if (!r.ok) throw new Error('weather');
  const j = await r.json();
  const w = { now: { t: j.current.temperature_2m, c: j.current.weather_code }, days: j.daily.time.map((d, i) => ({ d, c: j.daily.weather_code[i], hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], p: j.daily.precipitation_probability_max ? j.daily.precipitation_probability_max[i] : null })) };
  WX[k] = { at: Date.now(), w }; return w;
}
function wxHTML(w) {
  const day = (d, i) => { if (!i) return '<span>Bugün</span>'; try { return esc(new Date(d + 'T12:00:00').toLocaleDateString(window.LANG || 'tr', { weekday: 'short' })); } catch (_) { return d.slice(5); } };
  return `<b>Hava durumu</b><div class="wxnow"><span class="wxi" aria-hidden="true">${wmo(w.now.c)[0]}</span><span><span class="wxt">${fmt(Math.round(w.now.t))}°</span><br><span class="count">${wmo(w.now.c)[1]}</span></span></div>
    <div class="wxdays">${w.days.map((d, i) => `<div class="wxd" aria-label="${esc(wmo(d.c)[1])}, ${fmt(Math.round(d.hi))}° / ${fmt(Math.round(d.lo))}°"><span class="count">${day(d.d, i)}</span><span class="wxi" aria-hidden="true">${wmo(d.c)[0]}</span><b>${fmt(Math.round(d.hi))}°</b> <span class="count">${fmt(Math.round(d.lo))}°</span>${d.p != null && d.p >= 20 ? `<span class="wxp">💧 %${fmt(d.p)}</span>` : ''}</div>`).join('')}</div>
    <p class="note" style="margin-top:6px">Kaynak: Open-Meteo</p>`;
}

/* ===== yer kartı: gezi listesi, paylaş, hava durumu ===== */
const rd15 = renderDetail;
renderDetail = function () {
  rd15();
  const p = byId(S.sel); if (!p) return;
  const acts = $('detail').querySelectorAll('.acts'), lastActs = acts[1] || acts[0];
  const inT = TRIP.includes(p.id);
  if (lastActs) lastActs.insertAdjacentHTML('afterend', `<div class="acts"><button class="btn" data-a="tripadd" data-v="${p.id}" aria-pressed="${inT}">${inT ? '✓ <span>Gezi listende</span>' : '＋ <span>Gezi listeme ekle</span>'}</button><button class="btn" data-a="share" data-v="${p.id}">↗ <span>Yeri paylaş</span></button></div>`);
  if (S.tab === 'ov') {
    const tabs = $('detail').querySelector('.tabs');
    const box = document.createElement('div'); box.className = 'box wx'; box.id = 'wxbox'; box.innerHTML = '<b>Hava durumu</b><p class="note">Yükleniyor…</p>';
    if (tabs) $('detail').appendChild(box);
    const id = p.id;
    getWeather(p).then(w => { const b = $('wxbox'); if (b && S.sel === id) b.innerHTML = wxHTML(w); }).catch(() => { const b = $('wxbox'); if (b) b.innerHTML = '<b>Hava durumu</b><p class="note">Hava durumu şu an alınamadı.</p>'; });
  }
};

/* ===== paylaş ve bağlantıyla yer açma ===== */
const placeLink = id => `${location.origin}${location.pathname}?yer=${encodeURIComponent(id)}`;
async function sharePlace(id) {
  const p = byId(id); if (!p) return;
  const url = placeLink(id);
  try { if (navigator.share) { await navigator.share({ title: p.n, text: `${p.n} (${p.il}) · ${tx('Türkiye Gezi Rehberi')}`, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Bağlantı kopyalandı'); } catch (_) { window.prompt(tx('Bağlantıyı kopyala'), url); }
}
(function openFromLink() {
  let id = null; try { id = new URLSearchParams(location.search).get('yer'); } catch (_) { }
  if (!id) return;
  let n = 0;
  const go = () => { if (byId(id)) { select(id); try { history.replaceState(null, '', location.pathname); } catch (_) { } } else if (n++ < 20) setTimeout(go, 500); };
  setTimeout(go, 400);
})();

/* ===== rozetler ===== */
const BADGES = [
  ['ilk', '👣', 'İlk Adım', 'İlk yerini “Gittim” olarak işaretle', 1, c => c.v.length], ['gezgin', '🎒', 'Gezgin Ruhu', '10 yer gez', 10, c => c.v.length],
  ['usta', '🧭', 'Usta Gezgin', '50 yer gez', 50, c => c.v.length], ['efsane', '🏆', 'Efsane Gezgin', '100 yer gez', 100, c => c.v.length],
  ['unlu', '⭐', 'Ünlüler Durağı', 'Özel işaretli 5 ünlü yeri gez', 5, c => c.v.filter(p => LMSET.has(p.id)).length],
  ['antik', '🏛', 'Antik Gezgin', '5 antik kent ve ören yeri gez', 5, c => c.v.filter(p => p.c === 'antik').length],
  ['kale', '🏰', 'Kale Avcısı', '5 kale gez', 5, c => c.v.filter(p => p.c === 'kale').length],
  ['inanc', '🕌', 'İnanç Yolcusu', '5 cami, kilise veya manastır gez', 5, c => c.v.filter(p => p.c === 'cami' || p.c === 'kilise').length],
  ['selale', '💧', 'Şelale Avcısı', '3 şelale gez', 3, c => c.v.filter(p => p.c === 'selale').length],
  ['deniz', '🏖', 'Deniz Tutkunu', '5 plaj, ada veya sahil kasabası gez', 5, c => c.v.filter(p => ['plaj', 'ada', 'sahil'].includes(p.c)).length],
  ['doga', '🌲', 'Doğa Kâşifi', '10 doğa harikası gez', 10, c => c.v.filter(p => p.g === 'doga').length],
  ['marmara', '🌉', 'Marmara Kâşifi', 'Marmara’da 10 yer gez', 10, c => c.v.filter(p => p.r === 0).length],
  ['ege', '🫒', 'Ege Kâşifi', 'Ege’de 10 yer gez', 10, c => c.v.filter(p => p.r === 1).length],
  ['akdeniz', '🍊', 'Akdeniz Kâşifi', 'Akdeniz’de 10 yer gez', 10, c => c.v.filter(p => p.r === 2).length],
  ['icanadolu', '🌾', 'İç Anadolu Kâşifi', 'İç Anadolu’da 10 yer gez', 10, c => c.v.filter(p => p.r === 3).length],
  ['karadeniz', '🌿', 'Karadeniz Kâşifi', 'Karadeniz’de 10 yer gez', 10, c => c.v.filter(p => p.r === 4).length],
  ['dogu', '🏔', 'Doğu Anadolu Kâşifi', 'Doğu Anadolu’da 10 yer gez', 10, c => c.v.filter(p => p.r === 5).length],
  ['guneydogu', '🏺', 'Güneydoğu Kâşifi', 'Güneydoğu Anadolu’da 10 yer gez', 10, c => c.v.filter(p => p.r === 6).length],
  ['il10', '🗺', '10 İl Gezgini', '10 farklı ilde yer gez', 10, c => new Set(c.v.map(p => p.il)).size],
  ['tur', '🎯', 'Türkiye Turu', 'Haritada yeri olan her ilde en az bir yer gez', () => new Set(PLACES.map(p => p.il)).size, c => new Set(c.v.map(p => p.il)).size],
  ['yorum', '✍️', 'Yorumcu', '10 yorum yaz', 10, c => c.r], ['foto', '📸', 'Fotoğrafçı', '10 fotoğraf paylaş', 10, c => c.ph],
];
function badgeRows() {
  const mine = S.posts.filter(x => !x.sample && isMine(x));
  const c = { v: [...S.visited].map(byId).filter(Boolean), r: mine.length, ph: mine.filter(x => x.media).length };
  return BADGES.map(([id, icon, name, desc, need, f]) => { const n = typeof need === 'function' ? need() : need, k = f(c); return { id, icon, name, desc, n, k, ok: k >= n }; });
}
function checkBadges() {
  if (!CUR) return;
  const key = 'gezi-badges-' + (ME ? ME.id : CUR.email), now = badgeRows().filter(b => b.ok).map(b => b.id), prev = ls.get(key, null);
  if (prev) { const fresh = now.filter(x => !prev.includes(x)); if (fresh.length) { const b = badgeRows().find(x => x.id === fresh[0]); toast(`Yeni rozet kazandın: ${b.icon} ${tx(b.name)}`); } }
  ls.set(key, now);
}
const rp15 = renderProfile;
renderProfile = function () {
  rp15();
  if (!CUR) return;
  const rows = badgeRows(), got = rows.filter(r => r.ok).length;
  const lvl = $('prof').querySelector('.box');
  const html = `<div class="box"><b><span>Rozetler</span> · ${got}/${rows.length}</b><div class="badges">${rows.map(r => `<div class="bdg${r.ok ? ' ok' : ''}" title="${esc(r.desc)}"><span class="bi" aria-hidden="true">${r.icon}</span><b>${esc(r.name)}</b><span class="bd">${esc(r.desc)}</span>${r.ok ? '<span class="bk">✓ <span>Kazanıldı</span></span>' : `<span class="bp" aria-hidden="true"><i style="width:${Math.round(100 * r.k / r.n)}%"></i></span><span class="bk">${fmt(r.k)}/${fmt(r.n)}</span>`}</div>`).join('')}</div></div>`;
  if (lvl) lvl.insertAdjacentHTML('afterend', html);
  const lo = $('prof').querySelector('[data-a="logout"]'), acts = lo && lo.closest('.acts');
  if (acts) acts.insertAdjacentHTML('beforebegin', `<div class="setl">
    <button class="row" data-a="mtrip"><span class="rb"><span class="rn">🧳 <span>Gezi listem</span></span></span><span aria-hidden="true">›</span></button>
    <button class="row" data-a="mfeedback"><span class="rb"><span class="rn">💬 <span>Görüş ve öneri gönder</span></span></span><span aria-hidden="true">›</span></button>
    <button class="row" data-a="mprivacy"><span class="rb"><span class="rn">🔒 <span>Gizlilik ve KVKK</span></span></span><span aria-hidden="true">›</span></button>
    ${CUR.mod ? '<button class="row" data-a="mmod"><span class="rb"><span class="rn">🛡 <span>Moderatör paneli</span></span></span><span aria-hidden="true">›</span></button>' : ''}</div>`);
};
const ra15 = refreshAll; refreshAll = function () { ra15(); try { checkBadges(); } catch (_) { } };

/* ===== diyaloglar: geri bildirim, şikâyet, gizlilik ===== */
const PRIVACY = [
  ['Hangi bilgileri topluyoruz?', 'Hesap açarken verdiğin ad ve e-posta adresi; isteğe bağlı profil fotoğrafın; yazdığın yorumlar, yüklediğin fotoğraflar, yer önerilerin, gittiğin ve favorilediğin yerler, gönderdiğin geri bildirimler ve şikâyetler.'],
  ['Konum', 'Konumun yalnızca cihazında kullanılır: yakındaki yerleri sıralamak, uzaklıkları göstermek ve yol tarifi için. Konum geçmişin kaydedilmez. Yol tarifi istediğinde başlangıç ve varış noktaları yalnızca rotayı hesaplamak için OpenRouteService’e gönderilir.'],
  ['Ne için kullanıyoruz?', 'Bu bilgiler yalnızca uygulamanın çalışması için kullanılır: hesabını tanımak, paylaşımlarını diğer gezginlere göstermek ve uygulamayı geliştirmek. Reklam göstermiyoruz ve verilerini kimseye satmıyoruz.'],
  ['Anonim kullanım sayıları ve hata kayıtları', 'Uygulamayı geliştirmek için hangi ekranların ve özelliklerin kaç kez kullanıldığını yalnızca günlük toplam sayılar olarak tutuyoruz; bu sayılar kim olduğunu içermez. Uygulama çökerse hata mesajı, sürüm ve platform kaydedilir. Bir yer hakkında gönderdiğin düzeltme önerilerini yalnızca sen ve moderatörler görebilir.'],
  ['Kimler görebilir?', 'Adın, profil fotoğrafın, yorumların ve fotoğrafların herkese açıktır. E-posta adresin, gittiğin ve favorilediğin yerler yalnızca sana görünür. Geri bildirimlerini ve şikâyetlerini yalnızca sen ve moderatörler görebilir.'],
  ['Telefon bildirimleri', 'Telefonuna bildirim almayı kabul edersen, bildirim gönderebilmek için Firebase’in cihazına verdiği bildirim kimliği hesabınla birlikte saklanır. Çıkış yaptığında bu kimlik silinir. Bildirimleri istediğin zaman telefonunun ayarlarından kapatabilirsin.'],
  ['Gezi günlüğü ve erişilebilirlik bilgisi', 'Gezi günlüklerin yalnızca sana görünür; “Bağlantıyla paylaş”ı açarsan bağlantıyı bilen herkes görebilir. Bir yerin erişilebilirliği için yaptığın işaretleme, kimin yaptığı gösterilmeden toplam sayı olarak paylaşılır. Yeni hesapların ilk fotoğrafları yayınlanmadan önce bir moderatör tarafından kontrol edilir.'],
  ['Nerede saklanıyor?', 'Veriler Supabase altyapısında saklanır ve şifreli bağlantıyla taşınır. Harita OpenFreeMap’ten, hava durumu Open-Meteo’dan alınır; bu servislere adın veya e-posta adresin gönderilmez.'],
  ['Hakların (KVKK)', '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında verilerine erişme, düzeltilmesini ve silinmesini isteme hakkın var. Hesabını Profil sayfasındaki “Hesabı sil” düğmesiyle istediğin an kalıcı olarak silebilirsin; yorumların, fotoğrafların ve tüm kayıtların birlikte silinir.'],
  ['İletişim', 'Soruların ve taleplerin için uygulamadaki “Görüş ve öneri gönder” bölümünden bize yazabilirsin.'],
];
document.body.insertAdjacentHTML('beforeend', `
<dialog id="privdlg" aria-labelledby="privt"><div class="dlg"><div class="dh"><h2 id="privt" style="font-size:20px">Gizlilik ve KVKK</h2><button type="button" class="xb" data-a="dclose" data-v="privdlg" aria-label="Kapat">${CLOSE_SVG}</button></div>
  <p>Türkiye Gezi Rehberi’ni kullanırken bilgilerinin nasıl işlendiğini burada sade bir dille anlatıyoruz.</p>
  ${PRIVACY.map(([h, t]) => `<h3 class="ph3">${h}</h3><p>${t}</p>`).join('')}<p class="note" id="privdate"></p></div></dialog>
<dialog id="fbdlg" aria-labelledby="fbt"><div class="dlg"><div class="dh"><h2 id="fbt" style="font-size:20px">Görüş ve öneri gönder</h2><button type="button" class="xb" data-a="dclose" data-v="fbdlg" aria-label="Kapat">${CLOSE_SVG}</button></div>
  <p style="margin-top:0">Uygulamayı birlikte geliştiriyoruz. Aklına gelen her öneriyi, karşılaştığın hataları ve görüşlerini yaz; hepsini okuyoruz.</p>
  <div class="row-label">Konu</div><div class="chips wrapc" id="fbkinds"></div>
  <div class="row-label">Uygulamadan ne kadar memnunsun? (isteğe bağlı)</div><div class="fbstars" id="fbstars"></div>
  <label class="row-label" for="fbtext">Mesajın</label><textarea class="in" id="fbtext" rows="6" maxlength="2000" style="height:auto;padding:10px 12px;resize:vertical"></textarea>
  <button class="btn pri" style="width:100%;margin-top:10px" data-a="fbsend" id="fbgo">Gönder</button>
  <p class="note">Mesajınla birlikte yalnızca hesabın ve uygulama sürümü kaydedilir.</p><div id="fbmine"></div></div></dialog>
<dialog id="rpdlg" aria-labelledby="rpt"><div class="dlg"><div class="dh"><h2 id="rpt" style="font-size:19px">Şikâyet et</h2><button type="button" class="xb" data-a="dclose" data-v="rpdlg" aria-label="Kapat">${CLOSE_SVG}</button></div><div id="rpbody"></div></div></dialog>`);
$('acctmenu').querySelector('[data-a="msupport"]').insertAdjacentHTML('beforebegin', `
  <button role="menuitem" data-a="mtrip"><span class="emi" aria-hidden="true">🧳</span><span>Gezi listem</span></button>
  <button role="menuitem" data-a="mrec"><span class="emi" aria-hidden="true">🧭</span><span>Nereye gitmeliyim?</span></button>
  <button role="menuitem" data-a="mfeedback"><span class="emi" aria-hidden="true">💬</span><span>Görüş ve öneri gönder</span></button>
  <button role="menuitem" data-a="mmod" id="mmodbtn" hidden><span class="emi" aria-hidden="true">🛡</span><span>Moderatör paneli</span></button>
  <button role="menuitem" data-a="mprivacy"><span class="emi" aria-hidden="true">🔒</span><span>Gizlilik ve KVKK</span></button>`);
const tm15 = toggleMenu; toggleMenu = function (open) { const b = $('mmodbtn'); if (b) b.hidden = !(CUR && CUR.mod); return tm15(open); };
$('aform').insertAdjacentHTML('beforeend', '<p class="note" style="text-align:center"><span>Devam ederek gizlilik politikasını kabul etmiş olursun.</span> <button type="button" class="linkbtn" data-a="mprivacy">Gizlilik ve KVKK</button></p>');
$('pendbtn').parentElement.insertAdjacentHTML('beforebegin', `<div class="acts xcards"><button class="btn xrec" data-a="xrec">🧭 <span>Nereye gitmeliyim?</span></button><button class="btn" data-a="mtrip">🧳 <span>Gezi listem</span></button></div>`);

const FBK = [['oneri', '💡', 'Öneri'], ['hata', '🐞', 'Hata bildirimi'], ['gorus', '💬', 'Görüş']];
const FB = { kind: 'oneri', rating: 0 };
function renderFb() {
  $('fbkinds').innerHTML = FBK.map(([k, i, l]) => `<button type="button" class="chip" data-a="fbkind" data-v="${k}" aria-pressed="${FB.kind === k}"><span aria-hidden="true">${i}</span> <span>${l}</span></button>`).join('');
  $('fbstars').innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" data-a="fbstar" data-v="${n}" aria-pressed="${FB.rating >= n}" aria-label="5 üzerinden ${n} puan">★</button>`).join('');
  $('fbtext').placeholder = FB.kind === 'hata' ? 'Ne oldu? Hangi ekranda, ne yaparken? Mümkünse adım adım yaz.' : 'Aklındakini yaz…';
}
async function loadMyFb() {
  if (!ONLINE() || !ME) { $('fbmine').innerHTML = ''; return; }
  const { data } = await sb.from('feedback').select('*').eq('user_id', ME.id).order('created_at', { ascending: false }).limit(20);
  $('fbmine').innerHTML = data && data.length ? `<h3 class="ph3">Gönderdiklerim</h3>${data.map(f => `<div class="card"><div class="lvl"><b>${(FBK.find(x => x[0] === f.kind) || [, '', ''])[1]} <span>${(FBK.find(x => x[0] === f.kind) || [, , ''])[2]}</span></b><span class="count">${f.handled ? '✓ <span>Okundu</span>' : '<span>İletildi</span>'}</span></div><p style="margin:6px 0 0" translate="no">${esc(f.body)}</p><span class="count">${esc(agoText(f.created_at))}</span></div>`).join('')}` : '';
}

/* şikâyet */
const REASONS = [['spam', 'Spam veya reklam'], ['hakaret', 'Hakaret veya nefret söylemi'], ['uygunsuz', 'Uygunsuz içerik'], ['yanlis', 'Yanlış veya yanıltıcı bilgi'], ['diger', 'Diğer']];
const RPT = { type: null, id: null, choices: null };
const RT_TITLE = { review: 'Yorumu şikâyet et', photo: 'Fotoğrafı şikâyet et', reply: 'Yanıtı şikâyet et' };
function renderRp() {
  if (!RPT.type) {
    $('rpt').textContent = 'Neyi şikâyet etmek istiyorsun?';
    $('rpbody').innerHTML = RPT.choices.map(c => `<button class="row" data-a="rptype" data-v="${c}"><span class="rb"><span class="rn">${RT_TITLE[c]}</span></span><span aria-hidden="true">›</span></button>`).join('');
  } else {
    $('rpt').textContent = RT_TITLE[RPT.type];
    $('rpbody').innerHTML = `<p class="note" style="margin-top:0">Şikâyetler gizli tutulur. Üç farklı kişi şikâyet ederse içerik otomatik gizlenir ve moderatör inceler.</p>${REASONS.map(([k, l]) => `<button class="row" data-a="rpsend" data-v="${k}"><span class="rb"><span class="rn">${l}</span></span></button>`).join('')}`;
  }
}

/* moderatör paneli */
const MOD = { tab: 'fb', fbs: null, names: {}, reps: null };
const RTXT = Object.assign(Object.fromEntries(REASONS), { onay: 'Yeni kullanıcı fotoğrafı, onay bekliyor' });
async function loadMod() {
  if (!ONLINE()) { MOD.fbs = []; MOD.reps = []; renderX(); return; }
  const { data } = await sb.from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
  MOD.fbs = data || [];
  const ids = [...new Set(MOD.fbs.map(f => f.user_id))];
  if (ids.length) { const { data: ps } = await sb.from('profiles').select('id,name').in('id', ids); MOD.names = Object.fromEntries((ps || []).map(p => [p.id, p.name])); }
  const r = await sb.rpc('mod_reports'); MOD.reps = r.data || [];
  if (XV && XV.kind === 'mod') renderX();
}
function modHTML() {
  if (!CUR || !CUR.mod) return '<p class="note">Bu bölüm yalnızca moderatörler içindir.</p>';
  const open = (MOD.fbs || []).filter(f => !f.handled).length;
  const tabs = `<div class="tabs" role="tablist"><button class="tab" role="tab" data-a="modtab" data-v="fb" aria-selected="${MOD.tab === 'fb'}"><span>Geri bildirimler</span> (${open})</button><button class="tab" role="tab" data-a="modtab" data-v="rep" aria-selected="${MOD.tab === 'rep'}"><span>Şikâyetler</span> (${(MOD.reps || []).length})</button></div>`;
  let body;
  if (MOD.tab === 'fb') body = MOD.fbs == null ? '<p class="note">Yükleniyor…</p>' : !MOD.fbs.length ? '<p class="note">Henüz geri bildirim yok</p>' : MOD.fbs.map(f => `<div class="card${f.handled ? ' dim' : ''}">
      <div class="lvl"><b>${(FBK.find(x => x[0] === f.kind) || [, ''])[1]} <span>${(FBK.find(x => x[0] === f.kind) || [, , ''])[2]}</span> · ${esc(MOD.names[f.user_id] || '?')}</b>${f.rating ? `<span style="color:var(--star)">${'★'.repeat(f.rating)}</span>` : ''}</div>
      <p style="margin:6px 0 0;white-space:pre-wrap" translate="no">${esc(f.body)}</p><span class="count">${esc([agoText(f.created_at), f.platform, f.version].filter(Boolean).join(' · '))}</span>
      <div class="acts"><button class="btn" data-a="fbhandled" data-v="${f.id}">${f.handled ? 'Okunmadı yap' : '✓ <span>Okundu olarak işaretle</span>'}</button></div></div>`).join('');
  else body = MOD.reps == null ? '<p class="note">Yükleniyor…</p>' : !MOD.reps.length ? '<p class="note">Şikâyet edilen içerik yok</p>' : MOD.reps.map(r => `<div class="card">
      <b><span>${{ review: 'Yorum', reply: 'Yanıt', photo: 'Fotoğraf' }[r.target_type]}</span> · <span translate="no">${esc(r.author || '?')}</span>${r.place_id && byId(r.place_id) ? ` · ${esc(byId(r.place_id).n)}` : ''}</b>
      <div class="count" style="${r.hidden ? 'color:var(--accent)' : ''}">${r.reports ? `<span>${r.reports} şikâyet</span> · ` : ''}${r.reasons.map(x => `<span>${RTXT[x] || esc(x)}</span>`).join(', ')}${r.hidden && r.reports ? ' · <span>Gizlendi</span>' : ''}</div>
      ${r.target_type === 'photo' && r.photo_path ? `<img src="${esc(pubUrl(r.photo_path))}" alt="" style="width:100%;border-radius:12px;margin-top:8px">` : `<p style="margin:8px 0 0" translate="no">${esc(r.body || '—')}</p>`}
      <div class="acts"><button class="btn" data-a="modres" data-v="${r.target_type}:${r.target_id}:restore">Sorun yok, göster</button><button class="btn pri" data-a="modres" data-v="${r.target_type}:${r.target_id}:delete">Sil</button></div></div>`).join('');
  return `<h1 class="xh">Moderatör paneli</h1>${tabs}${body}`;
}

/* ===== eylemler ===== */
const needOnline = () => { if (!ONLINE()) { toast('Bu özellik yayındaki sitede çalışır.'); return false; } return true; };
Object.assign(A, {
  navgo: v => { const m = ROUTE ? ROUTE.mode : 'driving-car'; navStart([v], m); },
  navend: () => navEnd(),
  navmute: () => { if (!NAV) return; NAV.muted = !NAV.muted; try { speechSynthesis.cancel(); } catch (_) { } navPaint(); },
  navover: () => navOverview(),
  navfollow: () => { if (!NAV) return; NAV.follow = true; navPaint(); if (MEPOS) { const [x, y] = proj(MEPOS.lng, MEPOS.lat); flyTo(x, y, ML.on ? sOfZoom(NTUNE[NAV.mode].z) : V.maxS, true); } },
  tripadd: v => { tripToggle(v); renderDetail(); },
  share: v => sharePlace(v),
  xback: () => { if (XV && XV.prev) { const pv = XV.prev, arg = XV.prev === 'city' ? XV.city : null; TROUTE = null; drawPath(null); showX(pv, arg, pv === 'city' ? 'rec' : null); } else { hideX(); TROUTE = null; drawPath(null); showView(); renderList(); } },
  xrec: () => showX('rec'),
  mtrip: () => { toggleMenu(false); showX('trip'); },
  mrec: () => { toggleMenu(false); showX('rec'); },
  mprivacy: () => {
    toggleMenu(false);
    try { $('privdate').textContent = `Son güncelleme: ${new Date('2026-11-25T12:00:00').toLocaleDateString(window.LANG || 'tr', { day: 'numeric', month: 'long', year: 'numeric' })}`; } catch (_) { }
    openDlg($('privdlg'));
  },
  mfeedback: () => { toggleMenu(false); if (!CUR) { openAuth('in'); return; } FB.kind = 'oneri'; FB.rating = 0; $('fbtext').value = ''; renderFb(); loadMyFb(); openDlg($('fbdlg')); },
  mmod: () => { toggleMenu(false); MOD.fbs = null; MOD.reps = null; showX('mod'); loadMod(); },
  dclose: v => closeDlg($(v)),
  fbkind: v => { FB.kind = v; renderFb(); },
  fbstar: v => { FB.rating = FB.rating === +v ? 0 : +v; renderFb(); },
  fbsend: async () => {
    const body = $('fbtext').value.trim();
    if (body.length < 3) { toast('Lütfen birkaç kelimeyle anlat.'); return; }
    if (!needOnline() || !ME) return;
    $('fbgo').disabled = true;
    const { error } = await sb.from('feedback').insert({ user_id: ME.id, kind: FB.kind, rating: FB.rating || null, body: body.slice(0, 2000), platform: 'web', version: 'web' });
    $('fbgo').disabled = false;
    if (error) { toast(/feedback_limit/.test(error.message) ? 'Bugün çok fazla mesaj gönderdin. Yarın tekrar deneyebilirsin.' : 'Bir hata oluştu, lütfen tekrar dene.'); return; }
    $('fbtext').value = ''; FB.rating = 0; renderFb(); toast('Mesajın bize ulaştı. Teşekkürler!'); loadMyFb();
  },
  report: v => {
    if (!CUR) { openAuth('in'); return; }
    const [t, id, ph] = v.split(':');
    Object.assign(RPT, { id, type: ph ? null : t, choices: ph ? ['review', 'photo'] : null });
    renderRp(); openDlg($('rpdlg'));
  },
  rptype: v => { RPT.type = v; renderRp(); },
  rpsend: async v => {
    if (!needOnline() || !ME) return;
    const { error } = await sb.from('reports').insert({ user_id: ME.id, target_type: RPT.type, target_id: RPT.id, reason: v });
    if (error) {
      const m = error.message || '';
      toast(/own_content/.test(m) ? 'Kendi paylaşımını şikâyet edemezsin.' : /duplicate|unique/.test(m) ? 'Bunu zaten yaptın.' : /report_limit/.test(m) ? 'Bugün çok fazla şikâyette bulundun. Yarın tekrar deneyebilirsin.' : 'Bir hata oluştu, lütfen tekrar dene.');
      return;
    }
    closeDlg($('rpdlg')); toast('Şikâyetin alındı. Teşekkürler!');
    try { await loadReviews(); refreshAll(); } catch (_) { }
  },
  modtab: v => { MOD.tab = v; renderX(); },
  fbhandled: async v => { const f = (MOD.fbs || []).find(x => x.id === v); if (!f) return; const { error } = await sb.from('feedback').update({ handled: !f.handled }).eq('id', v); if (error) toast('Bir hata oluştu, lütfen tekrar dene.'); loadMod(); },
  modres: async v => {
    const [t, id, act] = v.split(':');
    const { error } = await sb.rpc('mod_resolve', { t, tid: id, act });
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    toast(act === 'restore' ? 'İçerik yeniden gösteriliyor' : 'İçerik silindi');
    loadMod(); try { await loadReviews(); refreshAll(); } catch (_) { }
  },
  // gezi listesi
  tup: v => { const i = TRIP.indexOf(v); if (i > 0) { [TRIP[i - 1], TRIP[i]] = [TRIP[i], TRIP[i - 1]]; tripSave(); TROUTE = null; drawPath(null); renderX(); } },
  tdown: v => { const i = TRIP.indexOf(v); if (i >= 0 && i < TRIP.length - 1) { [TRIP[i + 1], TRIP[i]] = [TRIP[i], TRIP[i + 1]]; tripSave(); TROUTE = null; drawPath(null); renderX(); } },
  trm: v => { TRIP = TRIP.filter(x => x !== v); tripSave(); TROUTE = null; drawPath(null); renderX(); },
  topt: () => { TRIP = nearestOrder(TRIP.map(byId).filter(Boolean), MEPOS).map(p => p.id); tripSave(); TROUTE = null; drawPath(null); toast('Duraklar en kısa sıraya dizildi'); renderX(); },
  tclear: () => { TRIP = []; tripSave(); TROUTE = null; drawPath(null); toast('Gezi listen temizlendi'); renderX(); },
  troute: () => tripRoute(),
  trmode: v => tripRoute(v),
  trclose: () => { TROUTE = null; drawPath(null); renderX(); },
  tnav: () => { if (TROUTE) navStart(LIST().slice(), TROUTE.mode); },
  // öneri
  rsub: v => { REC.subs = REC.subs.includes(v) ? REC.subs.filter(x => x !== v) : [...REC.subs, v]; const y = $('xbody').scrollTop; renderX(); $('xbody').scrollTop = y; },
  rnear: () => { if (!REC.near && !MEPOS) { locate().then(() => { REC.near = true; renderX(); }).catch(e => { toast(e.message); renderX(); }); return; } REC.near = !REC.near; const y = $('xbody').scrollTop; renderX(); $('xbody').scrollTop = y; },
  rcity: v => { REC.day = 0; XV_city = v; showX('city', v, 'rec'); const ps = PLACES.filter(p => p.il === v); if (ps.length) { const xs = ps.map(p => p.x), ys = ps.map(p => p.y); fitBox(Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20, 3, true); } },
  rdays: v => { REC.days = +v; REC.day = 0; renderX(); },
  rday: v => { REC.day = +v; renderX(); },
  raddtrip: () => { const ids = curPlan().map(p => p.id); let n = 0; ids.forEach(id => { if (!TRIP.includes(id) && TRIP.length < 24) { TRIP.push(id); n++; } }); tripSave(); toast(n ? `Gezi listene ${n} yer eklendi` : 'Bu yerler zaten gezi listende'); },
  rroute: () => { const ids = curPlan().map(p => p.id); TROUTE = null; showX('trip', ids, 'city'); XV.city = XV_city; tripRoute(); },
  taddall: () => { const ids = LIST(); let n = 0; ids.forEach(id => { if (!TRIP.includes(id) && TRIP.length < 24) { TRIP.push(id); n++; } }); tripSave(); toast(n ? `Gezi listene ${n} yer eklendi` : 'Bu yerler zaten gezi listende'); },
});
// ziyaret ve yorum sonrası rozet kontrolü
['visit', 'send'].forEach(k => { const f = A[k]; if (f) A[k] = v => { const r = f(v); setTimeout(() => { try { checkBadges(); } catch (_) { } }, 1500); return r; }; });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && NAV && !document.querySelector('dialog[open]')) { /* navigasyonu yanlışlıkla kapatma */ } });
