/* ===== aşama 6: Müzekart bilgisi ve erişilebilirlik (ziyaretçi işaretlemesi) ===== */
const MUZE_CATS = new Set(['muze', 'antik', 'saray']);
const ACC = [[2, '♿', 'Erişilebilir'], [1, '◐', 'Kısmen'], [0, '✕', 'Erişilemez']];
const ACCD = {};
function museumHTML(p) {
  if (!MUZE_CATS.has(p.c)) return '';
  return `<div class="box"><b>🎟 <span>Giriş ücreti ve Müzekart</span></b><p class="note">Kültür ve Turizm Bakanlığına bağlı müze ve ören yerlerinin çoğuna Müzekart ile girilir. Bazı saraylar, belediye ve özel müzeler Müzekart kabul etmez.</p><p class="note">Ücretler yılda birkaç kez değişebilir; gitmeden önce güncel ücreti resmi siteden kontrol et.</p><a href="https://muze.gov.tr" target="_blank" rel="noopener">muze.gov.tr ↗</a></div>`;
}
function accessHTML(p) {
  const rows = ACCD[p.id]; if (!rows) return '';
  const mine = ME ? (rows.find(r => r.user_id === ME.id) || {}).val : undefined;
  const cnt = [0, 1, 2].map(v => rows.filter(r => r.val === v).length);
  const top = rows.length ? [2, 1, 0].reduce((a, v) => (cnt[v] > cnt[a] ? v : a), 2) : -1;
  const sum = top < 0 ? '<span>Henüz bilgi yok. Gittiysen tekerlekli sandalye ve bebek arabasıyla gezilebiliyor mu, işaretle.</span>'
    : `<span>${ACC.find(a => a[0] === top)[2]}</span> · <span>${rows.length} ziyaretçiye göre</span>`;
  return `<b>♿ <span>Erişilebilirlik</span></b><p class="note">${sum}</p>${ME ? `<div class="accrow">${ACC.map(([v, ic, l]) => `<button class="chip${mine === v ? ' on' : ''}" data-a="accv" data-v="${v}" aria-pressed="${mine === v}">${ic} <span>${l}</span>${cnt[v] ? ` (${cnt[v]})` : ''}</button>`).join('')}</div>` : ''}<p class="note" style="margin:6px 0 0">Ziyaretçilerin bildirdiği bilgidir; rampa, asansör ve uygun tuvalet için gitmeden önce yeri arayıp sor.</p>`;
}
async function loadAccess(id) {
  const { data } = await sb.from('place_access').select('val,user_id').eq('place_id', id).limit(500);
  ACCD[id] = data || [];
  const b = $('accbox'); if (b && S.sel === id) { const p = byId(id); if (p) b.innerHTML = accessHTML(p); }
}
const rd26 = renderDetail;
renderDetail = function () {
  rd26();
  if (S.tab !== 'ov' || !S.sel) return;
  const p = byId(S.sel); if (!p) return;
  const at = $('detail').querySelector('.season') || $('detail').querySelector('.dishes');
  const mh = museumHTML(p);
  if (mh) { if (at) at.insertAdjacentHTML('afterend', mh); else $('detail').insertAdjacentHTML('beforeend', mh); }
  if (!ONLINE()) return;
  const box = document.createElement('div'); box.className = 'box'; box.id = 'accbox'; box.innerHTML = accessHTML(p);
  const fb = $('foodbox'); if (fb) fb.before(box); else $('detail').appendChild(box);
  if (!ACCD[p.id]) loadAccess(p.id).catch(() => { const b = $('accbox'); if (b) b.remove(); });
};
A.accv = async v => {
  const id = S.sel, val = +v; if (!ME || !id || !needOnline()) return;
  const mine = ((ACCD[id] || []).find(r => r.user_id === ME.id) || {}).val;
  const { error } = mine === val ? await sb.from('place_access').delete().eq('place_id', id).eq('user_id', ME.id)
    : await sb.from('place_access').upsert({ place_id: id, user_id: ME.id, val });
  if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
  track('act:access'); loadAccess(id);
};
