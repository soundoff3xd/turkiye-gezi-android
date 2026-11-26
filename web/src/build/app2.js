/* ---------- arayüz ---------- */
/* harita işareti: ünlü yerlere özel çizim, diğerlerine kategori simgesi */
function pinSVG(p) {
  if (MKI.lm[p.id]) return lmMarker(p.id, MKI.lm[p.id], MKI.colors[p.g] || '#B4532A', 48);
  return catMarker(MKI.glyphs[p.c] || MKI.glyphs.seyir, MKI.colors[p.g] || '#C98312', 30);
}
const STAR = f => `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" fill="var(${f ? '--star' : '--star-off'})"/></svg>`;
const stars = (n, label) => `<span class="stars" role="img" aria-label="${label || ('5 üzerinden ' + rt(n) + ' puan')}">${[1, 2, 3, 4, 5].map(i => STAR(i <= Math.round(n))).join('')}</span>`;
const chip = (label, on, a, v) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${on}">${esc(label)}</button>`;
const ICON = {
  back: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  heart: f => `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2 0 3.4 1 5.3 3 1.9-2 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  check: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>'
};

const GI = d => `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GICON = {
  all: GI('<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'),
  kultur: GI('<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>'),
  doga: GI('<path d="M12 3 6 12h3l-4 6h14l-4-6h3z"/><path d="M12 18v3"/>'),
  deniz: GI('<path d="M3 9c1.5 0 1.5-1.5 3-1.5S7.5 9 9 9s1.5-1.5 3-1.5S13.5 9 15 9s1.5-1.5 3-1.5S19.5 9 21 9"/><path d="M3 14c1.5 0 1.5-1.5 3-1.5S7.5 14 9 14s1.5-1.5 3-1.5S13.5 14 15 14s1.5-1.5 3-1.5S19.5 14 21 14"/><path d="M3 19c1.5 0 1.5-1.5 3-1.5S7.5 19 9 19s1.5-1.5 3-1.5S13.5 19 15 19s1.5-1.5 3-1.5S19.5 19 21 19"/>'),
  sehir: GI('<path d="M4 20V9l5-3v14"/><path d="M9 20V4h7v16"/><path d="M16 20v-9h4v9"/><path d="M3 20h18M12 8h1M12 12h1M12 16h1"/>'),
  manzara: GI('<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M10.5 15h3M5 12l2-6h3l1 4M19 12l-2-6h-3l-1 4"/>')
};
const SICON = {
  visits: GI('<path d="M12 21s-6.5-6.2-6.5-11.2A6.5 6.5 0 0 1 18.5 9.8C18.5 14.8 12 21 12 21z"/><path d="m9.3 10 1.9 1.9 3.6-3.6"/>'),
  favs: GI('<path d="M12 20s-7-4.3-9-8.7C1.6 8.1 3.6 4.5 7 4.5c2 0 3.3 1 5 2.9 1.7-1.9 3-2.9 5-2.9 3.4 0 5.4 3.6 4 6.8-2 4.4-9 8.7-9 8.7z"/>'),
  rating: GI('<path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.8 6.6 19.7l1.2-5.9L3.4 9.7l6-.7z"/>'),
  reviews: GI('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/>')
};
function renderChips() {
  $('regions').innerHTML = chip('Tüm Türkiye', S.reg < 0, 'reg', -1) + REGIONS.map((l, i) => chip(l, S.reg === i, 'reg', i)).join('');
  $('sorts').innerHTML = SORTS.map(([k, l]) => `<button class="gt" data-a="sort" data-v="${k}" aria-pressed="${S.sort === k}"><span class="gi">${SICON[k]}</span><span class="gl">${esc(l)}</span></button>`).join('');
  const q = fold(S.q.trim()), base = PLACES.filter(p => matchPlace(p, q, true));
  const pool = PLACES.filter(p => (S.reg < 0 || p.r === S.reg) && (!q || fold(p.n + ' ' + p.il + ' ' + (p.semt || '') + ' ' + CATS[p.c]).includes(q)));
  const tile = (k, l, n) => `<button class="gt" data-a="cat" data-v="${k}" aria-pressed="${S.cat === k}"><span class="gi">${GICON[k]}</span><span class="gl">${esc(l)}</span><span class="gn">${n}</span></button>`;
  $('cats').innerHTML = tile('all', 'Tümü', pool.length) + Object.entries(GROUPS).map(([k, l]) => tile(k, l, pool.filter(p => p.g === k).length)).join('');
  const subs = Object.entries(SUBS).filter(([k, v]) => v[0] === S.cat).map(([k, v]) => [k, v[1], base.filter(p => p.c === k).length]).filter(x => x[2] > 0);
  $('subs').hidden = S.cat === 'all' || !subs.length;
  $('subs').innerHTML = chip('Tümü', !S.sub || S.sub === 'all', 'sub', 'all') + subs.map(([k, l, n]) => `<button class="chip" data-a="sub" data-v="${k}" aria-pressed="${S.sub === k}">${esc(l)} <span class="cnt">${n}</span></button>`).join('');
}
function renderList() {
  const rs = results();
  $('count').textContent = rs.length + ' yer';
  const hot = k => S.sort === k ? ' hot' : '';
  $('rows').innerHTML = rs.length ? rs.map(({ p, s }, i) => `<li><button class="row" data-a="pick" data-v="${p.id}">
    <span class="rank">${i + 1}</span>
    <span class="rb"><span class="rn">${esc(p.n)}</span><span class="rm">${esc(p.il)} · ${CATS[p.c]}</span>
    <span class="rs">${s.count ? `<span class="${hot('rating')}"><span class="st" aria-hidden="true">★</span> ${rt(s.rating)}</span>` : '<span class="badge">Yeni</span>'}${p.added ? '<span class="badge">Topluluk ekledi</span>' : ''}<span class="mut${hot('reviews')}">${fmt(s.count)} yorum</span><span class="mut${hot('visits')}">${fmt(s.visits)} kişi gitti</span><span class="mut${hot('favs')}">${fmt(s.favs)} favori</span></span></span>
  </button></li>`).join('') : '<li class="empty">Bu aramaya veya filtreye uyan yer yok.</li>';
  draw();
}
function mediaHTML(m, big) {
  if (m.url) return m.kind === 'video' ? `<video src="${m.url}" controls playsinline preload="metadata"></video>` : `<img src="${m.url}" alt="Paylaşılan fotoğraf">`;
  return `<div class="ph">${m.kind === 'video' ? ICON.play : ''}${m.kind === 'video' ? 'Örnek video' : 'Örnek fotoğraf'}</div>`;
}
/* profil fotoğrafları: kullanıcı anahtarı → resim adresi */
const AV = {};
const avOf = (uid, url) => url || (uid && AV[uid]) || null;
function avHTML(name, url, style) {
  const s = style ? ` style="${style}"` : '';
  return url ? `<span class="av img"${s} aria-hidden="true"><img src="${esc(url)}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="av"${s} aria-hidden="true">${esc(((name || '?')[0] || '?').toUpperCase())}</span>`;
}
/* tek bir yere odaklanırken yakınlık: gerçek haritada sokak düzeyine kadar yaklaş */
function placeS(ist) { return MAP.classList.contains('ml') ? Math.max(V.s, 24) : ist ? Math.max(V.s, 8) : 1.5; }
/* şikâyet düğmesi: yalnızca gerçek veritabanı içeriği ve başkasının paylaşımı için */
const canReport = ruid => !!ruid && !(typeof ME !== 'undefined' && ME && ME.id === ruid);
function postHTML(x) {
  const liked = S.liked.has(x.id), reps = x.replies.concat(S.rep[x.id] || []), open = S.open.has(x.id);
  return `<article class="card">
    <div class="ch">${avHTML(x.author, avOf(x.uid, x.av))}<div class="who"><b>${esc(x.author)}</b><span>${esc(x.ago)}</span></div>${x.sample ? '<span class="badge">Örnek</span>' : ''}${canReport(x.ruid) ? `<button class="ib rpt" data-a="report" data-v="review:${x.id}${x.media ? ':photo' : ''}" aria-label="Şikâyet et" title="Şikâyet et">⋯</button>` : ''}</div>
    ${x.hidden || (x.photoHidden && x.media) ? `<p class="hidnote${!x.hidden && x.photoPending ? ' pend' : ''}">${x.hidden ? 'Bu yorum şikâyetler nedeniyle gizlendi; moderatör inceliyor.' : x.photoPending ? 'Fotoğrafın kısa bir kontrolden sonra herkese görünecek.' : 'Bu fotoğraf şikâyetler nedeniyle gizlendi; moderatör inceliyor.'}</p>` : ''}
    <div style="margin-top:8px">${stars(x.rating, '5 üzerinden ' + x.rating + ' puan')}</div>
    ${x.text ? `<p style="margin:6px 0 0" translate="no">${esc(x.text)}</p>` : ''}
    ${x.media ? `<div class="media">${mediaHTML(x.media)}</div>` : ''}
    <div class="ca"><button class="ib" data-a="like" data-v="${x.id}" aria-pressed="${liked}" aria-label="Beğen">${ICON.heart(liked)}${x.likes + (liked ? 1 : 0)}</button>
    <button class="ib" data-a="replies" data-v="${x.id}" aria-expanded="${open}" aria-label="Yanıtlar">${ICON.chat}${reps.length}</button></div>
    ${open ? `<div>${reps.map(r => `<div class="rep">${avHTML(r.a, r.av || (r.a === 'Sen' && typeof CUR !== 'undefined' && CUR ? CUR.av : null), 'width:28px;height:28px;font-size:12px')}<div style="flex:1;min-width:0"><b style="font-size:12px" translate="no">${esc(r.a)}</b><br><span translate="no">${esc(r.t)}</span>${r.hidden ? '<br><span class="hidnote">Gizlendi; moderatör inceliyor.</span>' : ''}</div>${r.id && canReport(r.ruid) ? `<button class="ib rpt" data-a="report" data-v="reply:${r.id}" aria-label="Yanıtı şikâyet et" title="Yanıtı şikâyet et">⋯</button>` : ''}</div>`).join('')}
      <div class="rf"><input class="in" id="r-${x.id}" data-draft="${x.id}" aria-label="Yanıt yaz" placeholder="Yanıt yaz" value="${esc(S.drafts[x.id] || '')}"><button class="btn pri" style="flex:none;border-radius:12px;padding:0 16px" data-a="send" data-v="${x.id}">Gönder</button></div></div>` : ''}
  </article>`;
}
function renderDetail() {
  const p = byId(S.sel); if (!p) return;
  const s = stats(p), posts = S.posts.filter(x => x.pid === p.id), media = posts.filter(x => x.media);
  const v = S.visited.has(p.id), f = S.faved.has(p.id);
  const tabs = [['ov', 'Genel bakış'], ['rev', 'Yorumlar'], ['pho', 'Fotoğraflar' + (media.length ? ' (' + media.length + ')' : '')]];
  let body = '';
  if (S.tab === 'ov') {
    body = `<p class="para">${esc(p.d)}</p>
      <div class="box"><b>Konum</b>${esc(p.il)}${p.semt ? ' · ' + esc(p.semt) : ''} · ${REGIONS[p.r]} Bölgesi</div>
      ${p.h ? `<div class="box"><b>Nasıl gidilir</b>${esc(p.h)}</div>` : ''}
      <p class="note">Açılış saatleri ve giriş ücretleri değişebilir; gitmeden önce resmi kaynaktan kontrol edin.</p>`;
  } else if (S.tab === 'rev') {
    body = `${s.count ? `<div class="sum"><div class="big">${rt(s.rating)}</div><div>${stars(s.rating)}<div class="count">${fmt(s.count)} yorum</div></div></div>` : ''}
      <p class="note">Toplam puan ve yorum sayısı örnek veridir. Aşağıda "Örnek" etiketli yorumlar yer tutucudur; senin paylaştıkların sayıya eklenir.</p>
      ${posts.length ? posts.map(postHTML).join('') : `<div class="card" style="text-align:center"><b>Bu yer için gösterilecek yorum yok</b><p class="note" style="margin:6px 0 12px">Gezdiysen ilk deneyimi sen paylaş.</p><button class="btn pri" style="max-width:220px;width:100%" data-a="compose">Yorum yaz</button></div>`}`;
  } else {
    body = media.length ? `<div class="grid">${media.map(x => `<div>${mediaHTML(x.media)}</div>`).join('')}</div>`
      : `<div class="card" style="text-align:center"><b>Henüz fotoğraf veya video yok</b><p class="note" style="margin:6px 0 12px">Çektiğin kareleri paylaş, gelecek gezginler ne bekleyeceğini görsün.</p><button class="btn pri" style="max-width:220px;width:100%" data-a="compose">Fotoğraf ekle</button></div>`;
  }
  $('detail').innerHTML = `<button class="back" data-a="back">${ICON.back}Tüm yerler</button>
    <p class="eyebrow">${esc(p.il)} · ${CATS[p.c]}</p>
    <h2 class="dname">${esc(p.n)}</h2>
    <div class="stats">${s.count ? `<span>${stars(s.rating)} <b>${rt(s.rating)}</b> <span class="count">(${fmt(s.count)} yorum)</span></span>` : '<span class="count">Henüz puan yok</span>'}${p.added ? `<span class="count">${esc(p.added)} önerdi, topluluk onayladı</span>` : ''}<span class="count">${fmt(s.visits)} kişi gitti</span><span class="count">${fmt(s.favs)} favori</span></div>
    <div class="acts">
      <button class="btn" data-a="visit" aria-pressed="${v}">${v ? ICON.check : ''}${v ? 'Gittim' : 'Gittim mi?'}</button>
      <button class="btn" data-a="fav" aria-pressed="${f}">${ICON.heart(f)}${f ? 'Favoride' : 'Favori'}</button>
      <a class="btn pri" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Yol tarifi</a>
    </div>
    <div class="acts"><button class="btn" data-a="compose">Yorum yaz</button><button class="btn" data-a="compose">Fotoğraf ekle</button></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" data-a="tab" data-v="${k}" aria-selected="${S.tab === k}">${l}</button>`).join('')}</div>
    ${body}`;
}
function showView() {
  $('pendv').hidden = true; $('listv').hidden = !!S.sel; $('detailv').hidden = !S.sel;
  setSheet();
}
function select(id) {
  const p = byId(id); if (!p) return;
  S.sel = id; S.tab = 'ov'; S.collapsed = false;
  showView(); renderDetail(); $('detail').scrollTop = 0;
  flyTo(p.x, p.y, placeS(p.il === 'İstanbul'));
}
function back() {
  S.sel = null; showView(); renderList();
}
function fitResults() {
  const rs = results(); if (!rs.length) return;
  const xs = rs.map(r => r.p.x), ys = rs.map(r => r.p.y);
  if (S.reg < 0 && !S.q.trim() && S.cat === 'all') return fitTurkey(true);
  if (rs.length === 1) return flyTo(rs[0].p.x, rs[0].p.y, placeS(false));
  fitBox(Math.min(...xs) - 60, Math.min(...ys) - 60, Math.max(...xs) + 60, Math.max(...ys) + 60, 3, true);
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }

/* yorum penceresi */
const dlg = $('compose');
function canPost() { return S.cRating > 0 && ($('ctext').value.trim() || S.cMedia); }
function renderCompose() {
  $('cstars').innerHTML = [1, 2, 3, 4, 5].map(i => `<button type="button" data-a="star" data-v="${i}" aria-label="${i} yıldız" aria-pressed="${i <= S.cRating}"><svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.5 6 20.9l1.3-6.7-5-4.7 6.8-.8z" fill="var(${i <= S.cRating ? '--star' : '--star-off'})"/></svg></button>`).join('');
  $('cprev').innerHTML = S.cMedia ? `<div class="prev">${S.cMedia.kind === 'photo' ? `<img src="${S.cMedia.url}" alt="Seçilen fotoğraf">` : ICON.play}<span>${esc(S.cMedia.name)}</span><button type="button" class="ib" style="color:var(--accent)" data-a="unmedia">Kaldır</button></div>` : '';
  $('cgo').disabled = !canPost();
}
function openCompose() {
  $('cplace').textContent = byId(S.sel).n;
  renderCompose();
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
$('ctext').addEventListener('input', () => { $('cgo').disabled = !canPost(); });
$('cfile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  S.cMedia = { kind: f.type.startsWith('video') ? 'video' : 'photo', url: URL.createObjectURL(f), name: f.name };
  e.target.value = ''; renderCompose();
});
$('cform').addEventListener('submit', e => {
  e.preventDefault(); if (!canPost()) return;
  S.posts.unshift({ id: 'n' + Date.now(), pid: S.sel, author: 'Sen', rating: S.cRating, text: $('ctext').value.trim(), media: S.cMedia ? { kind: S.cMedia.kind, url: S.cMedia.url } : null, likes: 0, replies: [], ago: 'Şimdi', sample: false });
  S.cRating = 0; S.cMedia = null; $('ctext').value = '';
  dlg.close ? dlg.close() : dlg.removeAttribute('open');
  S.tab = 'rev'; renderDetail(); renderList(); toast('Yorumun paylaşıldı');
});

