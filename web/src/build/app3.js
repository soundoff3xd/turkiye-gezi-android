/* ---------- yer önerme ve doğrulama ---------- */
const NEED = 3, REPORT_LIMIT = 2, DAILY = 3;
const BAD = ['amk', 'aq', 'siktir', 'orospu', 'piç', 'pic', 'yarrak', 'göt', 'salak', 'aptal', 'gerizekal'];
S.sugg = [
  { id: 'g1', n: 'Güvercinada Kalesi', il: 'Aydın', c: 'kale', lat: 37.8638, lng: 27.2557, d: 'Kuşadası limanında, bir yol ile karaya bağlanan küçük adadaki kale.', by: 'Deniz', ok: 2, bad: 0, ago: '1 gün önce', sample: true },
  { id: 'g2', n: 'Tortum Şelalesi', il: 'Erzurum', c: 'selale', lat: 40.6690, lng: 41.6620, d: 'Tortum Gölü’nün ayağında, ilkbaharda en gür akan yüksek şelale.', by: 'Mert', ok: 1, bad: 0, ago: '3 gün önce', sample: true },
  { id: 'g3', n: 'Benim evin balkonu', il: 'İstanbul', c: 'seyir', lat: 41.0150, lng: 28.9600, d: 'Şehrin en iyi manzarası burada!!!', by: 'trol_hesap', ok: 0, bad: 2, ago: '2 saat önce', sample: true }
];
S.myVotes = {}; S.picking = false; S.pickPt = null; S.sMedia = null; S.mine = 0;
const status = g => g.state || (g.bad >= REPORT_LIMIT ? 'mod' : g.ok >= NEED ? 'ok' : 'wait');
const STATUS_TXT = { wait: 'Topluluk onayı bekliyor', mod: 'Şikâyet aldı, moderatörde', ok: 'Onaylandı, haritada', no: 'Reddedildi' };
const toLatLng = (ux, uy) => {
  const W0 = 256 * Math.pow(2, GEO.z), x = (ux + GEO.x0) / W0, y = (uy + GEO.y0) / W0;
  return [Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI, x * 360 - 180];
};
const meters = (a, b, c, d) => {
  const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r;
  return Math.hypot(x, y) * R;
};
const nearestIl = (ux, uy) => GEO.labels.reduce((m, l) => { const d = Math.hypot(l[1] - ux, l[2] - uy); return d < m[1] ? [l[0], d] : m; }, ['', Infinity])[0];

function checks(f) {
  const e = [], name = f.n.trim(), desc = f.d.trim(), all = fold(name + ' ' + desc);
  if (name.length < 3 || name.length > 60) e.push('Yer adı 3 ile 60 karakter arasında olmalı.');
  if (desc.length < 20) e.push('Kısa açıklama en az 20 karakter olmalı; ne görüleceğini birkaç kelimeyle anlat.');
  if (/https?:|www\.|\.(com|net|org)\b/i.test(name + desc)) e.push('Bağlantı (link) eklenemez.');
  if (/(.)\1{4,}/.test(name + desc) || (name.length > 5 && name === name.toLocaleUpperCase('tr') && /[A-ZÇĞİÖŞÜ]{6}/.test(name))) e.push('Tekrarlanan harf veya tamamı büyük harf kullanma.');
  if (BAD.some(w => all.split(/[^a-z0-9]+/).includes(fold(w)))) e.push('Uygunsuz ifade içeriyor.');
  if (!S.pickPt) e.push('Haritada konumu işaretle.');
  else {
    if (!S.pickPt.inTr) e.push('Seçilen konum Türkiye sınırları dışında.');
    const dup = PLACES.concat(S.sugg.filter(g => status(g) !== 'no')).find(p => meters(p.lat, p.lng, S.pickPt.lat, S.pickPt.lng) < 300 || (name.length > 3 && fold(p.n) === fold(name)));
    if (dup) e.push(`Bu yer zaten var ya da çok yakınında kayıt bulunuyor: ${dup.n}.`);
  }
  if (!S.sMedia) e.push('Kanıt olarak orada çektiğin bir fotoğraf ekle.');
  if (!f.been) e.push('Yeri kendin ziyaret ettiğini onayla.');
  if (S.mine >= DAILY) e.push(`Günde en fazla ${DAILY} yer önerebilirsin.`);
  return e;
}

