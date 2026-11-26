/* ===== aşama 2: mevsim, yöresel lezzetler, Türkiye haritam, gezi listesi bağlantısı, bildirimler ===== */
/* DISHES ve PSHAPES derleme sırasında başa eklenir (paint/dishes.json, paint/prov_shapes.json) */

/* ---- en iyi zaman (uygulamadaki src/lib/season.ts ile aynı kurallar) ---- */
const SKI = new Set(['uludag', 'erciyes', 'palandoken', 'sarikamis', 'yedikuyular', 'kartepe', 'kartalkaya', 'saklikentkayak', 'hesarek']);
const mspan = (a, b) => { const r = []; for (let m = a; ; m = (m % 12) + 1) { r.push(m); if (m === b) break; } return r; };
const SEA_C = new Set(['plaj', 'ada', 'sahil']), NAT_C = new Set(['gol', 'selale', 'kanyon', 'park', 'doga', 'olusum']);
function bestMonths(p) {
  const r = p.r, c = p.c;
  if (SKI.has(p.id) || /Kayak Merkezi/.test(p.n)) return mspan(12, 3);
  if (SEA_C.has(c)) return r === 1 || r === 2 ? mspan(5, 10) : r === 4 ? mspan(7, 8) : mspan(6, 9);
  if (c === 'kaplica') return mspan(10, 4);
  if (c === 'dag') return r === 4 || r === 5 ? mspan(6, 9) : r === 1 || r === 2 ? mspan(5, 10) : mspan(5, 9);
  if (c === 'magara') return mspan(4, 10);
  if (NAT_C.has(c)) return r === 4 || r === 5 ? mspan(5, 9) : r === 1 || r === 2 || r === 6 ? [...mspan(3, 6), ...mspan(9, 11)] : mspan(4, 10);
  if (r === 1 || r === 2 || r === 6) return [...mspan(3, 5), ...mspan(10, 11)];
  if (r === 5) return mspan(5, 10);
  if (r === 4) return mspan(5, 9);
  return [...mspan(4, 6), ...mspan(9, 10)];
}
const inSeason = (p, m = new Date().getMonth() + 1) => bestMonths(p).includes(m);
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const monthName = m => { const l = window.LANG || 'tr'; if (l === 'tr') return TR_MONTHS[m - 1]; try { return new Date(2026, m - 1, 15).toLocaleDateString(l, { month: 'long' }); } catch (_) { return TR_MONTHS[m - 1]; } };
function monthsText(ms) {
  const set = new Set(ms), runs = []; if (set.size === 12) return null;
  let start = 1; while (set.has(start)) start = (start % 12) + 1;
  let cur = null;
  for (let i = 0, m = start; i < 12; i++, m = (m % 12) + 1) { if (set.has(m)) { if (cur) cur[1] = m; else cur = [m, m]; } else if (cur) { runs.push(cur); cur = null; } }
  if (cur) runs.push(cur);
  return runs.map(([a, b]) => a === b ? monthName(a) : `${monthName(a)}–${monthName(b)}`).join(', ');
}
const seasonHTML = p => { const t = monthsText(bestMonths(p)); if (!t) return ''; const now = inSeason(p);
  return `<div class="box season${now ? ' now' : ''}"><div class="lvl" style="margin:0"><b>🗓 <span>En iyi zaman</span></b>${now ? '<span class="sbadge">Şimdi tam zamanı!</span>' : ''}</div><span translate="no">${esc(t)}</span></div>`; };
const dishesHTML = (il, withIl = true) => { const d = DISHES[il]; if (!d || !d.length) return '';
  const en = (window.LANG || 'tr') !== 'tr';
  return `<div class="box dishes"><b>🍲 ${withIl ? `<span>${esc(il)} yöresel lezzetleri</span>` : '<span>Yöresel lezzetler</span>'}</b><ul>${d.map(([tr, g]) => `<li><b translate="no">${esc(tr)}</b>${en ? ` <span class="count" translate="no">— ${esc(g)}</span>` : ''}</li>`).join('')}</ul></div>`; };

const rd19 = renderDetail;
renderDetail = function () {
  rd19();
  if (S.tab !== 'ov' || !S.sel) return;
  const p = byId(S.sel); if (!p) return;
  const note = $('detail').querySelector(':scope > p.note');
  const h = seasonHTML(p) + dishesHTML(p.il);
  if (note) note.insertAdjacentHTML('beforebegin', h); else $('detail').insertAdjacentHTML('beforeend', h);
};
const ch19 = cityHTML;
cityHTML = function () {
  const h = ch19(), k = '<h2 class="xh2">', i = h.lastIndexOf(k);
  const d = dishesHTML(XV.arg);
  return i > 0 ? h.slice(0, i) + d + h.slice(i) : h + d;
};
const pw19 = pweight;
pweight = function (p) { return pw19(p) * (inSeason(p) ? 1.25 : 0.85); };

