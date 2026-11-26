/* ---------- hesap sistemi (prototip: hesaplar bu tarayıcıda saklanır) ---------- */
const LEVELS = [[0, 'Yeni gezgin'], [10, 'Gezgin'], [30, 'Deneyimli gezgin'], [60, 'Güvenilir rehber']];
let CUR = null, AFTER = null;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } }
};
const accounts = () => store.get('gezi-accounts', {});
async function hash(pw, salt) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (_) { let h = 0; for (const c of salt + pw) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}
function points(u) {
  const mine = S.posts.filter(p => p.uid === u.email).length;
  const ok = S.sugg.filter(g => g.uid === u.email && status(g) === 'ok').length;
  return S.visited.size + mine * 3 + ok * 10;
}
function level(u) {
  const p = points(u); let i = 0;
  LEVELS.forEach((l, j) => { if (p >= l[0]) i = j; });
  return { i, name: LEVELS[i][1], p, next: LEVELS[i + 1] };
}
function persist() {
  if (!CUR) return;
  const all = accounts(), a = all[CUR.email]; if (!a) return;
  a.visited = [...S.visited]; a.faved = [...S.faved];
  a.posts = S.posts.filter(p => p.uid === CUR.email).map(p => ({ id: p.id, pid: p.pid, rating: p.rating, text: p.text, at: p.at || Date.now() }));
  all[CUR.email] = a; store.set('gezi-accounts', all);
}
function loadUser(a) {
  CUR = { name: a.name, email: a.email, created: a.created, av: a.avatar || null };
  if (a.avatar) AV[a.email] = a.avatar;
  S.visited = new Set(a.visited || []); S.faved = new Set(a.faved || []);
  S.posts = S.posts.filter(p => p.sample || p.uid === a.email);
  (a.posts || []).forEach(p => { if (!S.posts.some(x => x.id === p.id)) S.posts.push({ ...p, author: a.name, uid: a.email, media: null, likes: 0, replies: [], ago: new Date(p.at).toLocaleDateString(), sample: false }); });
  store.set('gezi-session', a.email);
  refreshAll();
}
function logout() {
  persist(); CUR = null;
  S.visited = new Set(); S.faved = new Set(); S.posts = S.posts.filter(p => p.sample);
  store.set('gezi-session', null);
  showProfile(false); refreshAll(); toast('Çıkış yapıldı'); gate();
}
function refreshAll() {
  renderAcct(); renderList(); renderPending();
  if (S.sel) renderDetail();
  if (!$('profv').hidden) renderProfile();
}
function renderAcct() {
  const b = $('acct');
  b.innerHTML = CUR ? (CUR.av ? `<img src="${esc(CUR.av)}" alt="">` : `<span>${esc(CUR.name[0].toUpperCase())}</span>`) : '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  b.setAttribute('aria-label', CUR ? 'Profilim' : 'Giriş yap veya üye ol');
  b.classList.toggle('in', !!CUR);
}
function requireAuth(fn, why) {
  if (CUR) return fn();
  AFTER = fn; openAuth('in', why || 'Devam etmek için giriş yap veya üye ol.');
}

