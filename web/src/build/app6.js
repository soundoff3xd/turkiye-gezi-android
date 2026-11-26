/* ---------- fotoğraf beğenisi ve fotoğraf vitrini ---------- */
const SAMPLE_PHOTOS = [
  ['goreme', 'Can', 'Gün doğumunda balonlar', 342, 'balloon'], ['pamukkale', 'Ayşe', 'Travertenlerde gün batımı', 289],
  ['galatakulesi', 'Zeynep', 'Galata’dan Haliç', 254], ['oludeniz', 'Deniz', 'Babadağ’dan lagün', 231],
  ['sumela', 'Mert', 'Sisli vadide manastır', 198], ['nemrutdagi', 'Elif', 'Gün doğumunda heykel başları', 187, 'doga'],
  ['ayasofya', 'James', 'Kubbenin altında', 165], ['uzungol', 'Selin', 'Sonbaharda göl', 152],
  ['mardin', 'Ahmet', 'Mezopotamya’ya bakış', 141], ['kizkulesi', 'Marta', 'Akşam ışıkları', 133],
  ['salda', 'Can', 'Turkuaz kıyı', 120], ['efes', 'Alex', 'Celsus Kütüphanesi', 112],
  ['uchisar', 'Ayşe', 'Peri bacaları arasında', 97, 'chimney'], ['kas', 'Deniz', 'Limanda akşam', 84]
];
S.photos = SAMPLE_PHOTOS.map((p, i) => ({ id: 'ph' + i, pid: p[0], by: p[1], cap: p[2], likes: p[3], k: p[4], at: Date.now() - (i * 7 + 3) * 3600e3 * 5, sample: true }));
S.plikes = new Set(); S.pmode = 'places'; S.psort = 'top';
function allPhotos() {
  const fromPosts = S.posts.filter(p => p.media && p.media.kind === 'photo' && p.media.url)
    .map(p => ({ id: 'pp' + p.id, pid: p.pid, by: p.author, cap: (p.text || '').slice(0, 60), likes: 0, url: p.media.url, at: p.at || Date.now() }));
  return S.photos.concat(fromPosts).filter(ph => byId(ph.pid));
}
const pLikes = ph => ph.likes + (S.plikes.has(ph.id) ? 1 : 0);

