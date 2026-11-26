/* ---------- ilk açılış: dil ve ilgi alanları, "Senin için" kategorisi ----------
   Siteye ilk kez gelen kişiye önce dil, sonra "Nelerden hoşlanırsın?" sorulur (ikisi de atlanabilir).
   Fotoğraf çekmeyi seven fotoğraf vitriniyle, diğerleri "Senin için" kategorisiyle başlar. */
const INTERESTS = [
  ['kultur', 'Tarih ve kültür'], ['doga', 'Doğa'], ['deniz', 'Deniz ve kıyı'],
  ['sehir', 'Şehir ve kasaba'], ['manzara', 'Manzara'], ['foto', 'Fotoğraf çekmek']
];
const ONB_ICON = Object.assign({}, GICON, {
  foto: GI('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/>'),
  foryou: GI('<path d="M12 3.5l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6L12 15.8l-4.9 2.9 1.2-5.6L4 9.3l5.7-.6z"/>')
});
GICON.foryou = ONB_ICON.foryou;
const prefs = {
  get done() { try { return localStorage.getItem('gezi-onboarded') === '1'; } catch (_) { return true; } },
  set done(v) { try { localStorage.setItem('gezi-onboarded', v ? '1' : ''); } catch (_) { } },
  get interests() { try { const x = JSON.parse(localStorage.getItem('gezi-interests') || '[]'); return Array.isArray(x) ? x : []; } catch (_) { return []; } },
  set interests(v) { try { localStorage.setItem('gezi-interests', JSON.stringify(v)); } catch (_) { } },
  get start() { try { return localStorage.getItem('gezi-start') || ''; } catch (_) { return ''; } },
  set start(v) { try { v ? localStorage.setItem('gezi-start', v) : localStorage.removeItem('gezi-start'); } catch (_) { } }
};
/* "Senin için" listesine giren gruplar; fotoğraf sevenlere manzara noktaları da önerilir */
function forYou() {
  const xs = prefs.interests, g = new Set(xs.filter(k => k !== 'foto'));
  if (xs.includes('foto')) g.add('manzara');
  return g;
}

