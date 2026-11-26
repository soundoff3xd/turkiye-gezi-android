/* ===== aşama 8: sesli anlatım, gün doğumu/batımı, yakındaki ihtiyaçlar, gizli cevherler, hazır rotalar, Türkçe cep sözlüğü ===== */
/* --- gün doğumu / batımı (NOAA, Türkiye yıl boyu UTC+3) --- */
function sunTimes(lat, lng, date = new Date()) {
  const RAD = Math.PI / 180, tr = new Date(date.getTime() + 3 * 3600e3);
  const y = tr.getUTCFullYear(), mo = tr.getUTCMonth(), d = tr.getUTCDate();
  const n = Math.floor((Date.UTC(y, mo, d) - Date.UTC(y, 0, 0)) / 864e5);
  const calc = rising => {
    const lh = lng / 15, t = n + ((rising ? 6 : 18) - lh) / 24, M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634; L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * RAD)) / RAD; RA = ((RA % 360) + 360) % 360;
    RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    const sd = 0.39782 * Math.sin(L * RAD), cd = Math.cos(Math.asin(sd));
    const cH = (Math.cos(90.833 * RAD) - sd * Math.sin(lat * RAD)) / (cd * Math.cos(lat * RAD));
    if (cH > 1 || cH < -1) return null;
    const H = (rising ? 360 - Math.acos(cH) / RAD : Math.acos(cH) / RAD) / 15;
    const UT = (((H + RA - 0.06571 * t - 6.622) - lh) % 24 + 24) % 24;
    return Date.UTC(y, mo, d) + UT * 3600e3 - (UT > 21 ? 864e5 : 0);
  };
  return { rise: calc(true), set: calc(false) };
}
const trClock = ts => { if (ts == null) return '—'; const x = new Date(ts + 3 * 3600e3); return String(x.getUTCHours()).padStart(2, '0') + ':' + String(x.getUTCMinutes()).padStart(2, '0'); };
const sunHTML = p => { const s = sunTimes(p.lat, p.lng); return `<div class="box sunbox"><div><b>🌅 <span>Gün doğumu</span></b><span class="sunt">${trClock(s.rise)}</span></div><div><b>🌇 <span>Gün batımı</span></b><span class="sunt">${trClock(s.set)}</span></div><span class="count sunn">Bugün, Türkiye saati</span></div>`; };

/* --- sesli anlatım (tarayıcının konuşma özelliği) --- */
const SPEECH = 'speechSynthesis' in window;
const BCP = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', ru: 'ru-RU', ar: 'ar-SA', fa: 'fa-IR', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', pt: 'pt-PT', nl: 'nl-NL', pl: 'pl-PL', ro: 'ro-RO', el: 'el-GR', uk: 'uk-UA', bg: 'bg-BG', az: 'az-AZ', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', ku: 'ku', ka: 'ka-GE', kk: 'kk-KZ', uz: 'uz-UZ', sq: 'sq-AL', sr: 'sr-RS', hr: 'hr-HR', cs: 'cs-CZ', hu: 'hu-HU', sv: 'sv-SE', no: 'nb-NO', da: 'da-DK', fi: 'fi-FI', he: 'he-IL', hi: 'hi-IN', ur: 'ur-PK', id: 'id-ID', ms: 'ms-MY', th: 'th-TH', vi: 'vi-VN' };
let SPEAKING = null;
function speak(text, lang, key) {
  if (!SPEECH) return;
  speechSynthesis.cancel();
  if (SPEAKING === key) { SPEAKING = null; syncSpeak(); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = BCP[lang] || lang; u.rate = lang === 'tr' && key && key.startsWith('ph:') ? 0.85 : 0.95;
  const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase())); if (v) u.voice = v;
  u.onend = u.onerror = () => { if (SPEAKING === key) { SPEAKING = null; syncSpeak(); } };
  SPEAKING = key; syncSpeak(); speechSynthesis.speak(u); track('act:speak');
}
function syncSpeak() {
  document.querySelectorAll('[data-a="speak"],[data-a="phsay"]').forEach(b => {
    const on = SPEAKING === b.dataset.k; b.setAttribute('aria-pressed', on);
    const ic = b.querySelector('.spi'); if (ic) ic.textContent = on ? '⏹' : '🔊';
    const l = b.querySelector('.spl'); if (l) l.textContent = tx(on ? 'Durdur' : 'Sesli dinle');
  });
}
A.speak = () => { const p = byId(S.sel); if (!p || !p.d) return; speak(p.n + '. ' + tx(p.d), window.LANG || 'tr', 'pl:' + p.id); };