/* liste filtresi: "Bu mevsim" */
S.now = false;
const mp19 = matchPlace;
matchPlace = function (p, q, ig) { return mp19(p, q, ig) && (!S.now || inSeason(p)); };
const rc19 = renderChips;
renderChips = function () {
  rc19();
  $('regions').insertAdjacentHTML('afterbegin', `<button class="chip" data-a="season" aria-pressed="${S.now}"><span aria-hidden="true">🗓</span> <span>Bu mevsim</span></button>`);
};

/* ---- Türkiye haritam: gidilen yerlerin illeri renklenir ---- */
const PW = 1000, LNG0 = 25.6, LAT1 = 42.2, KX = PW / ((44.9 - LNG0) * Math.cos(39 * Math.PI / 180)), PH = Math.round((LAT1 - 35.8) * KX);
const pxy = (lng, lat) => [(lng - LNG0) * KX * Math.cos(39 * Math.PI / 180), (LAT1 - lat) * KX];
const PPATH = Object.fromEntries(Object.entries(PSHAPES).map(([il, rings]) => [il, rings.map(r => {
  let d = ''; for (let i = 0; i < r.length; i += 2) { const [x, y] = pxy(r[i], r[i + 1]); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d + 'Z';
}).join('')]));
const PAINT = { pick: null };
function paintStats() {
  const per = {}; S.visited.forEach(id => { const p = byId(id); if (p) per[p.il] = (per[p.il] || 0) + 1; });
  return { per, done: Object.keys(per).length, max: Math.max(1, ...Object.values(per)) };
}
const paintAlpha = (n, max) => (0.45 + 0.55 * Math.min(1, n / Math.max(3, max)));
function paintHTML() {
  const { per, done, max } = paintStats(), total = Object.keys(PPATH).length, pk = PAINT.pick;
  const paths = Object.entries(PPATH).map(([il, d]) => `<path d="${d}" data-a="ppick" data-v="${esc(il)}" class="${pk === il ? 'pk' : per[il] ? 'on' : ''}"${per[il] && pk !== il ? ` style="fill-opacity:${paintAlpha(per[il], max).toFixed(2)}"` : ''}><title>${esc(il)}</title></path>`).join('');
  const list = Object.entries(per).sort((a, b) => b[1] - a[1]);
  return `<h1 class="xh">Türkiye haritam</h1>
    <div class="box paintcard"><p class="eyebrow" style="margin:0">Türkiye haritam</p><div class="pbig"><span>${done} / ${total} il</span></div>
      <p class="count" style="margin:2px 0 0"><span>${S.visited.size} yer gezildi</span> · <span>Türkiye’nin %${Math.round(done / total * 100)} kadarı</span></p>
      <svg class="pmap" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Türkiye haritam">${paths}</svg>
      <div class="lvl" style="font-size:11px;font-weight:400"><span class="count">Türkiye Gezi Rehberi</span><span class="count" translate="no">© OpenStreetMap</span></div></div>
    ${pk ? `<div class="box"><b translate="no">${esc(pk)}</b><p class="count" style="margin:2px 0 8px">${per[pk] ? `<span>${per[pk]} yer gezildi</span>` : '<span>Henüz bu ilde bir yere gitmedin.</span>'}</p><button class="btn" data-a="rcity" data-v="${esc(pk)}">İldeki yerleri gör</button></div>` : '<p class="note">Bir ile tıklayarak ayrıntısını gör.</p>'}
    <button class="btn pri" style="width:100%;margin-top:10px" data-a="pshare">↗ <span>Haritamı paylaş</span></button>
    ${list.length ? `<div class="box"><b>Gezdiğin iller</b><div class="chips wrapc" style="margin-top:6px">${list.map(([il, n]) => `<button class="chip" data-a="ppick" data-v="${esc(il)}" translate="no">${esc(il)} · ${n}</button>`).join('')}</div></div>`
    : '<p class="note" style="text-align:center">Bir yerin sayfasında “Gittim mi?” düğmesine bastıkça iller burada renklenir.</p>'}`;
}
/* paylaşılacak görsel: tuvale çiz → PNG */
function paintPNG() {
  const { per, done, max } = paintStats(), total = Object.keys(PPATH).length;
  const css = getComputedStyle(document.documentElement), v = k => css.getPropertyValue(k).trim();
  const W = 1200, M = 60, mw = W - 2 * M, mh = mw * PH / PW, H = Math.round(mh + 330);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = v('--surface') || '#fff'; g.fillRect(0, 0, W, H);
  const font = (w, s) => `${w} ${s}px ${getComputedStyle(document.body).fontFamily}`;
  g.fillStyle = v('--accent') || '#B8321F'; g.font = font(800, 26); g.fillText(tx('Türkiye haritam').toLocaleUpperCase(window.LANG || 'tr'), M, 78);
  g.fillStyle = v('--ink') || '#14313A'; g.font = font(900, 72); g.fillText(tx(`${done} / ${total} il`), M, 160);
  g.fillStyle = v('--muted') || '#5B6B70'; g.font = font(500, 28); g.fillText(`${tx(`${S.visited.size} yer gezildi`)} · ${tx(`Türkiye’nin %${Math.round(done / total * 100)} kadarı`)}`, M, 205);
  const k = mw / PW; g.save(); g.translate(M, 240); g.scale(k, k);
  Object.entries(PPATH).forEach(([il, d]) => {
    const p = new Path2D(d);
    g.fillStyle = per[il] ? (v('--accent') || '#B8321F') : (v('--line') || '#E5E0D5');
    g.globalAlpha = per[il] ? paintAlpha(per[il], max) : 1; g.fill(p); g.globalAlpha = 1;
    g.strokeStyle = v('--surface') || '#fff'; g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke(p);
  });
  g.restore();
  g.fillStyle = v('--muted') || '#5B6B70'; g.font = font(600, 24); g.fillText(tx('Türkiye Gezi Rehberi'), M, H - 36);
  g.font = font(400, 18); g.textAlign = 'right'; g.fillText('© OpenStreetMap', W - M, H - 36);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

/* ---- bildirimler ---- */
const NOTE = { unread: 0, list: null, t: null };
const NTXT = { reply: n => `${n} yorumuna yanıt verdi`, like: n => `${n} yorumunu beğendi`, photo_like: n => `${n} fotoğrafını beğendi`, approved: () => 'Önerdiğin yer onaylandı ve haritaya eklendi' };
const NICON = { reply: '💬', like: '♥', photo_like: '📷', approved: '✅' };
async function notePoll() {
  if (!ONLINE() || !ME) { NOTE.unread = 0; noteBadge(); return; }
  try { const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false); if (typeof count === 'number') { NOTE.unread = count; noteBadge(); } } catch (_) { }
}
function noteBadge() {
  const b = $('acct'); if (!b) return;
  let d = b.querySelector('.nbadge');
  if (NOTE.unread > 0) { if (!d) { d = document.createElement('span'); d.className = 'nbadge'; d.setAttribute('aria-hidden', 'true'); b.appendChild(d); } d.textContent = NOTE.unread > 9 ? '9+' : String(NOTE.unread); }
  else if (d) d.remove();
  const mi = $('mnotes'); if (mi) { const c = mi.querySelector('.ncount'); if (c) c.textContent = NOTE.unread ? String(NOTE.unread) : ''; }
}
const ra19 = renderAcct; renderAcct = function () { ra19(); noteBadge(); };
setInterval(() => { if (document.visibilityState === 'visible') notePoll(); }, 90000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') notePoll(); });
setTimeout(notePoll, 2500);
async function loadNotes() {
  NOTE.list = null; renderX();
  const { data, error } = await sb.from('notifications').select('id,kind,actor,review_id,place_id,read,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) { NOTE.list = []; NOTE.err = true; renderX(); return; }
  NOTE.err = false;
  const ids = [...new Set((data || []).map(r => r.actor).filter(Boolean))]; let names = {};
  if (ids.length) { const { data: ps } = await sb.from('profiles').select('id,name').in('id', ids); names = Object.fromEntries((ps || []).map(p => [p.id, p.name])); }
  NOTE.list = (data || []).map(r => ({ ...r, who: (r.actor && names[r.actor]) || '?' }));
  if (XV && XV.kind === 'inbox') renderX();
  if (NOTE.list.some(n => !n.read)) { NOTE.unread = 0; noteBadge(); sb.rpc('mark_notifications_read').then(() => { }, () => { }); }
}
function inboxHTML() {
  const l = NOTE.list;
  const body = l == null ? '<p class="note">Yükleniyor…</p>' : NOTE.err ? '<p class="note">Bildirimler yüklenemedi.</p>'
    : !l.length ? '<div class="box"><b>Henüz bildirimin yok</b><p class="note">Yorumlarına yanıt gelince ya da biri beğenince burada görürsün.</p></div>'
      : l.map(n => { const p = n.place_id && byId(n.place_id);
        return `<button class="card note-it${n.read ? '' : ' unread'}" data-a="nopen" data-v="${esc(n.id)}"><span class="nic" aria-hidden="true">${NICON[n.kind] || '🔔'}</span><span style="flex:1;min-width:0"><span class="ntx">${esc((NTXT[n.kind] || NTXT.reply)(n.who))}</span>${p ? `<b class="npl" translate="no">${esc(p.n)}</b>` : ''}<span class="count">${esc(agoText(n.created_at))}</span></span></button>`; }).join('');
  return `<h1 class="xh">Bildirimler</h1>${body}`;
}

/* ---- yeni görünümler ---- */
const rx19 = renderX;
renderX = function () {
  if (XV && (XV.kind === 'paint' || XV.kind === 'inbox')) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>Tüm yerler</span></button>`;
    $('xbody').innerHTML = back + (XV.kind === 'paint' ? paintHTML() : inboxHTML());
    return;
  }
  rx19();
};

/* profil ve menüye girişler */
const rp19 = renderProfile;
renderProfile = function () {
  rp19(); if (!CUR) return;
  const { done } = paintStats(), lvl = $('prof').querySelector('.box');
  const h = `<button class="box pentry" data-a="mpaint"><span class="pic" aria-hidden="true">🗺</span><span style="flex:1;text-align:start"><b>Türkiye haritam</b><span class="count"><span>${done} / 81 il</span> · <span>Gezdiğin illeri boya, paylaş</span></span></span><span aria-hidden="true" class="count">›</span></button>`;
  if (lvl) lvl.insertAdjacentHTML('beforebegin', h);
};
$('acctmenu').querySelector('[data-a="mtrip"]').insertAdjacentHTML('beforebegin',
  `<button role="menuitem" data-a="mnotes" id="mnotes"><span class="emi" aria-hidden="true">🔔</span><span>Bildirimler</span><span class="ncount"></span></button>
   <button role="menuitem" data-a="mpaint"><span class="emi" aria-hidden="true">🗺</span><span>Türkiye haritam</span></button>`);

/* ---- gezi listesini paylaş + ?gezi= bağlantısı ---- */
const tripLink = ids => `${location.origin}${location.pathname}?gezi=${ids.map(encodeURIComponent).join(',')}`;
const th19 = tripHTML;
tripHTML = function () {
  const h = th19();
  if (Array.isArray(XV.arg) || !TRIP.length) return h;
  return h.replace('<p class="note">Rota konumundan', '<button class="btn" style="width:100%;margin-top:8px" data-a="tshare">↗ <span>Listeyi paylaş</span></button><p class="note">Rota konumundan');
};
async function shareLink(url, title, text) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Bağlantı kopyalandı'); } catch (_) { window.prompt(tx('Bağlantıyı kopyala'), url); }
}
(function openTripLink() {
  let raw = null; try { raw = new URLSearchParams(location.search).get('gezi'); } catch (_) { }
  if (!raw) return;
  const ids = raw.split(',').map(x => x.trim()).filter(x => /^[a-z0-9_-]{1,64}$/i.test(x)).slice(0, 24);
  let n = 0;
  const go = () => {
    const ok = ids.filter(id => byId(id));
    if (ok.length || n++ >= 20) { if (ok.length) { track('act:open_link'); showX('trip', ok); toast('Seninle bir gezi listesi paylaşıldı'); } try { history.replaceState(null, '', location.pathname); } catch (_) { } }
    else setTimeout(go, 500);
  };
  setTimeout(go, 600);
})();

Object.assign(A, {
  season: () => { S.now = !S.now; renderChips(); renderList(); if (S.sel) back(); fitResults(); },
  mpaint: () => { toggleMenu(false); PAINT.pick = null; showX('paint'); },
  ppick: v => { PAINT.pick = PAINT.pick === v ? null : v; renderX(); },
  pshare: async () => {
    track('act:paint_share');
    try {
      const blob = await paintPNG(), file = new File([blob], 'turkiye-haritam.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: tx('Türkiye haritam') }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'turkiye-haritam.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Görsel indirildi');
    } catch (e) { if (!e || e.name !== 'AbortError') toast('Bir hata oluştu, lütfen tekrar dene.'); }
  },
  mnotes: () => { toggleMenu(false); if (!CUR) { openAuth('in'); return; } if (!needOnline()) return; showX('inbox'); loadNotes(); },
  nopen: v => { const n = (NOTE.list || []).find(x => x.id === v); if (n && n.place_id && byId(n.place_id)) { hideX(); select(n.place_id); if (n.kind !== 'approved') { S.tab = n.kind === 'photo_like' ? 'pho' : 'rev'; renderDetail(); } } },
  tshare: () => shareLink(tripLink(TRIP), tx('Gezi listem'), `${tx('Gezi listem')} · ${tx(`${TRIP.length} durak`)} · ${tx('Türkiye Gezi Rehberi')}`),
});
