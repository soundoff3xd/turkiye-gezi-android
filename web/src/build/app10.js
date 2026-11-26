/* ---------- Supabase bağlantısı ----------
   Bağlanabilirse uygulama gerçek veritabanıyla çalışır (ortak hesaplar, yorumlar, fotoğraflar, öneriler).
   Bağlanamazsa (ör. claude.ai önizlemesi) tarayıcı içi önizleme modunda kalır. */
const DB_URL = 'https://ljupvldmnginkvuuafll.supabase.co';
const DB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdXB2bGRtbmdpbmt2dXVhZmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NjAzODAsImV4cCI6MjExMTAzNjM4MH0.Jwi1Bh7e6gv7H5-Rg7HzDbLlbJ0uKwQCjekwQH3Q6v0';
let sb = null, ME = null;
const DBX = { agg: {}, likeBase: {}, photoBase: {} };

function agoText(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(window.LANG || 'tr', { numeric: 'auto' });
  if (s < 60) return rtf.format(0, 'second');
  for (const [u, n] of [['minute', 60], ['hour', 3600], ['day', 86400], ['week', 604800], ['month', 2592000], ['year', 31536000]].reverse())
    if (s >= n) return rtf.format(-Math.floor(s / n), u);
  return rtf.format(-Math.floor(s / 60), 'minute');
}
const pubUrl = path => path ? sb.storage.from('photos').getPublicUrl(path).data.publicUrl : null;
const avUrl = pr => pr && pr.avatar_path ? pubUrl(pr.avatar_path) : null;
const uidKey = uid => (ME && uid === ME.id) ? CUR.email : uid;
const ERRTR = [[/rate limit|too many/i, 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.'], [/already registered|already exists/i, 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.'], [/failed to fetch|networkerror|load failed/i, 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.'], [/password should be/i, 'Şifre en az 8 karakter olmalı.'], [/payload too large|exceeded the maximum/i, 'Fotoğraf en fazla 5 MB olabilir.']];
const fail = (e, el) => { let m = (e && (e.message || e.error_description)) || 'Bir hata oluştu, lütfen tekrar dene.'; const t = ERRTR.find(([r]) => r.test(m)); if (t) m = t[1]; if (el) el.textContent = m; else toast(m); console.warn(e); };

async function shrinkImage(file) {
  if (file.size > 5 * 1024 * 1024 * 4) throw new Error('Fotoğraf en fazla 5 MB olabilir.');
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    if (blob && blob.size <= 5 * 1024 * 1024) return blob;
  } catch (_) { }
  if (file.size > 5 * 1024 * 1024) throw new Error('Fotoğraf en fazla 5 MB olabilir.');
  return file;
}
async function uploadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Şimdilik yalnızca fotoğraf yüklenebiliyor.');
  const blob = await shrinkImage(file);
  const path = `${ME.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/* ---- verileri yükleme ---- */
async function loadStats() {
  const { data, error } = await sb.rpc('get_place_stats'); if (error) throw error;
  DBX.agg = {}; data.forEach(r => { DBX.agg[r.place_id] = { visits: +r.visits, favs: +r.favs, count: +r.reviews, rating: r.rating ? +r.rating : 0 }; });
}
async function loadCommunityPlaces() {
  const { data, error } = await sb.from('places').select('id,name,province,region,category,lat,lng,description,added_by,profiles!places_added_by_fkey(name)').not('added_by', 'is', null);
  if (error) throw error;
  data.forEach(r => {
    if (PLACES.some(p => p.id === r.id)) return;
    const p = { id: r.id, n: r.name, il: r.province, r: r.region, c: r.category, lat: r.lat, lng: r.lng, d: r.description, t: 1, added: (r.profiles && r.profiles.name) || '', base: { rating: 0, count: 0, visits: 0, favs: 0 } };
    p.g = (SUBS[p.c] || ['manzara'])[0]; [p.x, p.y] = proj(p.lng, p.lat); PLACES.push(p);
  });
}
async function loadReviews() {
  const { data, error } = await sb.from('reviews')
    .select('id,place_id,user_id,rating,body,photo_path,hidden,photo_hidden,photo_pending,created_at,profiles!reviews_user_id_fkey(name,avatar_path),replies(id,body,hidden,created_at,user_id,profiles!replies_user_id_fkey(name,avatar_path)),review_likes(user_id),photo_likes(user_id)')
    .order('created_at', { ascending: false }).limit(400);
  if (error) throw error;
  S.liked = new Set(); S.plikes = new Set(); S.rep = {};
  S.posts = data.map(r => {
    const mineLike = ME && r.review_likes.some(l => l.user_id === ME.id), minePhoto = ME && r.photo_likes.some(l => l.user_id === ME.id);
    if (mineLike) S.liked.add(r.id);
    if (minePhoto) S.plikes.add('pp' + r.id);
    DBX.photoBase['pp' + r.id] = r.photo_likes.length - (minePhoto ? 1 : 0);
    return {
      id: r.id, pid: r.place_id, author: (r.profiles && r.profiles.name) || '?', uid: uidKey(r.user_id), av: avUrl(r.profiles), rating: r.rating, text: r.body,
      // şikâyetle gizlenen fotoğrafı yalnızca sahibi görür
      media: r.photo_path && (!r.photo_hidden || (ME && ME.id === r.user_id)) ? { kind: 'photo', url: pubUrl(r.photo_path) } : null, likes: r.review_likes.length - (mineLike ? 1 : 0),
      ruid: r.user_id, hidden: !!r.hidden, photoHidden: !!r.photo_hidden, photoPending: !!r.photo_pending,
      replies: r.replies.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(x => ({ id: x.id, ruid: x.user_id, hidden: !!x.hidden, a: (x.profiles && x.profiles.name) || '?', t: x.body, av: avUrl(x.profiles) })),
      ago: agoText(r.created_at), at: new Date(r.created_at).getTime(), sample: false
    };
  });
}
async function loadSuggestions() {
  const { data, error } = await sb.from('suggestions').select('*,profiles!suggestions_user_id_fkey(name,avatar_path),suggestion_votes(user_id,vote)').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  S.myVotes = {}; S.mine = 0;
  S.sugg = data.map(g => {
    const mv = ME && g.suggestion_votes.find(v => v.user_id === ME.id);
    if (mv) S.myVotes[g.id] = mv.vote > 0 ? 'ok' : 'bad';
    if (ME && g.user_id === ME.id && Date.now() - new Date(g.created_at) < 864e5) S.mine++;
    return {
      id: g.id, n: g.name, il: g.province, c: g.category, lat: g.lat, lng: g.lng, d: g.description, by: (g.profiles && g.profiles.name) || '?', av: avUrl(g.profiles),
      ok: g.suggestion_votes.filter(v => v.vote > 0).length, bad: g.suggestion_votes.filter(v => v.vote < 0).length,
      ago: agoText(g.created_at), own: !!(ME && g.user_id === ME.id), uid: uidKey(g.user_id), media: { kind: 'photo', url: pubUrl(g.photo_path) }, state: g.status, placeId: g.place_id
    };
  });
}
async function loadMine() {
  const [v, f] = await Promise.all([sb.from('visits').select('place_id'), sb.from('favorites').select('place_id')]);
  if (v.error) throw v.error; if (f.error) throw f.error;
  S.visited = new Set(v.data.map(x => x.place_id)); S.faved = new Set(f.data.map(x => x.place_id));
}
async function reloadAll() {
  // bir bölüm yüklenemese bile diğerleri yüklensin ve uygulama açılsın
  const log = e => console.warn('Veri yüklenemedi:', e && (e.message || e));
  await loadCommunityPlaces().catch(log);
  await Promise.all([loadStats(), loadReviews(), loadSuggestions(), ME ? loadMine() : Promise.resolve()].map(x => x.catch(log)));
  refreshAll(); if (!$('photov').hidden) renderPhotos();
}

/* ---- oturum ---- */
async function onSignedIn(user) {
  ME = user;
  const { data: prof } = await sb.from('profiles').select('name,created_at,is_moderator,avatar_path').eq('id', user.id).single();
  if (!prof) {
    // hesap silinmiş ama tarayıcıda eski oturum kalmış olabilir: oturumu doğrula, geçersizse kapat
    const { error } = await sb.auth.getUser();
    if (error) { try { await sb.auth.signOut({ scope: 'local' }); } catch (_) { } signedOutLocal(); refreshAll(); gate(); return; }
  }
  CUR = { name: (prof && prof.name) || user.email.split('@')[0], email: user.email, created: prof ? prof.created_at : user.created_at, mod: !!(prof && prof.is_moderator), avPath: (prof && prof.avatar_path) || null, av: avUrl(prof) };
  if (CUR.av) AV[CUR.email] = CUR.av;
  document.body.classList.toggle('is-mod', CUR.mod);
  adlg.classList.remove('gate'); if (adlg.open) adlg.close();
  refreshAll();
  await reloadAll();
  if (AFTER) { const f = AFTER; AFTER = null; f(); }
}
function signedOutLocal() {
  ME = null; CUR = null; S.visited = new Set(); S.faved = new Set(); S.liked = new Set(); S.plikes = new Set(); S.myVotes = {};
  document.body.classList.remove('is-mod');
}

/* ---- işlemleri veritabanına yönlendir ---- */
function installOnline() {
  document.body.classList.add('online');
  stats = p => { const a = DBX.agg[p.id] || {}; return { rating: a.rating || 0, count: a.count || 0, visits: a.visits || 0, favs: a.favs || 0 }; };
  persist = () => { };
  allPhotos = () => S.posts.filter(p => p.media && p.media.url && byId(p.pid))
    .map(p => ({ id: 'pp' + p.id, pid: p.pid, by: p.author, cap: (p.text || '').slice(0, 60), likes: DBX.photoBase['pp' + p.id] || 0, url: p.media.url, at: p.at }));
  const origText = el => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, s = ''; while ((n = w.nextNode())) s += (ORIG.get(n) ?? n.nodeValue); return s; };
  const strip = root => root && root.querySelectorAll('.note,.demo').forEach(n => { if (/örnek veri|Örnek\W|^Prototip|Moderatör düğmeleri/.test(origText(n))) n.remove(); });
  const rd = renderDetail; renderDetail = function () { rd(); strip($('detail')); };
  const rp = renderPhotos; renderPhotos = function () { rp(); strip($('photos')); };
  const rpe = renderPending; renderPending = function () { rpe(); strip($('pend')); };
  strip(document);
  $('cfile').setAttribute('accept', 'image/*');

  const toggleRow = async (table, set, key, field) => {
    const id = S.sel, on = !set.has(id), a = DBX.agg[id] = DBX.agg[id] || { visits: 0, favs: 0, count: 0, rating: 0 };
    on ? set.add(id) : set.delete(id); a[field] += on ? 1 : -1; renderDetail(); renderList();
    const q = on ? sb.from(table).insert({ user_id: ME.id, place_id: id }) : sb.from(table).delete().eq('user_id', ME.id).eq('place_id', id);
    const { error } = await q;
    if (error) { on ? set.delete(id) : set.add(id); a[field] += on ? -1 : 1; renderDetail(); renderList(); return fail(error); }
    if (on) toast(key);
    if (!$('profv').hidden) renderProfile();
  };
  Object.assign(A, {
    visit: () => requireAuth(() => toggleRow('visits', S.visited, 'Gittiğin yerlere eklendi', 'visits')),
    fav: () => requireAuth(() => toggleRow('favorites', S.faved, 'Favorilere eklendi', 'favs')),
    like: v => requireAuth(async () => {
      const on = !S.liked.has(v); on ? S.liked.add(v) : S.liked.delete(v); renderDetail();
      const { error } = on ? await sb.from('review_likes').insert({ review_id: v, user_id: ME.id }) : await sb.from('review_likes').delete().eq('review_id', v).eq('user_id', ME.id);
      if (error) { on ? S.liked.delete(v) : S.liked.add(v); renderDetail(); fail(error); }
    }),
    send: v => requireAuth(async () => {
      const t = (S.drafts[v] || '').trim(); if (!t) return;
      const { error } = await sb.from('replies').insert({ review_id: v, user_id: ME.id, body: t.slice(0, 500) });
      if (error) return fail(error);
      const p = S.posts.find(x => x.id === v); if (p) p.replies.push({ a: CUR.name, t });
      S.drafts[v] = ''; renderDetail(); const inp = $('r-' + v); if (inp) inp.focus();
    }),
    plike: v => requireAuth(async () => {
      const rid = v.slice(2), on = !S.plikes.has(v); on ? S.plikes.add(v) : S.plikes.delete(v);
      const redraw = () => { renderPhotos(); if (S.sel) renderDetail(); if (lb.open && lb.dataset.id === v) openLB(v); };
      redraw(); if (on) toast('Fotoğrafı beğendin');
      const { error } = on ? await sb.from('photo_likes').insert({ review_id: rid, user_id: ME.id }) : await sb.from('photo_likes').delete().eq('review_id', rid).eq('user_id', ME.id);
      if (error) { on ? S.plikes.delete(v) : S.plikes.add(v); redraw(); fail(error); }
    }),
    vok: v => requireAuth(() => vote(v, 1)),
    vbad: v => requireAuth(() => vote(v, -1)),
    mok: v => moderate(v, true),
    mno: v => moderate(v, false),
    sshow: v => { const g = S.sugg.find(x => x.id === v); if (!g) return; if (g.state === 'ok' && g.placeId && byId(g.placeId)) { showPending(false); select(g.placeId); } else { const [x, y] = proj(g.lng, g.lat); flyTo(x, y, 1.5); } },
    mlogout: async () => { toggleMenu(false); await sb.auth.signOut(); },
    logout: async () => { await sb.auth.signOut(); },
    delyes: async () => {
      try {
        const { data: files } = await sb.storage.from('photos').list(ME.id, { limit: 1000 });
        if (files && files.length) await sb.storage.from('photos').remove(files.map(f => `${ME.id}/${f.name}`));
        const { error } = await sb.rpc('delete_my_account'); if (error) throw error;
        await sb.auth.signOut(); toast('Hesabın silindi');
      } catch (e) { fail(e); }
    }
  });
  async function vote(id, val) {
    const { error } = await sb.from('suggestion_votes').insert({ suggestion_id: id, user_id: ME.id, vote: val });
    if (error) return fail(error);
    const before = S.sugg.find(x => x.id === id);
    await loadSuggestions(); const g = S.sugg.find(x => x.id === id);
    if (g && g.state === 'ok' && before && before.state !== 'ok') { await loadCommunityPlaces(); await loadStats(); toast(`${g.n} haritaya eklendi`); }
    else if (g && g.state === 'mod') toast('Öneri moderatöre gönderildi'); else if (val < 0) toast('Bildirimin alındı');
    renderPending(); renderList(); draw();
  }
  async function moderate(id, ok) {
    const { error } = await sb.rpc('moderate_suggestion', { sid: id, approve: ok });
    if (error) return fail(error);
    await reloadAll(); renderPending(); toast(ok ? 'Onaylandı, haritada' : 'Öneri reddedildi');
  }

  /* formlar: önce bizim işleyicimiz çalışır, yerel önizleme işleyicilerini durdurur */
  document.addEventListener('change', e => {
    if (e.target.id === 'cfile') S.cFile = e.target.files && e.target.files[0];
    if (e.target.id === 'sfile') S.sFile = e.target.files && e.target.files[0];
  }, true);
  document.addEventListener('submit', async e => {
    const id = e.target.id; if (!['aform', 'cform', 'sform'].includes(id)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (id === 'aform') return authSubmit();
    if (id === 'cform') return reviewSubmit();
    if (id === 'sform') return suggestSubmit();
  }, true);

  async function authSubmit() {
    const email = $('aemail').value.trim().toLowerCase(), pw = $('apass').value, name = $('aname').value.trim(), err = $('aerr');
    err.style.color = ''; err.textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return (err.textContent = 'Geçerli bir e-posta adresi gir.');
    if (pw.length < 8) return (err.textContent = 'Şifre en az 8 karakter olmalı.');
    $('ago').disabled = true;
    try {
      if (AMODE === 'up') {
        if (name.length < 2 || name.length > 30) return (err.textContent = 'Adın 2 ile 30 karakter arasında olmalı.');
        if (BAD.some(w => fold(name).includes(fold(w)))) return (err.textContent = 'Bu ad kullanılamaz.');
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { name }, emailRedirectTo: location.href.split('#')[0] } });
        if (error) throw error;
        if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return (err.textContent = 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.');
        if (!data.session) {
          AMODE = 'in'; renderAuth(); err.style.color = 'var(--ok)';
          err.textContent = 'Hesabını doğrulamak için e-postana bir bağlantı gönderdik. Bağlantıya tıkladıktan sonra giriş yap.';
          return;
        }
        toast('Hesabın oluşturuldu, hoş geldin ' + name);
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) {
          if (/confirm/i.test(error.message)) return (err.textContent = 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.');
          if (/invalid/i.test(error.message)) return (err.textContent = 'E-posta veya şifre hatalı.');
          throw error;
        }
      }
      $('aform').reset();
    } catch (e) { fail(e, err); }
    finally { $('ago').disabled = false; }
  }
  async function reviewSubmit() {
    if (!canPost() || !ME) return;
    $('cgo').disabled = true;
    try {
      let path = null;
      if (S.cMedia) path = await uploadPhoto(S.cFile);
      const { error } = await sb.from('reviews').insert({ place_id: S.sel, user_id: ME.id, rating: S.cRating, body: $('ctext').value.trim().slice(0, 1000), photo_path: path });
      if (error) throw error;
      S.cRating = 0; S.cMedia = null; S.cFile = null; $('ctext').value = '';
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
      await Promise.all([loadReviews(), loadStats()]);
      S.tab = 'rev'; renderDetail(); renderList(); toast('Yorumun paylaşıldı');
    } catch (e) { fail(e); }
    finally { $('cgo').disabled = !canPost(); }
  }
  async function suggestSubmit() {
    const f = { n: $('sname').value, d: $('sdesc').value, il: $('sil').value, c: $('scat').value, been: $('sbeen').checked };
    const errs = checks(f), box = $('serr');
    if (errs.length) { box.innerHTML = `<b>Önerin gönderilmedi:</b><ul>${errs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; return; }
    box.innerHTML = '';
    try {
      const path = await uploadPhoto(S.sFile);
      const { error } = await sb.from('suggestions').insert({ user_id: ME.id, name: f.n.trim(), province: f.il, category: f.c, lat: S.pickPt.lat, lng: S.pickPt.lng, description: f.d.trim(), photo_path: path, region: regionOf(f.il) });
      if (error) throw error;
      S.pickPt = null; S.sMedia = null; S.sFile = null; $('sform').reset();
      closeSuggest(); await loadSuggestions(); showPending(true); toast('Önerin incelemeye alındı');
    } catch (e) { box.innerHTML = `<b>Önerin gönderilmedi:</b><ul><li>${esc(e.message || 'Bir hata oluştu, lütfen tekrar dene.')}</li></ul>`; }
  }
}