/* olaylar */
const A = {
  grip: () => { if (S.gripDragged) { S.gripDragged = false; return; } if (S.full) { S.full = false; } else S.collapsed = !S.collapsed; setSheet(); },
  reg: v => { S.reg = +v; renderChips(); renderList(); if (S.sel) back(); fitResults(); },
  sort: v => { S.sort = v; renderChips(); renderList(); $('rows').parentElement.scrollTop = 0; },
  cat: v => { S.cat = v; S.sub = 'all'; renderChips(); renderList(); fitResults(); },
  sub: v => { S.sub = v; renderChips(); renderList(); fitResults(); },
  pick: v => select(v),
  cl: v => {
    const ps = v.split(',').map(byId), xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    fitBox(Math.min(...xs) - 4, Math.min(...ys) - 4, Math.max(...xs) + 4, Math.max(...ys) + 4, V.maxS, true);
  },
  back,
  tab: v => { S.tab = v; renderDetail(); },
  visit: () => { const id = S.sel; S.visited.has(id) ? S.visited.delete(id) : (S.visited.add(id), toast('Gittiğin yerlere eklendi')); renderDetail(); renderList(); },
  fav: () => { const id = S.sel; S.faved.has(id) ? S.faved.delete(id) : (S.faved.add(id), toast('Favorilere eklendi')); renderDetail(); renderList(); },
  compose: openCompose,
  close: () => dlg.close ? dlg.close() : dlg.removeAttribute('open'),
  star: v => { S.cRating = +v; renderCompose(); },
  unmedia: () => { S.cMedia = null; renderCompose(); },
  like: v => { S.liked.has(v) ? S.liked.delete(v) : S.liked.add(v); renderDetail(); },
  replies: v => { S.open.has(v) ? S.open.delete(v) : S.open.add(v); renderDetail(); },
  send: v => {
    const t = (S.drafts[v] || '').trim(); if (!t) return;
    (S.rep[v] = S.rep[v] || []).push({ a: 'Sen', t }); S.drafts[v] = ''; renderDetail();
    const inp = $('r-' + v); if (inp) inp.focus();
  },
  zin: () => { const r = viewRect(); zoomAt(r.x + r.w / 2, r.y + r.h / 2, 2); },
  zout: () => { const r = viewRect(); zoomAt(r.x + r.w / 2, r.y + r.h / 2, 0.5); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t) return;
  const f = A[t.dataset.a]; if (f) { e.preventDefault(); f(t.dataset.v); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { S.q = e.target.value; renderChips(); renderList(); clearTimeout(A.qt); A.qt = setTimeout(fitResults, 400); }
  else if (e.target.dataset.draft) S.drafts[e.target.dataset.draft] = e.target.value;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.draft) { e.preventDefault(); A.send(e.target.dataset.draft); }
  if (e.key === 'Escape' && S.sel && !dlg.open) back();
});
addEventListener('resize', () => { setSheet(); draw(); });

renderChips(); setSheet(); renderList();
requestAnimationFrame(() => { V.minS = 0; fitTurkey(false); V.minS = V.s * 0.8; draw(); });