/* pencere */
const odl = $('onb');
const ONB = { step: 0, picked: [], mode: 'first' };
function renderOnb() {
  const first = ONB.mode === 'first', s = ONB.step;
  odl.classList.toggle('gate', first);
  $('onbdots').hidden = !first;
  document.querySelectorAll('#onbdots i').forEach((d, i) => d.classList.toggle('on', i === s));
  $('onbskip').hidden = !first; $('onbx').hidden = first;
  $('onbs0').hidden = s !== 0; $('onbs1').hidden = s !== 1;
  $('onblangs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button type="button" class="olang" data-a="onblang" data-v="${k}" aria-pressed="${window.LANG === k}" lang="${k}">${v}</button>`).join('');
  $('onbints').innerHTML = INTERESTS.map(([k, l]) => `<button type="button" class="oint" data-a="onbint" data-v="${k}" aria-pressed="${ONB.picked.includes(k)}"><span class="gi">${ONB_ICON[k]}</span><span>${esc(l)}</span></button>`).join('');
  $('onbfine').textContent = first ? 'Bunu daha sonra hesap menüsündeki “İlgi alanlarım” bölümünden değiştirebilirsin.' : 'Seçtiklerin “Senin için” kategorisinde listelenir.';
  $('onbback').hidden = !(first && s === 1);
  $('onbgo').textContent = !first ? 'Kaydet' : s === 0 ? 'Devam' : ONB.picked.length ? 'Başla' : 'Seçmeden devam et';
}
function openOnb(mode) {
  ONB.mode = mode || 'first'; ONB.step = ONB.mode === 'first' ? 0 : 1; ONB.picked = prefs.interests.slice();
  renderOnb();
  if (!odl.open) odl.showModal ? odl.showModal() : odl.setAttribute('open', '');
  setTimeout(() => { const f = odl.querySelector(ONB.step === 0 ? '.olang[aria-pressed="true"]' : '.oint'); f && f.focus(); }, 50);
}
function closeOnb() { odl.classList.remove('gate'); odl.close ? odl.close() : odl.removeAttribute('open'); }
odl.addEventListener('cancel', e => { if (ONB.mode === 'first') e.preventDefault(); });

/* ilk açılış bitince: hesap yoksa giriş/üyelik penceresi, varsa seçilen ekranla başla */
function finishOnb(xs) {
  prefs.interests = xs; prefs.done = true;
  prefs.start = xs.includes('foto') ? 'photos' : xs.length ? 'foryou' : '';
  closeOnb(); renderChips(); renderList();
  if (!CUR) baseGate(); else applyStart();
}
function applyStart() {
  const st = prefs.start; if (!st) return;
  prefs.start = '';
  if (st === 'photos') showPhotos(true);
  else if (forYou().size) { S.cat = 'foryou'; S.sub = 'all'; renderChips(); renderList(); fitResults(); }
}

/* giriş kapısından önce ilk açılış penceresi */
const baseGate = gate;
gate = function () { if (!prefs.done) { openOnb('first'); return; } baseGate(); };
const baseRefresh14 = refreshAll;
refreshAll = function () { baseRefresh14(); if (CUR && prefs.done && prefs.start) setTimeout(applyStart, 0); };

/* "Senin için" filtresi ve kutucuğu */
const baseMatch14 = matchPlace;
matchPlace = function (p, q, ignoreSub) {
  if (S.cat !== 'foryou') return baseMatch14(p, q, ignoreSub);
  S.cat = 'all';
  try { return baseMatch14(p, q, true) && forYou().has(p.g); } finally { S.cat = 'foryou'; }
};
const baseChips14 = renderChips;
renderChips = function () {
  const fy = forYou();
  if (S.cat === 'foryou' && !fy.size) S.cat = 'all';
  baseChips14();
  if (!fy.size) return;
  const c = S.cat; S.cat = 'all';
  const q = fold(S.q.trim()), n = PLACES.filter(p => baseMatch14(p, q, true) && fy.has(p.g)).length;
  S.cat = c;
  $('cats').insertAdjacentHTML('afterbegin', `<button class="gt fy" data-a="cat" data-v="foryou" aria-pressed="${S.cat === 'foryou'}"><span class="gi">${GICON.foryou}</span><span class="gl">Senin için</span><span class="gn">${n}</span></button>`);
};

Object.assign(A, {
  onblang: v => { setLang(v); renderOnb(); const b = odl.querySelector(`.olang[data-v="${v}"]`); b && b.focus(); },
  onbint: v => { ONB.picked = ONB.picked.includes(v) ? ONB.picked.filter(x => x !== v) : [...ONB.picked, v]; renderOnb(); const b = odl.querySelector(`.oint[data-v="${v}"]`); b && b.focus(); },
  onbgo: () => {
    if (ONB.mode !== 'first') { prefs.interests = ONB.picked; closeOnb(); renderChips(); renderList(); toast('İlgi alanların kaydedildi'); return; }
    if (ONB.step === 0) { ONB.step = 1; renderOnb(); return; }
    finishOnb(ONB.picked);
  },
  onbback: () => { ONB.step = 0; renderOnb(); },
  onbskip: () => { if (ONB.step === 0) { ONB.step = 1; renderOnb(); } else finishOnb([]); },
  onbx: () => closeOnb(),
  minterests: () => { toggleMenu(false); openOnb('edit'); }
});

/* ilk ziyaret: (giriş yapmış olsa bile) bir kez sor */
if (!prefs.done) setTimeout(() => {
  if (adlg.open) { adlg.classList.remove('gate'); adlg.close ? adlg.close() : adlg.removeAttribute('open'); }
  if (!prefs.done) openOnb('first');
}, 0);