/* --- yakındaki ihtiyaçlar (sunucu işlevi "needs", 14 gün saklar) --- */
const NEEDK = [['ecz', '💊', 'Eczane'], ['atm', '🏧', 'ATM'], ['fuel', '⛽', 'Benzinlik'], ['wc', '🚻', 'Tuvalet'], ['park', '🅿', 'Otopark']];
const NEEDS = {}; let NEEDSEL = 'ecz';
function needsHTML(by) {
  const lab = (NEEDK.find(x => x[0] === NEEDSEL) || NEEDK[0])[2], list = by[NEEDSEL] || [];
  return `<b>🧭 <span>Yakındaki ihtiyaçlar</span></b><div class="needchips">${NEEDK.map(([k, ic, l]) => `<button class="chip${NEEDSEL === k ? ' on' : ''}" data-a="needk" data-v="${k}" aria-pressed="${NEEDSEL === k}"${(by[k] || []).length ? '' : ' style="opacity:.5"'}>${ic} <span>${l}</span></button>`).join('')}</div>
  ${list.length ? `<ul class="food">${list.map(x => `<li><a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lng}#map=19/${x.lat}/${x.lng}" target="_blank" rel="noopener"><span class="fn"><b translate="no">${esc(x.n || tx(lab))}</b>${x.h === 1 || x.fee !== undefined ? `<span class="count">${[x.h === 1 ? '<span>7/24 açık</span>' : '', x.fee === 1 ? '<span>Ücretli</span>' : x.fee === 0 ? '<span>Ücretsiz</span>' : ''].filter(Boolean).join(' · ')}</span>` : ''}</span><span class="count">${x.d < 1000 ? fmt(x.d) + ' m' : fmt(+(x.d / 1000).toFixed(1)) + ' km'}</span></a></li>`).join('')}</ul>` : '<p class="note">Yakında bulunamadı (2 km).</p>'}
  ${NEEDSEL === 'ecz' ? '<p class="note" style="margin:6px 0 0">Gece ve tatil günlerinde nöbetçi eczaneye bak.</p>' : ''}<p class="note" style="margin:4px 0 0">Kaynak: OpenStreetMap katkıcıları. Açılış saatlerini gitmeden önce kontrol et.</p>`;
}
A.needk = v => { NEEDSEL = v; const b = $('needbox'), p = byId(S.sel); if (b && p && NEEDS[p.id]) b.innerHTML = needsHTML(NEEDS[p.id]); };

const rd28 = renderDetail;
renderDetail = function () {
  rd28();
  if (S.tab !== 'ov' || !S.sel) return;
  const p = byId(S.sel); if (!p) return;
  const para = $('detail').querySelector('.para');
  if (para && p.d && SPEECH) para.insertAdjacentHTML('afterend', `<button class="spk" data-a="speak" data-k="pl:${esc(p.id)}" aria-pressed="false"><span class="spi" aria-hidden="true">🔊</span> <span class="spl">Sesli dinle</span></button>`);
  const at = $('detail').querySelector('.season') || para;
  if (at) at.insertAdjacentHTML('afterend', sunHTML(p)); else $('detail').insertAdjacentHTML('beforeend', sunHTML(p));
  syncSpeak();
  if (!ONLINE()) return;
  const box = document.createElement('div'); box.className = 'box'; box.id = 'needbox';
  const fb = $('foodbox'); if (fb) fb.after(box); else $('detail').appendChild(box);
  if (NEEDS[p.id]) { box.innerHTML = needsHTML(NEEDS[p.id]); return; }
  box.innerHTML = '<b>🧭 <span>Yakındaki ihtiyaçlar</span></b><p class="note">Yükleniyor…</p>';
  sb.functions.invoke('needs', { body: { place_id: p.id } }).then(({ data, error }) => {
    const b = $('needbox'); if (error || !data || !data.by) { if (b) b.remove(); return; }
    NEEDS[p.id] = data.by; if (b && S.sel === p.id) b.innerHTML = needsHTML(data.by);
  }).catch(() => { const b = $('needbox'); if (b) b.remove(); });
};
const sel28 = typeof select === 'function' ? select : null;
if (sel28) select = function (...a) { if (SPEECH) speechSynthesis.cancel(); SPEAKING = null; return sel28.apply(this, a); };