/* giriş / üye ol penceresi */
const adlg = $('auth');
let AMODE = 'in';
function openAuth(mode, why) {
  const g = !CUR && !why && GATE; adlg.classList.toggle('gate', g); $('welcome').hidden = !g;
  AMODE = mode; $('aerr').textContent = ''; $('awhy').textContent = why || '';
  $('awhy').hidden = !why; renderAuth();
  adlg.showModal ? adlg.showModal() : adlg.setAttribute('open', '');
  setTimeout(() => (mode === 'up' ? $('aname') : $('aemail')).focus(), 50);
}
function renderAuth() {
  document.querySelectorAll('#auth [data-a="amode"]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === AMODE)));
  $('anamebox').hidden = AMODE !== 'up';
  $('ago').textContent = AMODE === 'up' ? 'Üye ol' : 'Giriş yap';
  $('apass').setAttribute('autocomplete', AMODE === 'up' ? 'new-password' : 'current-password');
}
let GATE = true;
const closeAuth = () => { if (!CUR) return; adlg.classList.remove('gate'); adlg.close ? adlg.close() : adlg.removeAttribute('open'); };
function gate() { AFTER = null; S.sel = null; openAuth('up'); }
adlg.addEventListener('cancel', e => { if (!CUR) e.preventDefault(); });
adlg.addEventListener('close', () => { if (!CUR) setTimeout(gate, 0); });
$('aform').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('aemail').value.trim().toLowerCase(), pw = $('apass').value, name = $('aname').value.trim();
  const err = m => { $('aerr').textContent = m; };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err('Geçerli bir e-posta adresi gir.');
  if (pw.length < 8) return err('Şifre en az 8 karakter olmalı.');
  const all = accounts();
  if (AMODE === 'up') {
    if (name.length < 2 || name.length > 30) return err('Adın 2 ile 30 karakter arasında olmalı.');
    if (BAD.some(w => fold(name).includes(fold(w)))) return err('Bu ad kullanılamaz.');
    if (all[email]) return err('Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.');
    const salt = Math.random().toString(36).slice(2);
    all[email] = { name, email, salt, hash: await hash(pw, salt), created: Date.now(), visited: [...S.visited], faved: [...S.faved], posts: [] };
    store.set('gezi-accounts', all);
    loadUser(all[email]); toast('Hesabın oluşturuldu, hoş geldin ' + name);
  } else {
    const a = all[email];
    if (!a || a.hash !== await hash(pw, a.salt)) return err('E-posta veya şifre hatalı.');
    loadUser(a); toast('Tekrar hoş geldin ' + a.name);
  }
  $('aform').reset(); closeAuth();
  if (AFTER) { const f = AFTER; AFTER = null; f(); }
});
async function demoLogin() {
  const all = accounts(), email = 'demo@gezirehberi.app';
  if (!all[email]) {
    const salt = 'demo';
    all[email] = { name: 'Demo Gezgin', email, salt, hash: await hash('demo-sifre', salt), created: Date.now() - 86400000 * 120, visited: ['ayasofya', 'galatakulesi', 'kapalicarsi', 'goreme', 'pamukkale', 'efes', 'anitkabir', 'sumela', 'kaleici', 'mardin', 'nemrutdagi', 'safranbolu'], faved: ['goreme', 'pamukkale', 'kaleici'], posts: [{ id: 'd1', pid: 'efes', rating: 5, text: 'Sabah açılışta gittik, Celsus Kütüphanesi önünde neredeyse kimse yoktu.', at: Date.now() - 86400000 * 20 }] };
    store.set('gezi-accounts', all);
  }
  loadUser(all[email]); closeAuth(); toast('Demo hesabıyla giriş yapıldı');
  if (AFTER) { const f = AFTER; AFTER = null; f(); }
}

/* profil */
function showProfile(on) {
  $('profv').hidden = !on;
  $('listv').hidden = on || !!S.sel; $('detailv').hidden = on || !S.sel; $('pendv').hidden = true;
  if (on) { S.sel = null; S.collapsed = false; renderProfile(); $('prof').scrollTop = 0; }
  setSheet(); draw();
}
S.ptab = 'visited';
function renderProfile() {
  if (!CUR) return;
  const lv = level(CUR), mine = S.posts.filter(p => p.uid === CUR.email), sug = S.sugg.filter(g => g.uid === CUR.email);
  const pct = lv.next ? Math.round((lv.p - LEVELS[lv.i][0]) / (lv.next[0] - LEVELS[lv.i][0]) * 100) : 100;
  const placeRow = id => { const p = byId(id); return p ? `<li><button class="row" data-a="pick" data-v="${p.id}"><span class="rb"><span class="rn">${esc(p.n)}</span><span class="rm">${esc(p.il)} · ${CATS[p.c]}</span></span></button></li>` : ''; };
  const tabs = [['visited', 'Gittiklerim', S.visited.size], ['faved', 'Favorilerim', S.faved.size], ['posts', 'Yorumlarım', mine.length], ['sugg', 'Önerilerim', sug.length]];
  let body;
  if (S.ptab === 'visited') body = S.visited.size ? `<ol class="rows">${[...S.visited].map(placeRow).join('')}</ol>` : '<p class="note">Bir yerin kartındaki “Gittim mi?” düğmesiyle gittiğin yerleri işaretle.</p>';
  else if (S.ptab === 'faved') body = S.faved.size ? `<ol class="rows">${[...S.faved].map(placeRow).join('')}</ol>` : '<p class="note">Beğendiğin yerleri “Favori” düğmesiyle kaydet.</p>';
  else if (S.ptab === 'posts') body = mine.length ? mine.map(x => `<button class="card" style="display:block;width:100%;text-align:left" data-a="pick" data-v="${x.pid}"><b>${esc((byId(x.pid) || {}).n || '')}</b><div style="margin-top:4px">${stars(x.rating, '5 üzerinden ' + x.rating + ' puan')}</div>${x.text ? `<p style="margin:6px 0 0">${esc(x.text)}</p>` : ''}</button>`).join('') : '<p class="note">Henüz yorum yazmadın.</p>';
  else body = sug.length ? sug.map(g => `<div class="card"><b>${esc(g.n)}</b><div class="count">${esc(g.il)}</div><div class="stbar"><span class="st-${status(g)}">${STATUS_TXT[status(g)]}</span><span class="count">${g.ok}/${NEED} onay</span></div></div>`).join('') : '<p class="note">Uygulamada olmayan bir yeri “Yer öner” ile ekleyebilirsin.</p>';
  $('prof').innerHTML = `<button class="back" data-a="profback">${ICON.back}Tüm yerler</button>
    <div class="ph-head"><button class="bigav" data-a="avpick" aria-label="${CUR.av ? 'Profil fotoğrafını değiştir' : 'Profil fotoğrafı ekle'}">${CUR.av ? `<img src="${esc(CUR.av)}" alt="">` : `<span>${esc(CUR.name[0].toUpperCase())}</span>`}<i class="cam" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></i></button><div style="min-width:0"><h2 style="font-size:22px">${esc(CUR.name)}</h2><div class="count" style="overflow-wrap:anywhere">${esc(CUR.email)}</div><div class="count">Üyelik: ${new Date(CUR.created).toLocaleDateString()}</div><div class="avacts"><button class="lnk" data-a="avpick">${CUR.av ? 'Fotoğrafı değiştir' : 'Profil fotoğrafı ekle'}</button>${CUR.av ? '<button class="lnk" data-a="avdel">Kaldır</button>' : ''}</div></div></div>
    <div class="box"><b>Gezgin seviyesi</b><div class="lvl"><span>${lv.name}</span><span class="count">${lv.p} puan</span></div>
      <div class="prog" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <p class="note" style="margin-top:6px">${lv.next ? `<span>Sonraki seviye:</span> <strong>${lv.next[1]}</strong> · <span>${lv.next[0]} puan</span>` : '<span>En üst seviyedesin.</span>'}<br><span>Puanlar: gidilen yer 1, yorum 3, onaylanan öneri 10. Güvenilir rehberlerin onayı 2 oy sayılır.</span></p></div>
    <div class="tabs scrollx" role="tablist">${tabs.map(([k, l, n]) => `<button class="tab" role="tab" data-a="ptab" data-v="${k}" aria-selected="${S.ptab === k}">${l} (${n})</button>`).join('')}</div>
    <div style="margin-top:8px">${body}</div>
    <div class="acts" style="margin-top:20px"><button class="btn" data-a="logout">Çıkış yap</button><button class="btn" data-a="delacct">Hesabı sil</button></div>
    <div id="delconf" hidden class="box"><b>Hesabın ve bu tarayıcıdaki tüm verilerin silinsin mi?</b><div class="acts"><button class="btn pri" data-a="delyes">Evet, sil</button><button class="btn" data-a="delno">Vazgeç</button></div></div>
    <p class="note">Prototip: hesaplar yalnızca bu tarayıcıda saklanır, başka cihazdan görünmez. Gerçek uygulamada hesaplar sunucuda tutulur ve e-posta doğrulaması yapılır.</p>`;
}