function renderPending() {
  const list = S.sugg.slice().sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0));
  const waiting = S.sugg.filter(g => ['wait', 'mod'].includes(status(g))).length;
  $('pendbtn').textContent = `Onay bekleyenler (${waiting})`;
  $('pend').innerHTML = `<button class="back" data-a="pback">${ICON.back}Tüm yerler</button>
    <h2 style="font-size:22px">Önerilen yerler</h2>
    <div class="box"><b>Nasıl doğrulanıyor?</b>
      1. Otomatik kontrol: konum Türkiye içinde mi, aynı yer zaten var mı, uygunsuz ifade ya da bağlantı var mı, kanıt fotoğrafı eklenmiş mi.<br>
      2. Topluluk onayı: ${NEED} kullanıcı “Burası gerçek” deyince yer haritaya eklenir. Kimse kendi önerisini onaylayamaz.<br>
      3. Moderatör: ${REPORT_LIMIT} “Yanlış ya da uygunsuz” bildirimi alan öneri yayından kalkar ve moderatöre düşer.<br>
      Kişi başı günde ${DAILY} öneri hakkı var.</div>
    <p class="note">Prototip: “Örnek” etiketli öneriler yer tutucudur; senin oyun tek kullanıcı gibi sayılır.</p>
    ${list.map(g => {
      const st = status(g), v = S.myVotes[g.id], pct = Math.min(100, g.ok / NEED * 100);
      return `<article class="card">
        <div class="ch">${avHTML(g.by, avOf(g.uid, g.av))}<div class="who"><b>${esc(g.n)}</b><span>${esc(g.il)} · ${CATS[g.c]} · öneren ${esc(g.by)}, ${esc(g.ago)}</span></div>${g.sample ? '<span class="badge">Örnek</span>' : ''}</div>
        <p style="margin:8px 0 0">${esc(g.d)}</p>
        ${g.media ? `<div class="media">${mediaHTML(g.media)}</div>` : ''}
        <div class="stbar"><span class="st-${st}">${STATUS_TXT[st]}</span><span class="count">${g.ok}/${NEED} onay${g.bad ? ' · ' + g.bad + ' bildirim' : ''}</span></div>
        <div class="prog" aria-hidden="true"><i style="width:${pct}%"></i></div>
        <div class="acts">
          <button class="btn" data-a="sshow" data-v="${g.id}">Haritada gör</button>
          ${st === 'wait' && !g.own ? `<button class="btn" data-a="vok" data-v="${g.id}" aria-pressed="${v === 'ok'}" ${v ? 'disabled' : ''}>Burası gerçek</button><button class="btn" data-a="vbad" data-v="${g.id}" aria-pressed="${v === 'bad'}" ${v ? 'disabled' : ''}>Yanlış / uygunsuz</button>` : ''}
        </div>
        ${st === 'mod' || (g.own && st === 'wait') ? `<div class="acts"><button class="btn" data-a="mok" data-v="${g.id}">Moderatör: onayla</button><button class="btn" data-a="mno" data-v="${g.id}">Moderatör: reddet</button></div><p class="note" style="margin-top:6px">Moderatör düğmeleri yalnızca bu prototipte, akışı görebilmen için.</p>` : ''}
      </article>`;
    }).join('')}`;
}
function approve(g) {
  g.state = 'ok';
  if (PLACES.some(p => p.id === g.id)) return;
  const p = { id: g.id, n: g.n, il: g.il, r: regionOf(g.il), c: g.c, lat: g.lat, lng: g.lng, d: g.d, t: 1, added: g.by, base: { rating: 0, count: 0, visits: 0, favs: 0 } };
  [p.x, p.y] = proj(p.lng, p.lat);
  PLACES.push(p);
  if (g.media) S.posts.unshift({ id: 'm' + g.id, pid: g.id, author: g.by, rating: 5, text: 'Yeri öneren kullanıcının kanıt fotoğrafı.', media: g.media, likes: 0, replies: [], ago: g.ago, sample: !!g.sample });
  toast(`${g.n} haritaya eklendi`);
}
function regionOf(il) {
  const hit = PLACES.find(p => p.il === il);
  if (hit) return hit.r;
  const g = GEO.labels.find(l => l[0] === il), [lat, lng] = g ? toLatLng(g[1], g[2]) : [39, 35];
  return lng > 39.5 ? (lat > 38.5 ? 5 : 6) : lat > 40.7 ? (lng < 31 ? 0 : 4) : lng < 30 ? (lat > 39.8 ? 0 : 1) : lat < 37.3 ? 2 : 3;
}
function showPending(on) {
  $('pendv').hidden = !on; $('listv').hidden = on || !!S.sel; $('detailv').hidden = on || !S.sel;
  if (on) { S.sel = null; S.collapsed = false; renderPending(); $('pend').scrollTop = 0; }
  setSheet(); draw();
}

