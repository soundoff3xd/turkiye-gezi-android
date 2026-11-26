/* ===== aşama 4: hava durumuna göre öneri (uygulamadaki src/lib/weatherpick.ts ile aynı kurallar) ===== */
const WX_TEXT = {
  rain: 'Bugün yağmur var: kapalı mekânları öneriyoruz', snow: 'Kar yağıyor: müzeler, kaplıcalar ve kayak merkezleri',
  hot: 'Hava çok sıcak: deniz, göl, mağara ve serin yerler', cold: 'Hava soğuk: müzeler, çarşılar ve kaplıcalar',
  nice: 'Hava gezmeye çok uygun: açık havada gezilecek yerler',
};
const WX_CATS = {
  rain: ['muze', 'saray', 'cami', 'kilise', 'carsi', 'yapi', 'magara'], snow: ['muze', 'kaplica', 'saray', 'cami', 'carsi'],
  hot: ['plaj', 'ada', 'sahil', 'gol', 'selale', 'magara', 'kanyon'], cold: ['muze', 'carsi', 'kaplica', 'saray', 'cami', 'kilise'],
  nice: ['park', 'kanyon', 'selale', 'gol', 'dag', 'antik', 'kale', 'seyir', 'olusum', 'kasaba', 'mahalle', 'cadde', 'ada', 'sahil', 'plaj', 'kule'],
};
function wxMode(c, t) {
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
  if (t >= 32) return 'hot'; if (t <= 5) return 'cold'; return 'nice';
}
function wxPicks(pos, mode, n = 8) {
  const want = new Set(WX_CATS[mode]);
  const ok = p => (want.has(p.c) || (mode === 'snow' && /Kayak Merkezi|^(Uludağ|Erciyes Dağı|Palandöken|Sarıkamış)$/.test(p.n))) && (mode !== 'nice' || !['plaj', 'ada', 'sahil'].includes(p.c) || inSeason(p)) && !((mode === 'rain' || mode === 'cold' || mode === 'snow') && /Köprü|Su Kemeri|Kanalı/.test(p.n));
  const near = r => PLACES.map(p => ({ p, km: meters(pos.lat, pos.lng, p.lat, p.lng) / 1000 })).filter(x => x.km <= r && ok(x.p));
  let l = near(40); if (l.length < 4) l = near(120);
  const sc = x => pweight(x.p) / (1 + x.km / 15);
  return l.sort((a, b) => sc(b) - sc(a)).slice(0, n);
}
$('rows').insertAdjacentHTML('beforebegin', '<div id="wxpick"></div>');
let wxKey = '';
async function renderWxPick() {
  const box = $('wxpick'); if (!box) return;
  if (!MEPOS) { box.innerHTML = '<button class="box wxask" data-a="wxloc"><span aria-hidden="true">🌤</span> <span>Konumuna göre bugünün önerileri</span> <span aria-hidden="true" class="count">›</span></button>'; return; }
  const k = MEPOS.lat.toFixed(2) + ',' + MEPOS.lng.toFixed(2) + (window.LANG || 'tr'); if (k === wxKey && box.innerHTML) return; wxKey = k;
  try {
    const w = await getWeather({ lat: MEPOS.lat, lng: MEPOS.lng }), mode = wxMode(w.now.c, w.now.t), list = wxPicks(MEPOS, mode);
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="box wxbox"><b><span aria-hidden="true">${wmo(w.now.c)[0]}</span> ${fmt(Math.round(w.now.t))}° · <span>Bugün için öneriler</span></b>
      <div style="font-weight:700;margin-top:2px">${WX_TEXT[mode]}</div>
      <div class="wxrow">${list.map(({ p, km }) => { const ph = photoOf(p.id);
        return `<button class="wxp" data-a="pick" data-v="${p.id}">${ph ? `<img src="${esc(ph.url(250))}" alt="" loading="lazy">` : `<span class="wxi">${catMarker(MKI.glyphs[p.c] || MKI.glyphs.seyir, MKI.colors[p.g] || '#888', 30)}</span>`}<b translate="no">${esc(p.n)}</b><span class="count">${fmt(Math.max(1, Math.round(km)))} km</span></button>`; }).join('')}</div></div>`;
  } catch (_) { box.innerHTML = ''; }
}
const rl23 = renderList; renderList = function () { rl23(); renderWxPick(); };
Object.assign(A, { wxloc: async () => { try { await locate(); } catch (_) { } wxKey = ''; renderWxPick(); } });
