/* ---------- konum ve yol tarifi ----------
   Konum yalnızca tarayıcıda kullanılır, sunucuya gönderilmez ve kaydedilmez.
   Yol tarifi: Supabase'deki "route" işlevi OpenRouteService'e anahtarı gizli tutarak sorar. */
let MEPOS = null, MEWATCH = null, ROUTE = null;
const fmtDist = m => m < 1000 ? `${fmt(Math.max(10, Math.round(m / 10) * 10))} m` : m < 10000 ? `${(m / 1000).toLocaleString(window.LANG === 'tr' ? 'tr-TR' : (window.LANG || 'tr') + '-u-nu-latn', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` : `${fmt(Math.round(m / 1000))} km`;
const distTo = p => MEPOS ? meters(MEPOS.lat, MEPOS.lng, p.lat, p.lng) : null;

function gotPos(c) {
  const first = !MEPOS;
  MEPOS = { lat: c.latitude, lng: c.longitude, acc: c.accuracy || 50 };
  draw(); if (first || S.sort === 'near') renderList();
  if (S.sel && !$('detailv').hidden) renderDetail();
}
function locate() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Bu tarayıcı konum özelliğini desteklemiyor.'));
    navigator.geolocation.getCurrentPosition(p => {
      gotPos(p.coords);
      if (MEWATCH == null) MEWATCH = navigator.geolocation.watchPosition(q => gotPos(q.coords), () => { }, { enableHighAccuracy: false, maximumAge: 30000 });
      res(MEPOS);
    }, e => rej(new Error(e && e.code === 1 ? 'Konum izni verilmedi. Tarayıcının site ayarlarından izin verebilirsin.' : 'Konumun bulunamadı. Cihazında konum servisinin açık olduğundan emin ol.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}
// izin daha önce verildiyse sormadan başla
try { navigator.permissions && navigator.permissions.query({ name: 'geolocation' }).then(s => { if (s.state === 'granted') locate().catch(() => { }); }); } catch (_) { }

/* haritada mavi nokta */
const renderLoc0 = render;
render = function () {
  renderLoc0();
  const sx = u => u * V.s + V.tx, sy = u => u * V.s + V.ty;
  let h = '';
  if (MEPOS) { const [x, y] = proj(MEPOS.lng, MEPOS.lat); h += `<span class="mepin" style="left:${sx(x).toFixed(1)}px;top:${sy(y).toFixed(1)}px" aria-hidden="true"></span>`; }
  if (ROUTE && ROUTE.ends) ROUTE.ends.forEach(([x, y], i) => { h += `<span class="rend ${i ? 'to' : 'from'}" style="left:${sx(x).toFixed(1)}px;top:${sy(y).toFixed(1)}px" aria-hidden="true"></span>`; });
  if (h) $('pins').insertAdjacentHTML('afterbegin', h);
};
$('zoom').insertAdjacentHTML('afterbegin', `<button data-a="locate" aria-label="Konumum"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></button>`);

/* "Bana en yakın" sıralaması ve listede uzaklık */
SORTS.unshift(['near', 'Bana en yakın']);
SICON.near = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
const results0 = results;
results = function () {
  if (S.sort !== 'near') return results0();
  S.sort = 'visits'; const r = results0(); S.sort = 'near';
  return MEPOS ? r.map(x => ({ ...x, d: distTo(x.p) })).sort((a, b) => a.d - b.d) : r;
};
const renderList0 = renderList;
renderList = function () {
  renderList0();
  if (!MEPOS) return;
  document.querySelectorAll('#rows .row').forEach(b => {
    const p = byId(b.dataset.v), rm = b.querySelector('.rm');
    if (p && rm) rm.insertAdjacentHTML('beforeend', `<span class="dist${S.sort === 'near' ? ' hot' : ''}"> · ${fmtDist(distTo(p))}</span>`);
  });
};

/* yer kartı: uzaklık ve uygulama içi yol tarifi düğmesi */
const renderDetail0 = renderDetail;
renderDetail = function () {
  renderDetail0();
  const p = byId(S.sel); if (!p) return;
  const st = $('detail').querySelector('.stats');
  if (st && MEPOS) st.insertAdjacentHTML('beforeend', `<span class="count dist"><span aria-hidden="true">📍</span> <span>${esc(fmtDist(distTo(p)))}</span> <span>Senden uzaklık</span></span>`);
  const a = $('detail').querySelector('a.btn.pri[href*="google.com/maps"]');
  if (a) a.outerHTML = `<button class="btn pri" data-a="route" data-v="${p.id}">Yol tarifi</button>`;
  if (ROUTE && ROUTE.pid === p.id) {
    const acts = $('detail').querySelectorAll('.acts')[1] || $('detail').querySelector('.acts');
    acts.insertAdjacentHTML('afterend', routeHTML(p));
  }
};

const MODES = [['driving-car', 'Araba', 'driving', '🚗'], ['foot-walking', 'Yürüyüş', 'walking', '🚶'], ['cycling-regular', 'Bisiklet', 'bicycling', '🚲'], ['transit', 'Toplu taşıma', 'transit', '🚌']];
const gmaps = (p, m) => `https://www.google.com/maps/dir/?api=1${MEPOS ? `&origin=${MEPOS.lat},${MEPOS.lng}` : ''}&destination=${p.lat},${p.lng}&travelmode=${(MODES.find(x => x[0] === m) || MODES[0])[2]}`;
const durTxt = s => { const h = Math.floor(s / 3600), m = Math.max(1, Math.round((s % 3600) / 60)); return h ? `${fmt(h)} sa ${fmt(m)} dk` : `${fmt(m)} dk`; };
function routeHTML(p) {
  const R = ROUTE;
  const chips = MODES.map(([k, l, , ic]) => `<button type="button" class="chip" data-a="rmode" data-v="${k}" aria-pressed="${R.mode === k}"><span aria-hidden="true">${ic}</span> <span>${l}</span></button>`).join('');
  let body = '';
  if (R.state === 'loading') body = '<p class="note">Rota hesaplanıyor…</p>';
  else if (R.state === 'error') body = `<p class="note" style="color:var(--accent)">${esc(R.err)}</p>`;
  else if (R.state === 'nokey') body = '<p class="note">Uygulama içi yol tarifi çok yakında açılacak. Şimdilik Google Haritalar ile devam edebilirsin.</p>';
  else if (R.data) body = `<div class="rsum"><b>${durTxt(R.data.duration)}</b><span class="count">${fmtDist(R.data.distance)}</span></div>
    <details class="steps"><summary>Adım adım tarif</summary><ol>${R.data.steps.map(s => `<li>${esc(s.i)}${s.d ? `<span class="count"> · ${fmtDist(s.d)}</span>` : ''}</li>`).join('')}</ol><p class="note">© openrouteservice.org · © OpenStreetMap</p></details>`;
  return `<div class="box routebox" id="routebox"><div class="rhead"><b>Yol tarifi</b><button type="button" class="xb" data-a="rclose" aria-label="Kapat"><svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <div class="chips wrapc">${chips}</div>${body}
    <a class="btn pri" style="margin-top:10px;width:100%;box-sizing:border-box" href="${gmaps(p, R.mode)}" target="_blank" rel="noopener"><span aria-hidden="true">▶</span> <span>Navigasyonu başlat</span></a>
    <p class="note" style="margin-top:6px">Sesli yönlendirme Google Haritalar ile açılır.</p></div>`;
}
function drawRoute() {
  const old = document.getElementById('routepath'); if (old) old.remove();
  if (!ROUTE || !ROUTE.data) { draw(); return; }
  const pts = ROUTE.data.geometry.coordinates.map(([lng, lat]) => proj(lng, lat));
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L');
  $('world').insertAdjacentHTML('beforeend', `<path id="routepath" d="${d}" fill="none" stroke="#1F6FEB" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), MAP.classList.contains('ml') ? 2048 : V.maxS, true);
}
async function loadRoute() {
  const p = byId(ROUTE.pid); if (!p) return;
  if (ROUTE.mode === 'transit') { window.open(gmaps(p, 'transit'), '_blank', 'noopener'); return; }
  ROUTE.state = 'loading'; ROUTE.data = null; drawRoute(); renderDetail();
  try {
    if (!MEPOS) await locate();
    const [ox, oy] = proj(MEPOS.lng, MEPOS.lat); ROUTE.ends = [[ox, oy], [p.x, p.y]];
    if (typeof sb === 'undefined' || !sb) { ROUTE.state = 'nokey'; renderDetail(); draw(); return; }
    const mode = ROUTE.mode;
    const { data, error } = await sb.functions.invoke('route', { body: { profile: mode, coordinates: [[MEPOS.lng, MEPOS.lat], [p.lng, p.lat]], language: window.LANG || 'tr' } });
    if (!ROUTE || ROUTE.mode !== mode) return;
    if (error) {
      let code = ''; try { code = (await error.context.json()).error || ''; } catch (_) { }
      ROUTE.state = code === 'no_key' ? 'nokey' : 'error';
      ROUTE.err = code === 'rate_limited' ? 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.' : 'Rota bulunamadı.';
    } else { ROUTE.state = 'ok'; ROUTE.data = data; }
  } catch (e) { ROUTE.state = 'error'; ROUTE.err = (e && e.message) || 'Rota bulunamadı.'; }
  renderDetail(); drawRoute();
}
Object.assign(A, {
  locate: async () => {
    try { await locate(); const [x, y] = proj(MEPOS.lng, MEPOS.lat); flyTo(x, y, MAP.classList.contains('ml') ? Math.max(V.s, 16) : Math.max(V.s, 8)); }
    catch (e) { toast(e.message); }
  },
  route: v => { ROUTE = { pid: v, mode: 'driving-car', state: 'loading' }; loadRoute(); },
  rmode: v => { if (!ROUTE) return; if (v === 'transit') { const p = byId(ROUTE.pid); window.open(gmaps(p, 'transit'), '_blank', 'noopener'); return; } ROUTE.mode = v; loadRoute(); },
  rclose: () => { ROUTE = null; drawRoute(); renderDetail(); }
});
// başka bir yere geçince ya da listeye dönünce rotayı kaldır
const select0 = select;
select = function (id) { if (ROUTE && ROUTE.pid !== id) { ROUTE = null; drawRoute(); } return select0(id); };
const back0 = A.back;
A.back = v => { if (ROUTE) { ROUTE = null; drawRoute(); } return back0 && back0(v); };
const sort0 = A.sort;
A.sort = v => { if (v === 'near' && !MEPOS) { locate().then(() => sort0('near')).catch(e => toast(e.message)); return; } sort0(v); };

/* yer önerirken "Şu an buradayım" */
$('spick').insertAdjacentHTML('afterend', `<button type="button" class="btn" style="flex:none;padding:0 14px" data-a="shere"><span aria-hidden="true">📍</span> <span>Şu an buradayım</span></button>`);
A.shere = async () => {
  try {
    const v = await locate(), [ux, uy] = proj(v.lng, v.lat), tr = document.querySelector('.p-tr');
    let inTr = v.lat > 35.8 && v.lat < 42.2 && v.lng > 25.6 && v.lng < 44.9;
    try { inTr = tr.isPointInFill(new DOMPoint(ux, uy)) || (inTr && meters(v.lat, v.lng, ...toLatLng(...(GEO.labels.find(l => l[0] === nearestIl(ux, uy)) || [0, ux, uy]).slice(1))) < 90000); } catch (_) { }
    S.pickPt = { lat: v.lat, lng: v.lng, ux, uy, inTr };
    const il = nearestIl(ux, uy); if (inTr && il) $('sil').value = il;
    renderSuggest(); draw();
  } catch (e) { toast(e.message); }
};