/* öneri penceresi */
const sdlg = $('suggest');
function renderSuggest() {
  const p = S.pickPt;
  $('spick').textContent = p ? 'Konumu değiştir' : 'Haritada işaretle';
  $('sloc').textContent = p ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}${p.inTr ? '' : ' (Türkiye dışında)'}` : 'Henüz konum seçilmedi';
  $('sprev').innerHTML = S.sMedia ? `<div class="prev">${S.sMedia.kind === 'photo' ? `<img src="${S.sMedia.url}" alt="Seçilen fotoğraf">` : ICON.play}<span>${esc(S.sMedia.name)}</span><button type="button" class="ib" style="color:var(--accent)" data-a="sunmedia">Kaldır</button></div>` : '';
}
function openSuggest() {
  if (!$('sil').options.length) $('sil').innerHTML = GEO.labels.map(l => l[0]).sort((a, b) => a.localeCompare(b, 'tr')).map(n => `<option>${esc(n)}</option>`).join('');
  if (!$('scat').options.length) $('scat').innerHTML = Object.entries(GROUPS).map(([g, gl]) => `<optgroup label="${gl}">${Object.entries(SUBS).filter(([k, v]) => v[0] === g).map(([k, v]) => `<option value="${k}">${v[1]}</option>`).join('')}</optgroup>`).join('');
  $('serr').innerHTML = ''; renderSuggest();
  sdlg.showModal ? sdlg.showModal() : sdlg.setAttribute('open', '');
}
const closeSuggest = () => sdlg.close ? sdlg.close() : sdlg.removeAttribute('open');
$('sfile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  S.sMedia = { kind: f.type.startsWith('video') ? 'video' : 'photo', url: URL.createObjectURL(f), name: f.name };
  e.target.value = ''; renderSuggest();
});
$('sform').addEventListener('submit', e => {
  e.preventDefault();
  const f = { n: $('sname').value, d: $('sdesc').value, il: $('sil').value, c: $('scat').value, been: $('sbeen').checked };
  const errs = checks(f);
  if (errs.length) { $('serr').innerHTML = `<b>Önerin gönderilmedi:</b><ul>${errs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; $('serr').scrollIntoView({ block: 'nearest' }); return; }
  S.sugg.unshift({ id: 'u' + Date.now(), n: f.n.trim(), il: f.il, c: f.c, lat: S.pickPt.lat, lng: S.pickPt.lng, d: f.d.trim(), by: 'Sen', ok: 0, bad: 0, ago: 'Şimdi', own: true, media: { kind: S.sMedia.kind, url: S.sMedia.url } });
  S.mine++; S.pickPt = null; S.sMedia = null; $('sform').reset();
  closeSuggest(); showPending(true); toast('Önerin incelemeye alındı');
});

/* haritada konum seçme */
function setPicking(on) {
  S.picking = on; $('pickbar').hidden = !on; MAP.classList.toggle('picking', on);
  if (on) closeSuggest(); else openSuggest();
}
MAP.addEventListener('click', e => {
  if (!S.picking || e.target.closest('.pin,.cl')) return;
  const rc = MAP.getBoundingClientRect(), ux = (e.clientX - rc.left - V.tx) / V.s, uy = (e.clientY - rc.top - V.ty) / V.s;
  const tr = document.querySelector('.p-tr');
  let inTr = true;
  try { inTr = tr.isPointInFill(new DOMPoint(ux, uy)); } catch (_) { }
  const [lat, lng] = toLatLng(ux, uy);
  S.pickPt = { lat, lng, ux, uy, inTr };
  const il = nearestIl(ux, uy); if (inTr && il) $('sil').value = il;
  draw(); setPicking(false);
});

/* haritaya bekleyen önerileri ve seçilen noktayı çiz */
const baseRender = render;
render = function () {
  baseRender();
  const sx = u => u * V.s + V.tx, sy = u => u * V.s + V.ty;
  let h = '';
  S.sugg.filter(g => ['wait', 'mod'].includes(status(g)) && (g.own || !$('pendv').hidden)).forEach(g => {
    const [x, y] = proj(g.lng, g.lat);
    h += `<button class="pin pend" data-a="pendopen" style="left:${sx(x).toFixed(1)}px;top:${sy(y).toFixed(1)}px" aria-label="Onay bekleyen öneri: ${esc(g.n)}"><i></i></button>`;
  });
  if (S.pickPt) h += `<span class="pin pickpt" style="left:${sx(S.pickPt.ux).toFixed(1)}px;top:${sy(S.pickPt.uy).toFixed(1)}px"><i></i></span>`;
  $('pins').insertAdjacentHTML('beforeend', h);
};

Object.assign(A, {
  sugg: openSuggest, sclose: closeSuggest,
  spick: () => setPicking(true), pickcancel: () => setPicking(false),
  sunmedia: () => { S.sMedia = null; renderSuggest(); },
  pend: () => showPending(true), pendopen: () => showPending(true),
  pback: () => { showPending(false); renderList(); },
  sshow: v => { const g = S.sugg.find(x => x.id === v), [x, y] = proj(g.lng, g.lat); if (status(g) === 'ok') { showPending(false); select(g.id); } else flyTo(x, y, placeS(false)); },
  vok: v => { const g = S.sugg.find(x => x.id === v); S.myVotes[v] = 'ok'; g.ok++; if (status(g) === 'ok') { approve(g); renderList(); } renderPending(); draw(); },
  vbad: v => { const g = S.sugg.find(x => x.id === v); S.myVotes[v] = 'bad'; g.bad++; renderPending(); draw(); toast(g.bad >= REPORT_LIMIT ? 'Öneri moderatöre gönderildi' : 'Bildirimin alındı'); },
  mok: v => { const g = S.sugg.find(x => x.id === v); approve(g); renderPending(); renderList(); },
  mno: v => { const g = S.sugg.find(x => x.id === v); g.state = 'no'; renderPending(); draw(); toast('Öneri reddedildi'); }
});
renderPending();