/* örnek fotoğraflar için kategoriye göre çizilmiş sahne */
function scene(ph) {
  const p = byId(ph.pid), k = ph.k || (p ? ({ deniz: 'deniz', doga: 'doga', kultur: 'tarih', sehir: 'sehir', manzara: 'manzara' })[p.g] : 'manzara');
  let h = 0; for (const c of ph.id + ph.pid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = n => ((h = (h * 1103515245 + 12345) >>> 0) % 1000) / 1000 * n;
  const skies = [['#F6B26B', '#F9E0B7'], ['#6FA8DC', '#CFE2F3'], ['#E06666', '#F4CCCC'], ['#8E7CC3', '#F9CB9C'], ['#3D85C6', '#FFE599']];
  const [s1, s2] = skies[Math.floor(r(5))];
  const sunX = 20 + r(60), sunY = 18 + r(18);
  let land = '';
  if (k === 'balloon' || k === 'chimney') land = `<path d="M0 100 V78 L8 60 L14 78 L22 56 L30 80 L40 64 L48 82 L60 58 L68 80 L78 62 L88 82 L96 66 L100 74 V100Z" fill="#C98F5A"/><rect y="88" width="100" height="12" fill="#8F6440"/>` + (k === 'balloon' ? [[22, 30, '#D9534F'], [52, 18, '#F0AD4E'], [76, 36, '#5B9BD5'], [38, 44, '#9B59B6']].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="6" fill="${c}"/><rect x="${x - 1.5}" y="${y + 7}" width="3" height="2.5" fill="#5A3A22"/>`).join('') : '');
  else if (k === 'deniz') land = `<path d="M0 62 Q25 ${50 + r(6)} 50 58 T100 54 V100 H0Z" fill="#5B7F4E"/><rect y="66" width="100" height="34" fill="#2E8FB5"/><path d="M0 72 H100" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>`;
  else if (k === 'doga') land = `<path d="M0 70 L${20 + r(10)} ${38 + r(8)} L45 66 L${62 + r(10)} ${30 + r(10)} L100 68 V100 H0Z" fill="#4E6B57"/><path d="M0 80 Q50 70 100 82 V100 H0Z" fill="#6E8B5A"/>`;
  else if (k === 'tarih' || k === 'muze') land = `<rect y="78" width="100" height="22" fill="#5E5047"/><path d="M30 78 V62 Q50 ${40 + r(6)} 70 62 V78Z" fill="#3E342E"/><rect x="${18 + r(4)}" y="44" width="3" height="34" fill="#3E342E"/><rect x="${78 + r(4)}" y="48" width="3" height="30" fill="#3E342E"/>`;
  else land = `<path d="M0 74 ${Array.from({ length: 10 }, (_, i) => `H${i * 10} V${60 + r(14)} H${i * 10 + 10}`).join(' ')} V100 H0Z" fill="#3E3A4F"/><rect y="86" width="100" height="14" fill="#2A2838"/>`;
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g${ph.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g${ph.id})"/><circle cx="${sunX}" cy="${sunY}" r="${6 + r(4)}" fill="#FFF6D5" opacity=".9"/>${land}</svg>`;
}
const photoImg = ph => ph.url ? `<img src="${ph.url}" alt="Paylaşılan fotoğraf">` : `${scene(ph)}<span class="phs">Örnek fotoğraf</span>`;
const HEART = f => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2 0 3.4 1 5.3 3 1.9-2 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
function likeBtn(ph, cls) {
  const on = S.plikes.has(ph.id);
  return `<button class="plike ${cls || ''}" data-a="plike" data-v="${ph.id}" aria-pressed="${on}" aria-label="Fotoğrafı beğen">${HEART(on)}<span>${fmt(pLikes(ph))}</span></button>`;
}
function photoCard(ph, rank) {
  const p = byId(ph.pid);
  return `<figure class="pcard">
    <button class="pimg" data-a="popen" data-v="${ph.id}" aria-label="${esc(p.n)}">${photoImg(ph)}${rank && rank <= 3 ? `<span class="rankb r${rank}">${rank}</span>` : ''}</button>
    <figcaption><div class="pc1"><button class="plink" data-a="pick" data-v="${p.id}">${esc(p.n)}</button>${likeBtn(ph)}</div>
    <div class="pc2">${esc(ph.by)} · ${esc(p.il)}</div></figcaption></figure>`;
}
const segHTML = () => `<div class="seg" role="tablist"><button role="tab" data-a="pmode" data-v="places" aria-selected="${S.pmode === 'places'}">Yerler</button><button role="tab" data-a="pmode" data-v="photos" aria-selected="${S.pmode === 'photos'}">Fotoğraf vitrini</button></div>`;
function renderPhotos() {
  if ($('photov').hidden) return;
  const list = allPhotos().sort(S.psort === 'top' ? (a, b) => pLikes(b) - pLikes(a) : (a, b) => b.at - a.at);
  const people = {};
  allPhotos().forEach(ph => { people[ph.by] = (people[ph.by] || 0) + pLikes(ph); });
  const top = Object.entries(people).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('photos').innerHTML = `${segHTML()}
    <h1 style="margin-top:12px">En beğenilen fotoğraflar</h1>
    <p class="note" style="margin-top:4px">Gezginlerin çektiği en güzel kareler. Beğendiğin fotoğrafa kalp bırak.</p>
    <div class="chips" style="margin-top:10px">${chip('En çok beğenilen', S.psort === 'top', 'psort', 'top')}${chip('En yeni', S.psort === 'new', 'psort', 'new')}</div>
    <div class="pgrid">${list.map((ph, i) => photoCard(ph, S.psort === 'top' ? i + 1 : 0)).join('')}</div>
    <h2 style="font-size:19px;margin-top:22px">En çok beğeni alan fotoğrafçılar</h2>
    <ol class="rows">${top.map(([n, c], i) => `<li class="prow"><span class="rank">${i + 1}</span>${avHTML(n, (S.posts.find(q => q.author === n && avOf(q.uid, q.av)) || {}).av || avOf((S.posts.find(q => q.author === n && avOf(q.uid, q.av)) || {}).uid))}<b style="flex:1;min-width:0">${esc(n)}</b><span class="count">${fmt(c)} beğeni</span></li>`).join('')}</ol>
    <p class="note">Beğeni sayıları örnek veridir; örnek fotoğraflar çizim yer tutucudur.</p>`;
}
function showPhotos(on) {
  S.pmode = on ? 'photos' : 'places';
  $('photov').hidden = !on;
  if (on) { S.sel = null; $('listv').hidden = true; $('detailv').hidden = true; $('profv').hidden = true; $('pendv').hidden = true; S.collapsed = false; renderPhotos(); $('photos').scrollTop = 0; }
  else { $('listv').hidden = false; renderList(); }
  setSheet(); draw();
}
const segMount = () => { const m = $('segmount'); if (m) m.innerHTML = segHTML(); };

/* büyük görüntüleyici */
const lb = $('lightbox');
function openLB(id) {
  const ph = allPhotos().find(x => x.id === id); if (!ph) return;
  const p = byId(ph.pid);
  $('lbbody').innerHTML = `<div class="lbimg">${photoImg(ph)}</div>
    <div class="lbinfo"><div style="min-width:0"><b>${esc(ph.cap || p.n)}</b><div class="count">${esc(p.n)} · ${esc(p.il)}</div><div class="count">${esc(ph.by)}</div></div>${likeBtn(ph, 'big')}</div>
    <div class="acts"><button class="btn pri" data-a="pgo" data-v="${p.id}">Yere git</button></div>`;
  lb.dataset.id = id;
  if (!lb.open) lb.showModal ? lb.showModal() : lb.setAttribute('open', '');
}
const closeLB = () => { lb.close ? lb.close() : lb.removeAttribute('open'); };

/* mekan kartındaki Fotoğraflar sekmesi: beğenilebilir galeri */
const baseRenderDetail = renderDetail;
renderDetail = function () {
  baseRenderDetail();
  const p = byId(S.sel); if (!p) return;
  const list = allPhotos().filter(ph => ph.pid === p.id).sort((a, b) => pLikes(b) - pLikes(a));
  const t = document.querySelector('#detail .tab[data-v="pho"]');
  if (t) t.textContent = list.length ? `Fotoğraflar (${list.length})` : 'Fotoğraflar';
  if (S.tab === 'pho' && list.length) {
    const g = document.querySelector('#detail .grid') || document.querySelector('#detail .card:last-child');
    if (g) g.outerHTML = `<div class="pgrid">${list.map(ph => photoCard(ph, 0)).join('')}</div>`;
  }
};

/* hesapla bağlantı: beğeniler hesaba kaydedilir */
const savePL = () => { if (CUR) store.set('gezi-plikes-' + CUR.email, [...S.plikes]); };
const baseLoadUser = loadUser;
loadUser = function (a) { S.plikes = new Set(store.get('gezi-plikes-' + a.email, [])); baseLoadUser(a); renderPhotos(); };
const baseLogout = logout;
logout = function () { S.plikes = new Set(); showPhotos(false); baseLogout(); };
const baseShowView2 = showView;
showView = function () { $('photov').hidden = true; S.pmode = 'places'; baseShowView2(); segMount(); };
const baseRenderList = renderList;
renderList = function () { baseRenderList(); segMount(); };

const baseShowPending2 = showPending;
showPending = function (on) { if (on) $('photov').hidden = true; baseShowPending2(on); };
const baseShowProfile = showProfile;
showProfile = function (on) { if (on) $('photov').hidden = true; baseShowProfile(on); };
Object.assign(A, {
  pmode: v => showPhotos(v === 'photos'),
  psort: v => { S.psort = v; renderPhotos(); },
  popen: openLB,
  lbclose: closeLB,
  pgo: v => { closeLB(); select(v); },
  plike: v => requireAuth(() => {
    const on = !S.plikes.has(v);
    on ? S.plikes.add(v) : S.plikes.delete(v); savePL();
    if (on) toast('Fotoğrafı beğendin');
    renderPhotos(); if (S.sel) renderDetail();
    if (lb.open && lb.dataset.id === v) openLB(v);
  })
});
lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
segMount();