/* ---- başlangıç ---- */
(async function dbInit() {
  const preview = () => {
    const w = $('welcome');
    if (w && !$('pvnote')) w.insertAdjacentHTML('beforeend', '<p class="note setup" id="pvnote">Önizleme modu: bu sayfa veritabanına bağlanamıyor; hesaplar ve paylaşımlar yalnızca bu tarayıcıda saklanır.</p>');
  };
  if (!window.supabase || !window.fetch) return preview();
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
    await fetch(DB_URL + '/auth/v1/health', { headers: { apikey: DB_KEY }, signal: ctl.signal }); clearTimeout(t);
  } catch (_) { return preview(); }
  sb = window.supabase.createClient(DB_URL, DB_KEY);
  // önizleme verilerini temizle: gerçek modda yalnızca veritabanındaki içerik görünür
  S.posts = []; S.sugg = []; S.photos = []; S.myVotes = {};
  installOnline();
  CUR = null; signedOutLocal();
  try { await reloadAll(); } catch (e) { fail(e); }
  // bağış ödeme bağlantısı veritabanından gelir: siteyi yeniden yüklemeden değiştirilebilir
  sb.from('app_settings').select('key,value').then(({ data }) => {
    const m = Object.fromEntries((data || []).map(r => [r.key, r.value]));
    if (m.support_url) SUPPORT.url = m.support_url;
    if (m.support_monthly_url) SUPPORT.monthlyUrl = m.support_monthly_url;
    if (m.support_currency) SUPPORT.currency = m.support_currency;
    if (m.support_amounts) { const a = m.support_amounts.split(',').map(Number).filter(n => n > 0); if (a.length) SUPPORT.amounts = a; }
  }, () => { });
  sb.auth.onAuthStateChange((ev, session) => {
    setTimeout(async () => {
      if (session && session.user && (!ME || ME.id !== session.user.id)) { try { await onSignedIn(session.user); } catch (e) { fail(e); } }
      else if (!session && ME) { signedOutLocal(); showProfile(false); try { await reloadAll(); } catch (_) { } toast('Çıkış yapıldı'); gate(); }
    }, 0);
  });
  const { data } = await sb.auth.getSession();
  if (data.session) { if (!ME) { try { await onSignedIn(data.session.user); } catch (e) { fail(e); } } }
  else if (!ME) { refreshAll(); gate(); }
})();