/* mevcut işlemleri girişe bağla, yazar adını hesap adından al */
['visit', 'fav', 'compose', 'like', 'send', 'sugg', 'vok', 'vbad'].forEach(k => {
  const f = A[k]; A[k] = v => requireAuth(() => { f(v); persist(); if (!$('profv').hidden) renderProfile(); });
});
$('cform').addEventListener('submit', () => {
  const p = S.posts[0];
  if (CUR && p && !p.sample && !p.uid) { p.uid = CUR.email; p.author = CUR.name; p.at = Date.now(); renderDetail(); persist(); }
});
$('sform').addEventListener('submit', () => {
  const g = S.sugg[0];
  if (CUR && g && g.own && !g.uid) { g.uid = CUR.email; g.by = CUR.name; renderPending(); }
});
const baseVok = A.vok;
A.vok = v => requireAuth(() => {
  const g = S.sugg.find(x => x.id === v);
  if (CUR && level(CUR).i >= 3 && g && !S.myVotes[v]) g.ok++;
  baseVok(v);
});
Object.assign(A, {
  acct: () => CUR ? showProfile(true) : openAuth('in'),
  amode: v => { AMODE = v; $('aerr').textContent = ''; renderAuth(); },
  aclose: () => { AFTER = null; if (CUR) closeAuth(); },
  demo: demoLogin,
  profback: () => { showProfile(false); renderList(); },
  ptab: v => { S.ptab = v; renderProfile(); },
  logout,
  delacct: () => { $('delconf').hidden = false; },
  delno: () => { $('delconf').hidden = true; },
  delyes: () => { const all = accounts(); delete all[CUR.email]; store.set('gezi-accounts', all); CUR = null; logout(); toast('Hesabın silindi'); }
});
const baseShowView = showView;
showView = function () { $('profv').hidden = true; baseShowView(); };
const baseShowPending = showPending;
showPending = function (on) { $('profv').hidden = true; baseShowPending(on); };
(function () {
  const em = store.get('gezi-session', null), a = em && accounts()[em];
  if (a) loadUser(a); else { renderAcct(); gate(); }
})();
