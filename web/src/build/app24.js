/* ===== aşama 4: yakında ne yenir (OpenStreetMap; sunucu işlevi "food" 30 gün saklar) ===== */
const CUISINE = { turkish: 'Türk mutfağı', kebab: 'Kebap', regional: 'Yöresel', fish: 'Balık', seafood: 'Balık', pizza: 'Pizza', burger: 'Burger', coffee_shop: 'Kahve', breakfast: 'Kahvaltı', pide: 'Pide', dessert: 'Tatlı', ice_cream: 'Dondurma', italian: 'İtalyan', chinese: 'Çin mutfağı', vegetarian: 'Vejetaryen', vegan: 'Vegan', meat: 'Et', steak_house: 'Et', sandwich: 'Sandviç', bakery: 'Fırın', tea: 'Çay', international: 'Dünya mutfağı' };
const FKIND = { restaurant: 'Restoran', cafe: 'Kafe', fast_food: 'Hızlı yemek' };
const FOOD = {};
function foodHTML(p, items) {
  const local = (DISHES[p.il] || []).map(([tr]) => fold(tr).split(' ')[0]).filter(w => w.length >= 4);
  return `<b>🍽 <span>Yakında ne yenir</span></b><ul class="food">${items.slice(0, 8).map(f => {
    const tags = String(f.c || '').split(';').map(x => CUISINE[x.trim()]).filter(Boolean);
    const isLocal = local.some(w => fold(f.n + ' ' + f.c).includes(w)) || String(f.c).includes('regional');
    return `<li><a href="https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=19/${f.lat}/${f.lng}" target="_blank" rel="noopener"><span class="fn"><b translate="no">${esc(f.n)}</b><span class="count">${[FKIND[f.k] || 'Restoran', ...tags].map(x => `<span>${x}</span>`).join(' · ')}</span></span>${isLocal ? '<span class="sbadge loc">Yöresel</span>' : ''}<span class="count">${f.d < 1000 ? fmt(f.d) + ' m' : fmt(+(f.d / 1000).toFixed(1)) + ' km'}</span></a></li>`;
  }).join('')}</ul><p class="note" style="margin:6px 0 0">Kaynak: OpenStreetMap katkıcıları. Açılış saatlerini gitmeden önce kontrol et.</p>`;
}
const rd24 = renderDetail;
renderDetail = function () {
  rd24();
  if (S.tab !== 'ov' || !S.sel || !ONLINE()) return;
  const p = byId(S.sel); if (!p) return;
  const at = $('detail').querySelector('.dishes') || $('detail').querySelector('.season');
  const box = document.createElement('div'); box.className = 'box foodbox'; box.id = 'foodbox';
  if (FOOD[p.id]) { if (!FOOD[p.id].length) return; box.innerHTML = foodHTML(p, FOOD[p.id]); }
  else box.innerHTML = '<b>🍽 <span>Yakında ne yenir</span></b><p class="note">Yükleniyor…</p>';
  if (at) at.after(box); else $('detail').appendChild(box);
  if (FOOD[p.id]) return;
  const id = p.id;
  sb.functions.invoke('food', { body: { place_id: id } }).then(({ data, error }) => {
    const items = !error && data && Array.isArray(data.items) ? data.items : [];
    FOOD[id] = items; const b = $('foodbox'); if (!b || S.sel !== id) return;
    if (!items.length) b.remove(); else b.innerHTML = foodHTML(p, items);
  }).catch(() => { const b = $('foodbox'); if (b) b.remove(); });
};