/* --- gizli cevherler: ünlü olmayan, puanı düşük olmayan yerler; iyi puan ve az ziyaret öne çıkar --- */
SORTS.push(['gem', 'Gizli cevherler']);
SICON.gem = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8 9l4-6 4 6z"/></svg>';
const isGem = (p, s) => (p.t || 2) <= 2 && (!s.count || s.rating >= 4);
const gemScore = (p, s) => (s.count ? (s.rating - 3.5) * 2 + Math.min(s.count, 5) * 0.25 : 0) + (photoOf(p.id) ? 0.8 : 0) + (inSeason(p) ? 0.5 : 0) - Math.log10(1 + s.visits) * 0.9;
const results28 = results;
results = function () {
  if (S.sort !== 'gem') return results28();
  S.sort = 'visits'; const r = results28(); S.sort = 'gem';
  return r.filter(x => isGem(x.p, x.s)).map(x => ({ ...x, g: gemScore(x.p, x.s) })).sort((a, b) => b.g - a.g);
};

/* --- hazır rotalar --- */
function routesHTML() {
  return `<h1 class="xh">Hazır rotalar</h1><p class="note">Gün gün planlanmış rotalar. Beğendiğini tek dokunuşla gezi listene ekle, sonra en kısa sırayla gez.</p>
  ${ROUTES.map(r => { const n = r.days.flat().length; return `<details class="box route"><summary><span class="rti" aria-hidden="true">${r.icon}</span><span class="rtt"><b>${esc(r.t)}</b><span class="count"><span>${r.days.length} gün</span> · <span>${n} yer</span></span></span></summary>
    ${r.days.map((d, i) => `<p class="rday"><b><span>${i + 1}. gün</span></b></p><ul class="rlist">${d.map(id => { const p = byId(id); return p ? `<li><button class="linkbtn" data-a="rplace" data-v="${esc(id)}" translate="no">${esc(p.n)}</button> <span class="count">${esc(p.il)}</span></li>` : ''; }).join('')}</ul>`).join('')}
    <button class="btn pri" data-a="radd" data-v="${esc(r.id)}" style="margin-top:10px;width:100%">＋ <span>Gezi listeme ekle</span></button></details>`; }).join('')}`;
}
A.radd = v => {
  const r = ROUTES.find(x => x.id === v); if (!r) return;
  let n = 0; r.days.flat().forEach(id => { if (byId(id) && !TRIP.includes(id) && TRIP.length < 24) { TRIP.push(id); n++; } });
  tripSave(); track('act:route_add');
  toast(n ? tx('{1} yer gezi listene eklendi').replace('{1}', fmt(n)) : 'Bu yerler zaten gezi listende');
};
A.rplace = v => { if (byId(v)) { hideX(); select(v); } };

/* --- Türkçe cep sözlüğü --- */
function phrasesHTML() {
  const tr = (window.LANG || 'tr') === 'tr';
  return `<h1 class="xh">Türkçe cep sözlüğü</h1><p class="note">Gezerken işine yarayacak temel Türkçe ifadeler. Dokun, telefon Türkçe okusun.</p>
  ${PHRASES.map(([sec, list]) => `<h2 class="xh2"><span>${esc(sec)}</span></h2>${list.map(([t, pr]) => `<button class="box phr" data-a="phsay" data-k="ph:${esc(t)}" data-v="${esc(t)}" aria-pressed="false"><span class="pht"><b translate="no">${esc(t)}</b><i translate="no">${esc(pr)}</i>${tr ? '' : `<span class="phm" data-i18n-src="${esc(t)}">${esc(tx(t))}</span>`}</span><span class="spi" aria-hidden="true">🔊</span></button>`).join('')}`).join('')}
  ${SPEECH ? '' : '<p class="note">Bu tarayıcı sesli okumayı desteklemiyor.</p>'}`;
}
A.phsay = v => { speak(v, 'tr', 'ph:' + v); track('act:phrase'); };

const rx28 = renderX;
renderX = function () {
  if (XV && (XV.kind === 'routes' || XV.kind === 'phrases')) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>Tüm yerler</span></button>`;
    $('xbody').innerHTML = back + (XV.kind === 'routes' ? routesHTML() : phrasesHTML());
    if (XV.kind === 'phrases') syncSpeak();
    return;
  }
  rx28();
};
$('acctmenu').querySelector('[data-a="mjournal"]').insertAdjacentHTML('afterend', `<button role="menuitem" data-a="mroutes"><span class="emi" aria-hidden="true">🗺</span><span>Hazır rotalar</span></button><button role="menuitem" data-a="mphrases"><span class="emi" aria-hidden="true">💬</span><span>Türkçe cep sözlüğü</span></button>`);
Object.assign(A, {
  mroutes: () => { toggleMenu(false); showX('routes'); },
  mphrases: () => { toggleMenu(false); showX('phrases'); },
});
