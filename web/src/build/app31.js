/* ===== aşama 11 (3B/3C): gezgin profili ve takip, ortak gezi listeleri, yorum çevirisi, yıllık gezi özeti, koleksiyonlar,
   "Neresi bu?" oyunu, yürüyüş parkurları, Mavi Bayrak, fotoğraf saatleri, valiz listesi ===== */
const ERR31 = [[/bad_invite/i, 'Davet bağlantısı geçersiz ya da liste silinmiş.'], [/trip_members_full/i, 'Bu liste dolu (en fazla 20 kişi).'], [/trip_full/i, 'Liste dolu (en fazla 50 yer).'], [/too_many_trips/i, 'En fazla 20 ortak liste oluşturabilirsin.']];
const err31 = e => { const m = String((e && (e.message || e.details)) || e || ''); const hit = ERR31.find(([re]) => re.test(m)); return hit ? hit[1] : 'Bir hata oluştu, lütfen tekrar dene.'; };
const trDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const bar31 = pct => `<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${Math.max(0, Math.min(100, pct)).toFixed(1)}%"></i></div>`;
const backTo = () => XV && XV.kind === 'plan' ? 'plan' : null;

/* ---- gezinme: kendi görünümlerimiz geri dönüldüğünde kendi önceki sayfasını da hatırlasın ---- */
const MYK = new Set(['traveler', 'shared', 'strip', 'year', 'colls', 'coll', 'quiz', 'trails', 'trail', 'bflag', 'pack']);
const XMEM = {};
const sx31 = showX;
showX = function (kind, arg, prev) { if (MYK.has(kind)) XMEM[kind] = { arg, prev: prev || null }; sx31(kind, arg, prev); };
const hx31 = hideX;
hideX = function () { if (XV && XV.kind === 'trail') { const o = document.getElementById('routepath'); if (o) o.remove(); } hx31(); };
const xb31 = A.xback;
A.xback = () => {
  if (XV && XV.prev === 'place' && XMEM.placeSel && byId(XMEM.placeSel)) { const id = XMEM.placeSel; drawPath(null); hideX(); select(id); return; }
  if (XV && XV.prev && MYK.has(XV.prev) && XMEM[XV.prev]) { const k = XV.prev, m = XMEM[k]; TROUTE = null; drawPath(null); showX(k, m.arg, m.prev); reload31(k, m.arg); return; }
  xb31();
};
function reload31(k, arg) {
  if (k === 'shared') loadShared().then(rx31);
  else if (k === 'strip') loadStrip(arg).then(rx31);
  else if (k === 'traveler') loadTraveler(arg);
}
const rx31 = () => { if (XV && MYK.has(XV.kind)) renderX(); };

/* =========================================================================
   Takip ve gezgin profili
   ========================================================================= */
let FOLLOWING = new Set(), FOLLOW_FOR = null;
async function loadFollowing(force) {
  if (!ONLINE() || !ME) { FOLLOWING = new Set(); FOLLOW_FOR = null; return FOLLOWING; }
  if (FOLLOW_FOR === ME.id && !force) return FOLLOWING;
  try { const { data, error } = await sb.from('follows').select('followee').eq('follower', ME.id); if (error) throw error; FOLLOWING = new Set((data || []).map(r => r.followee)); FOLLOW_FOR = ME.id; } catch (_) { }
  return FOLLOWING;
}
const TRV = {};
async function loadTraveler(id) {
  try { const { data, error } = await sb.rpc('traveler', { p_uid: id }); if (error) throw error; TRV[id] = data || null; } catch (_) { TRV[id] = null; }
  if (XV && XV.kind === 'traveler' && XV.arg === id) renderX();
}
function feedCard(x) {
  const p = byId(x.pid);
  return `<article class="card">
    <div class="ch">${avHTML(x.author, avOf(x.uid, x.av))}<div class="who">${x.ruid ? `<button class="wlink" data-a="tvl" data-v="${esc(x.ruid)}"><b translate="no">${esc(x.author)}</b></button>` : `<b translate="no">${esc(x.author)}</b>`}<span>${esc(x.ago)}</span></div></div>
    ${p ? `<button class="fplace" data-a="pick" data-v="${p.id}">📍 <span translate="no">${esc(p.n)}</span> · <span translate="no">${esc(p.il)}</span></button>` : ''}
    <div style="margin-top:6px">${stars(x.rating, '5 üzerinden ' + x.rating + ' puan')}</div>
    ${x.text ? `<p style="margin:6px 0 0" translate="no">${esc(x.text)}</p>${trlHTML(x.id, x.text)}` : ''}
    ${x.media ? `<div class="media">${mediaHTML(x.media)}</div>` : ''}
  </article>`;
}
function travelerHTML() {
  const id = XV.arg, p = TRV[id];
  if (p === undefined) return '<h1 class="xh">Gezgin</h1><p class="note">Yükleniyor…</p>';
  if (!p) return '<h1 class="xh">Gezgin</h1><div class="box"><b>Bu gezgin bulunamadı.</b></div>';
  let since = ''; try { since = new Date(p.since).toLocaleDateString(LOC(), { month: 'long', year: 'numeric' }); } catch (_) { }
  const mine = !!(ME && ME.id === id), posts = S.posts.filter(x => x.ruid === id && !x.hidden).slice(0, 20);
  const st = [['Yer', p.visits], ['İl', p.provinces], ['Yorum', p.reviews], ['Fotoğraf', p.photos], ['Takipçi', p.followers], ['Takip', p.following]];
  return `<div class="trv">${avHTML(p.name, p.avatar_path ? pubUrl(p.avatar_path) : null, 'width:84px;height:84px;font-size:32px')}
    <h1 class="xh" translate="no" style="margin:8px 0 0">${esc(p.name)}</h1>${since ? `<p class="count" style="margin:2px 0 0">${esc(since)} tarihinden beri gezgin</p>` : ''}
    ${mine ? '' : `<button class="btn${p.i_follow ? '' : ' pri'}" style="margin-top:12px;min-width:180px" data-a="tfollow" data-v="${esc(id)}">${p.i_follow ? '✓ <span>Takip ediliyor</span>' : '＋ <span>Takip et</span>'}</button>`}</div>
    <div class="tstats">${st.map(([l, v]) => `<div><b>${fmt(v || 0)}</b><span>${l}</span></div>`).join('')}</div>
    <p class="note">Gezginin hangi yerlere gittiği gizlidir; yalnızca sayılar görünür.</p>
    <h2 class="xh2">Son yorumları</h2>${posts.length ? posts.map(feedCard).join('') : '<p class="note">Henüz yorum yok.</p>'}
    ${mine ? '<button class="btn" style="width:100%;margin-top:12px" data-a="myear">📅 <span>Yıllık gezi özetim</span></button>' : ''}`;
}
/* yorumlarda gezgin adına dokununca profili; yabancı dildeki yorumlarda "Çevir" */
const ph31 = postHTML;
postHTML = function (x) {
  let h = ph31(x);
  if (x.ruid && !x.sample && ONLINE()) h = h.replace(`<div class="who"><b>${esc(x.author)}</b>`, `<div class="who"><button class="wlink" data-a="tvl" data-v="${esc(x.ruid)}"><b>${esc(x.author)}</b></button>`);
  if (x.text && !x.hidden) h = h.replace(`translate="no">${esc(x.text)}</p>`, `translate="no">${esc(x.text)}</p>${trlHTML(x.id, x.text)}`);
  return h;
};
/* vitrin: takip ettiklerim */
function followFeedHTML() {
  if (!CUR || !ME) return '<div class="box"><b>Takip etmek için giriş yap</b></div>';
  if (FOLLOW_FOR !== ME.id) return '<p class="note">Yükleniyor…</p>';
  if (!FOLLOWING.size) return '<div class="box"><b>Henüz kimseyi takip etmiyorsun.</b><p class="note">Bir yorumdaki gezgin adına dokunup profiline gidebilir, takip edebilirsin.</p></div>';
  const list = S.posts.filter(x => FOLLOWING.has(x.ruid) && !x.hidden).slice(0, 40);
  return list.length ? list.map(feedCard).join('') : '<div class="box"><b>Takip ettiklerin henüz bir şey paylaşmadı.</b></div>';
}
const rph31 = renderPhotos;
renderPhotos = function () {
  if ($('photov').hidden) return;
  if (S.psort === 'follow') {
    $('photos').innerHTML = `${segHTML()}<h1 style="margin-top:12px">Takip ettiklerim</h1>
      <div class="chips" style="margin-top:10px">${chip('En çok beğenilen', false, 'psort', 'top')}${chip('En yeni', false, 'psort', 'new')}${chip('Takip ettiklerim', true, 'psort', 'follow')}</div>${followFeedHTML()}`;
    return;
  }
  rph31();
  const c = ONLINE() && $('photos').querySelector('[data-a="psort"][data-v="new"]');
  if (c) c.insertAdjacentHTML('afterend', chip('Takip ettiklerim', false, 'psort', 'follow'));
};
const ps31 = A.psort;
A.psort = v => {
  if (v !== 'follow') return ps31(v);
  requireAuth(() => { S.psort = 'follow'; renderPhotos(); loadFollowing(true).then(() => { if (S.psort === 'follow') renderPhotos(); }); }, 'Takip etmek için giriş yap');
};

/* =========================================================================
   Yorum çevirisi (MyMemory; tarayıcıdan doğrudan, metin 450 baytlık parçalara bölünür)
   ========================================================================= */
function guessLang(s) {
  if (/[Ѐ-ӿ]/.test(s)) return 'ru';
  if (/[؀-ۿ]/.test(s)) return 'ar';
  if (/[Ͱ-Ͽ]/.test(s)) return 'el';
  if (/[֐-׿]/.test(s)) return 'he';
  if (/[가-힯]/.test(s)) return 'ko';
  if (/[぀-ヿ]/.test(s)) return 'ja';
  if (/[一-鿿]/.test(s)) return 'zh';
  if (/[çğıöşüİ]/i.test(s) || /\b(ve|bir|çok|için|güzel|ama|bu|da|de)\b/i.test(s)) return 'tr';
  if (/[äöüß]/i.test(s) || /\b(und|nicht|sehr|ist|das)\b/i.test(s)) return 'de';
  if (/\b(le|la|les|est|très|une|et)\b/i.test(s)) return 'fr';
  if (/\b(el|los|muy|es|una|y|pero)\b/i.test(s)) return 'es';
  return 'en';
}
const MMC = l => ({ no: 'nb', zh: 'zh-CN', ku: 'ku' }[l] || l);
function chunks31(s, max) {
  max = max || 450; const enc = x => new TextEncoder().encode(x).length;
  const parts = s.replace(/([.!?…])\s+/g, '$1\n').split('\n'), out = []; let cur = '';
  for (const part of parts) {
    if (cur && enc(cur + ' ' + part) > max) { out.push(cur); cur = part; } else cur = cur ? cur + ' ' + part : part;
    while (enc(cur) > max) { out.push(cur.slice(0, 150)); cur = cur.slice(150); }
  }
  if (cur) out.push(cur);
  return out;
}
const TRC = {}, TRS = {};
async function translate31(text, to) {
  const from = guessLang(text), key = from + '|' + to + '|' + text;
  if (TRC[key]) return TRC[key];
  const parts = await Promise.all(chunks31(text).map(async q => {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${MMC(from)}|${MMC(to)}`);
    const j = await r.json();
    if (Number(j && j.responseStatus) !== 200 || !(j.responseData && j.responseData.translatedText)) throw new Error('translate');
    return String(j.responseData.translatedText);
  }));
  return (TRC[key] = parts.join(' '));
}
function trlInner(id) {
  const s = TRS[id] || {};
  return `<button class="trlb" data-a="trl" data-v="${esc(id)}">${s.busy ? '<span>Çevriliyor…</span>' : s.out ? '<span>Orijinalini göster</span>' : '🌐 <span>Çevir</span>'}</button>
    ${s.err ? '<p class="note" style="color:var(--danger,#C0392B);margin:2px 0 0">Şu an çevrilemedi, sonra tekrar dene.</p>' : ''}
    ${s.out ? `<p class="trlo" translate="no">${esc(s.out)}</p><p class="note" style="margin:2px 0 0">Makine çevirisi · MyMemory</p>` : ''}`;
}
function trlHTML(id, text) {
  const L = window.LANG || 'tr';
  if (!text || text.length < 3 || guessLang(text) === L) return '';
  return `<div class="trl" data-trl="${esc(id)}">${trlInner(id)}</div>`;
}
const trlPaint = id => document.querySelectorAll(`[data-trl="${CSS.escape(String(id))}"]`).forEach(el => { el.innerHTML = trlInner(id); });
A.trl = async v => {
  const s = TRS[v] = TRS[v] || {};
  if (s.out) { s.out = null; trlPaint(v); return; }
  const x = S.posts.find(q => String(q.id) === String(v)); if (!x || !x.text || s.busy) return;
  s.busy = true; s.err = false; trlPaint(v);
  try { s.out = await translate31(x.text, window.LANG || 'tr'); } catch (_) { s.err = true; } finally { s.busy = false; trlPaint(v); }
};

/* =========================================================================
   Ortak gezi listeleri
   ========================================================================= */
const SH = { list: null, cur: null, confirm: false, pick: null };
async function loadShared() {
  try { const { data, error } = await sb.from('shared_trips').select('id,owner,title,invite,created_at').order('created_at', { ascending: false }); if (error) throw error; SH.list = data || []; }
  catch (_) { SH.list = []; }
  return SH.list;
}
async function loadStrip(id) {
  try {
    const [a, b, c] = await Promise.all([
      sb.from('shared_trips').select('id,owner,title,invite,created_at').eq('id', id).maybeSingle(),
      sb.from('shared_trip_items').select('place_id,added_by,created_at,profiles!shared_trip_items_added_by_fkey(name)').eq('trip_id', id).order('created_at'),
      sb.from('shared_trip_members').select('user_id,profiles!shared_trip_members_user_id_fkey(name,avatar_path)').eq('trip_id', id),
    ]);
    SH.cur = { id, trip: a.data || null, items: b.data || [], members: c.data || [] };
  } catch (_) { SH.cur = { id, trip: null, items: [], members: [] }; }
}
function openStrip(id, prev) { SH.cur = null; SH.confirm = false; showX('strip', id, prev); loadStrip(id).then(rx31); }
const shLink = tr => `${SITE()}?ortak=${tr.id}&k=${tr.invite}`;
function sharedHTML() {
  if (!CUR) return '<h1 class="xh">Ortak listeler</h1><div class="box"><b>Ortak liste için giriş yap</b></div>';
  const l = SH.list;
  return `<h1 class="xh">Ortak listeler</h1><p class="note">Arkadaşlarınla ya da ailenle birlikte gezi listesi hazırla. Bağlantıyı paylaş, katılan herkes yer ekleyip çıkarabilir.</p>
    <form class="shform" data-f="shnew"><input class="in" id="shtitle" maxlength="80" placeholder="Liste adı (ör. Kapadokya hafta sonu)" aria-label="Liste adı (ör. Kapadokya hafta sonu)"><button class="btn pri" type="submit">Oluştur</button></form>
    ${l === null ? '<p class="note">Yükleniyor…</p>' : !l.length ? '<p class="note">Henüz ortak listen yok.</p>'
      : `<div class="planlist">${l.map(x => `<button class="planit" data-a="shopen" data-v="${esc(x.id)}"><span class="pic" aria-hidden="true">👥</span><span class="pt"><b translate="no">${esc(x.title)}</b><span class="count">${x.owner === ME.id ? 'Sen oluşturdun' : 'Katıldığın liste'}</span></span><span class="count" aria-hidden="true">›</span></button>`).join('')}</div>`}
    <p class="note">En fazla ${fmt(50)} yer ve ${fmt(20)} kişi.</p>`;
}
function stripHTML() {
  const c = SH.cur;
  if (!c || c.id !== XV.arg) return '<h1 class="xh">Ortak liste</h1><p class="note">Yükleniyor…</p>';
  if (!c.trip) return '<h1 class="xh">Ortak liste</h1><div class="box"><b>Bu listeyi göremiyorsun.</b><p class="note">Listeye katılmak için sana gönderilen bağlantıyı aç.</p></div>';
  const owner = !!(ME && c.trip.owner === ME.id), items = c.items.filter(x => byId(x.place_id));
  return `<h1 class="xh" translate="no">${esc(c.trip.title)}</h1>
    <div class="acts"><button class="btn pri" data-a="shinv">↗ <span>Davet et</span></button><button class="btn" data-a="shroute"${items.length ? '' : ' disabled'}>🧭 <span>Rotayı göster</span></button></div>
    <h2 class="xh2"><span>Yerler</span> (${fmt(items.length)})</h2>
    ${items.length ? `<div class="planlist">${items.map(x => { const p = byId(x.place_id), who = x.profiles && x.profiles.name;
      return `<div class="shrow"><button class="planit" data-a="pick" data-v="${p.id}"><span class="pt"><b translate="no">${esc(p.n)}</b><span class="count"><span translate="no">${esc(p.il)}</span>${who ? ` · <span>${esc(who)} ekledi</span>` : ''}</span></span></button><button class="ib" data-a="shrm" data-v="${p.id}" aria-label="Listeden çıkar" title="Listeden çıkar">✕</button></div>`; }).join('')}</div>` : '<p class="note">Henüz yer eklenmedi.</p>'}
    <div class="shadd"><input class="in" id="shq" autocomplete="off" placeholder="Yer ara ve ekle" aria-label="Yer ara ve ekle"><div id="shres"></div></div>
    <h2 class="xh2">Katılanlar</h2><p class="note" style="margin-top:0">${owner ? 'Sen (liste sahibi)' : 'Liste sahibi ve davetliler'}</p>
    ${c.members.length ? c.members.map(m => { const n = (m.profiles && m.profiles.name) || '?';
      return `<button class="mrow" data-a="tvl" data-v="${esc(m.user_id)}">${avHTML(n, avUrl(m.profiles), 'width:30px;height:30px;font-size:13px')}<b translate="no">${esc(n)}</b></button>`; }).join('') : '<p class="note">Henüz kimse katılmadı. Davet bağlantısını paylaş.</p>'}
    <p class="note">Oluşturuldu: ${esc(agoText(c.trip.created_at))}</p>
    <button class="btn" style="width:100%;margin-top:10px" data-a="shleave">${SH.confirm ? '<span>Emin misin? Onaylamak için tekrar dokun</span>' : owner ? '<span>Listeyi sil</span>' : '<span>Listeden ayrıl</span>'}</button>`;
}
const norm31 = s => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
document.addEventListener('input', e => {
  if (e.target.id !== 'shq') return;
  const q = norm31(e.target.value.trim()), box = $('shres'); if (!box) return;
  if (q.length < 2) { box.innerHTML = ''; return; }
  const have = new Set(((SH.cur && SH.cur.items) || []).map(x => x.place_id));
  const hits = PLACES.filter(p => !have.has(p.id) && !p.closed && (norm31(p.n).includes(q) || norm31(p.il).startsWith(q))).slice(0, 6);
  box.innerHTML = hits.length ? `<div class="planlist" style="margin-top:6px">${hits.map(p => `<button class="planit" data-a="shaddp" data-v="${p.id}"><span class="pic" aria-hidden="true">＋</span><span class="pt"><b translate="no">${esc(p.n)}</b><span class="count" translate="no">${esc(p.il)}</span></span></button>`).join('')}</div>` : '<p class="note">Sonuç yok</p>';
});
document.addEventListener('submit', async ev => {
  const f = ev.target.closest && ev.target.closest('form[data-f="shnew"]'); if (!f) return;
  ev.preventDefault();
  const title = ($('shtitle').value || '').trim().slice(0, 80); if (!title || !ME) return;
  const { data, error } = await sb.from('shared_trips').insert({ title, owner: ME.id }).select('id').single();
  if (error) { toast(err31(error)); return; }
  SH.list = null; loadShared(); openStrip(data.id, 'shared');
});
async function shInsert(tripId, pid) {
  const { error } = await sb.from('shared_trip_items').insert({ trip_id: tripId, place_id: pid, added_by: ME.id });
  if (error && error.code !== '23505') { toast(err31(error)); return false; }
  return true;
}
/* yer sayfası: "Ortak listeye ekle" */
function shPickHTML(pid) {
  const l = SH.list;
  return `<div class="box"><b>👥 <span>Ortak listeye ekle</span></b>${l === null ? '<p class="note">Yükleniyor…</p>'
    : `${l.length ? `<div class="planlist" style="margin-top:8px">${l.map(x => `<button class="planit" data-a="shput" data-v="${esc(x.id)}"><span class="pic" aria-hidden="true">👥</span><span class="pt"><b translate="no">${esc(x.title)}</b></span><span class="count" aria-hidden="true">＋</span></button>`).join('')}</div>` : '<p class="note">Henüz ortak listen yok.</p>'}
      <button class="btn" style="width:100%;margin-top:8px" data-a="mshared">＋ <span>Yeni ortak liste</span></button>`}</div>`;
}
Object.assign(A, {
  tvl: v => { if (!v || !ONLINE()) return; const from = S.sel; if (from) XMEM.placeSel = from; const prev = from ? 'place' : (XV ? XV.kind : null); showX('traveler', v, prev === 'traveler' ? null : prev); loadTraveler(v); },
  tfollow: v => requireAuth(async () => {
    const p = TRV[v]; if (!p || !ME || ME.id === v) return;
    try {
      if (p.i_follow) { const { error } = await sb.from('follows').delete().eq('follower', ME.id).eq('followee', v); if (error) throw error; }
      else { const { error } = await sb.from('follows').insert({ follower: ME.id, followee: v }); if (error && error.code !== '23505') throw error; }
      await loadFollowing(true); await loadTraveler(v);
    } catch (_) { toast('Bir hata oluştu, lütfen tekrar dene.'); }
  }, 'Takip etmek için giriş yap'),
  mshared: () => requireAuth(() => { toggleMenu(false); SH.list = null; showX('shared', null, backTo()); loadShared().then(rx31); }, 'Ortak liste için giriş yap'),
  shopen: v => openStrip(v, 'shared'),
  shinv: () => { const c = SH.cur; if (c && c.trip) shareLink(shLink(c.trip), tx('Ortak gezi listeme katıl'), c.trip.title); },
  shroute: () => { const c = SH.cur; if (!c) return; const ids = c.items.map(x => x.place_id).filter(id => byId(id)).slice(0, 23); if (!ids.length) return; showX('trip', ids, 'strip'); tripRoute(); },
  shrm: async v => { const c = SH.cur; if (!c) return; const { error } = await sb.from('shared_trip_items').delete().eq('trip_id', c.id).eq('place_id', v); if (error) toast(err31(error)); else { await loadStrip(c.id); rx31(); } },
  shaddp: async v => { const c = SH.cur; if (!c || !ME) return; if (await shInsert(c.id, v)) { toast('Listeye eklendi'); await loadStrip(c.id); rx31(); } },
  shleave: async () => {
    const c = SH.cur; if (!c || !c.trip || !ME) return;
    if (!SH.confirm) { SH.confirm = true; rx31(); return; }
    SH.confirm = false;
    const owner = c.trip.owner === ME.id;
    const { error } = owner ? await sb.from('shared_trips').delete().eq('id', c.id) : await sb.from('shared_trip_members').delete().eq('trip_id', c.id).eq('user_id', ME.id);
    if (error) { toast(err31(error)); return; }
    toast(owner ? 'Liste silindi' : 'Listeden ayrıldın'); SH.list = null; showX('shared', null, (XMEM.shared && XMEM.shared.prev) || null); loadShared().then(rx31);
  },
  shadd: v => requireAuth(() => { SH.pick = v; const el = $('shpick'); if (el) el.innerHTML = shPickHTML(v); SH.list = null; loadShared().then(() => { const e2 = $('shpick'); if (e2 && SH.pick === S.sel) e2.innerHTML = shPickHTML(S.sel); }); }, 'Ortak liste için giriş yap'),
  shput: async v => { const pid = S.sel, tr = (SH.list || []).find(x => x.id === v); if (!pid || !tr || !ME) return; if (await shInsert(v, pid)) toast(`${tr.title} listesine eklendi`); SH.pick = null; const el = $('shpick'); if (el) el.innerHTML = ''; },
});
/* ?ortak=<liste>&k=<davet kodu> bağlantısı: giriş yapılmışsa listeye katılır */
(function openOrtakLink() {
  let q = null; try { q = new URLSearchParams(location.search); } catch (_) { }
  const id = q && q.get('ortak'), k = q && q.get('k');
  if (!id || !k || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{6,64}$/i.test(k)) return;
  try { history.replaceState(null, '', location.pathname); } catch (_) { }
  const join = async () => {
    try { const { data, error } = await sb.rpc('join_trip', { p_trip: id, p_code: k }); if (error) throw error;
      toast(data && data.already ? 'Bu listeye zaten katıldın' : `${(data && data.title) || ''} listesine katıldın`); openStrip(id, null);
    } catch (e) { toast(err31(e)); }
  };
  let n = 0;
  const go = () => {
    if (!ONLINE() || (!CUR && n < 8)) { if (n++ < 24) setTimeout(go, 500); return; }
    if (CUR) join(); else requireAuth(join, 'Ortak liste için giriş yap');
  };
  setTimeout(go, 700);
})();

/* =========================================================================
   Yıllık gezi özeti (paylaşılabilir görsel)
   ========================================================================= */
const YR = { d: null, for: null };
async function loadYear() {
  const y = new Date().getFullYear(), from = `${y}-01-01`, to = `${y + 1}-01-01`;
  try {
    const [v, r, j] = await Promise.all([
      sb.from('visits').select('place_id,created_at').eq('user_id', ME.id).gte('created_at', from).lt('created_at', to),
      sb.from('reviews').select('id,place_id,photo_path,photo_hidden,photo_pending,created_at,photo_likes(user_id),review_likes(user_id)').eq('user_id', ME.id).gte('created_at', from).lt('created_at', to),
      sb.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', ME.id).gte('created_at', from).lt('created_at', to),
    ]);
    const visits = (v.data || []).map(x => byId(x.place_id)).filter(Boolean), revs = r.data || [];
    const photos = revs.filter(x => x.photo_path && !x.photo_hidden && !x.photo_pending);
    const likes = revs.reduce((a, x) => a + ((x.photo_likes || []).length) + ((x.review_likes || []).length), 0);
    const best = photos.slice().sort((a, c) => (c.photo_likes || []).length - (a.photo_likes || []).length)[0];
    YR.d = { y, visits, reviews: revs.length, photos: photos.length, likes, journals: j.count || 0, top: best ? { url: pubUrl(best.photo_path), likes: (best.photo_likes || []).length, n: (byId(best.place_id) || {}).n || '' } : null };
  } catch (_) { YR.d = { y, visits: [], reviews: 0, photos: 0, likes: 0, journals: 0, top: null }; }
  YR.for = ME.id; rx31();
}
function yearFacts(d) {
  const prov = new Set(d.visits.map(p => p.il)), regs = new Set(d.visits.map(p => p.r)), cats = {}, ils = {};
  d.visits.forEach(p => { cats[p.c] = (cats[p.c] || 0) + 1; ils[p.il] = (ils[p.il] || 0) + 1; });
  const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0], topIl = Object.entries(ils).sort((a, b) => b[1] - a[1])[0];
  return { stats: [[d.visits.length, 'Gezilen yer'], [prov.size, 'İl'], [regs.size, 'Bölge'], [d.reviews, 'Yorum'], [d.photos, 'Fotoğraf'], [d.likes, 'Aldığın beğeni']], topCat: topCat && CATS[topCat[0]], topIl: topIl && topIl[0] };
}
function yearHTML() {
  if (!CUR || !ME) return '<h1 class="xh">Yıllık gezi özeti</h1><div class="box"><b>Özetini görmek için giriş yap</b></div>';
  const d = YR.d; if (!d || YR.for !== ME.id) return '<h1 class="xh">Yıllık gezi özeti</h1><p class="note">Yükleniyor…</p>';
  const f = yearFacts(d);
  return `<h1 class="xh">Yıllık gezi özeti</h1>
    <div class="yrcard"><span class="yrk">Türkiye Gezi Rehberi</span><b class="yrt">${d.y} gezi özetim</b><span class="yrn" translate="no">${esc(CUR.name || '')}</span>
      <div class="yrg">${f.stats.map(([v, l]) => `<div><b>${fmt(v)}</b><span>${l}</span></div>`).join('')}</div>
      ${f.topIl ? `<p>📍 <span>En çok gezdiğin il: ${esc(f.topIl)}</span></p>` : ''}
      ${f.topCat ? `<p>⭐ <span>En sevdiğin tür:</span> <span>${esc(f.topCat)}</span></p>` : ''}
      ${d.journals ? `<p>📔 <span>${fmt(d.journals)} günlük notu</span></p>` : ''}
      ${d.top && d.top.url ? `<img src="${esc(d.top.url)}" alt="" loading="lazy"><p class="yrs"><span>En beğenilen fotoğrafın</span> · <span translate="no">${esc(d.top.n)}</span> · ♥ ${fmt(d.top.likes)}</p>` : ''}
    </div>
    ${d.visits.length ? '' : '<p class="note">Bu yıl henüz “Gittim” işaretlediğin yer yok. Gezdikçe özetin dolacak.</p>'}
    <button class="btn pri" style="width:100%;margin-top:14px" data-a="yshare">↗ <span>Özetimi paylaş</span></button>`;
}
function yearPNG() {
  const d = YR.d, f = yearFacts(d), W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rtl = document.documentElement.dir === 'rtl', X = x => rtl ? W - x : x, F = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  if (rtl) { g.direction = 'rtl'; g.textAlign = 'right'; }
  g.fillStyle = '#B23A1E'; g.fillRect(0, 0, W, H);
  const text = (s, x, y, font, col) => { g.font = font + ' ' + F; g.fillStyle = col; g.fillText(s, X(x), y, W - 144); };
  text(tx('Türkiye Gezi Rehberi'), 72, 120, '800 34px', '#FFE8DC');
  text(tx(`${d.y} gezi özetim`), 72, 205, '900 74px', '#FFFFFF');
  text(CUR.name || '', 72, 262, '600 36px', '#FFE8DC');
  f.stats.forEach(([v, l], i) => {
    const x = 72 + (i % 2) * 480, y = 310 + Math.floor(i / 2) * 220;
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); if (g.roundRect) g.roundRect(rtl ? W - x - 456 : x, y, 456, 196, 28); else g.rect(rtl ? W - x - 456 : x, y, 456, 196); g.fill();
    text(fmt(v), x + 32, y + 106, '900 80px', '#FFFFFF'); text(tx(l), x + 32, y + 160, '700 34px', '#FFE8DC');
  });
  let y = 1010;
  if (f.topIl) { text('📍 ' + tx(`En çok gezdiğin il: ${f.topIl}`), 72, y, '700 38px', '#FFFFFF'); y += 62; }
  if (f.topCat) { text('⭐ ' + tx('En sevdiğin tür:') + ' ' + tx(f.topCat), 72, y, '700 38px', '#FFFFFF'); y += 62; }
  if (d.journals) { text('📔 ' + tx(`${fmt(d.journals)} günlük notu`), 72, y, '700 38px', '#FFFFFF'); y += 62; }
  text(location.host || 'Türkiye Gezi Rehberi', 72, H - 64, '600 30px', '#FFE8DC');
  return new Promise(res => c.toBlob(res, 'image/png'));
}
A.yshare = async () => {
  if (!YR.d || !CUR) return;
  try {
    const blob = await yearPNG(), name = `gezi-ozetim-${YR.d.y}.png`, file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: tx(`${YR.d.y} gezi özetim`) }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Görsel indirildi');
  } catch (e) { if (!(e && e.name === 'AbortError')) toast('Bir hata oluştu, lütfen tekrar dene.'); }
};
A.myear = () => requireAuth(() => { toggleMenu(false); showX('year', null, XV ? XV.kind : null); if (YR.for !== ME.id) { YR.d = null; loadYear(); } }, 'Özetini görmek için giriş yap');

/* =========================================================================
   Koleksiyonlar
   ========================================================================= */
const COLLS = [
  { id: 'unesco', icon: '🌍', name: 'UNESCO Dünya Mirası', desc: 'Türkiye’nin Dünya Mirası Listesi’ndeki 21 alanı', groups: [
    ['İstanbul’un Tarihi Alanları', ['ayasofya', 'mavi', 'topkapi', 'suleymaniye']], ['Göreme ve Kapadokya', ['goreme']], ['Divriği Ulu Camii ve Darüşşifası', ['divrigi']],
    ['Hattuşa', ['hattusa']], ['Nemrut Dağı', ['nemrutdagi']], ['Hierapolis-Pamukkale', ['pamukkale']], ['Ksanthos-Letoon', ['letoon', 'ksantos']], ['Safranbolu', ['safranbolu']],
    ['Truva Antik Kenti', ['truva']], ['Edirne Selimiye Camii', ['selimiye']], ['Çatalhöyük', ['catalhoyuk']], ['Bursa ve Cumalıkızık', ['cumalikizik', 'bursaulu']],
    ['Bergama', ['bergama', 'asklepion']], ['Efes', ['efes']], ['Ani', ['ani']], ['Afrodisias', ['afrodisias']], ['Göbeklitepe', ['gobeklitepe']],
    ['Diyarbakır Surları ve Hevsel Bahçeleri', ['diyarbakir', 'hevsel']], ['Arslantepe Höyüğü', ['arslantepe']], ['Gordion', ['gordion']], ['Ahşap direkli Selçuklu camileri', ['esrefoglu', 'mahmutbey', 'sivrihisar']]] },
  { id: 'bolge', icon: '🧭', name: '7 bölge', desc: 'Her coğrafi bölgede en az bir yer', regions: true },
  { id: 'egeantik', icon: '🏛', name: 'Ege’nin antik kentleri', desc: 'Ege Bölgesi’ndeki antik kentler ve ören yerleri', pick: p => p.c === 'antik' && p.r === 1 },
  { id: 'istcami', icon: '🕌', name: 'İstanbul’un camileri', desc: 'Rehberdeki İstanbul camileri', pick: p => p.c === 'cami' && p.il === 'İstanbul' },
  { id: 'kapadokya', icon: '🎈', name: 'Kapadokya', desc: 'Nevşehir’deki vadiler, yeraltı şehirleri ve kasabalar', pick: p => p.il === 'Nevşehir' },
  { id: 'saray', icon: '👑', name: 'Saraylar', desc: 'Rehberdeki bütün saraylar', pick: p => p.c === 'saray' },
  { id: 'kule', icon: '🗼', name: 'Kuleler', desc: 'Rehberdeki bütün kuleler', pick: p => p.c === 'kule' },
  { id: 'kaplica', icon: '♨️', name: 'Kaplıcalar', desc: 'Rehberdeki bütün kaplıcalar', pick: p => p.c === 'kaplica' },
  { id: 'kanyon', icon: '🏞', name: 'Kanyonlar', desc: 'Rehberdeki bütün kanyonlar', pick: p => p.c === 'kanyon' },
  { id: 'magara', icon: '🦇', name: 'Mağaralar', desc: 'Rehberdeki bütün mağaralar', pick: p => p.c === 'magara' },
  { id: 'ada', icon: '🏝', name: 'Adalar', desc: 'Rehberdeki bütün adalar', pick: p => p.c === 'ada' },
];
function collProgress(c) {
  const vis = S.visited; let items;
  if (c.groups) items = c.groups.map(([label, ids]) => { const real = ids.filter(id => byId(id)); return { label, ids: real, ok: real.some(id => vis.has(id)) }; }).filter(g => g.ids.length);
  else if (c.regions) items = REGIONS.map((label, r) => { const ids = PLACES.filter(p => p.r === r).map(p => p.id); return { label, ids, ok: ids.some(id => vis.has(id)) }; });
  else items = PLACES.filter(p => !p.closed && c.pick(p)).map(p => ({ label: p.n, ids: [p.id], ok: vis.has(p.id) }));
  return { done: items.filter(i => i.ok).length, total: items.length, items };
}
function collsHTML() {
  const rows = COLLS.map(c => ({ c, pr: collProgress(c) })), done = rows.filter(r => r.pr.total && r.pr.done === r.pr.total);
  return `<h1 class="xh">Koleksiyonlar</h1><p class="note">Listeleri tamamla, rozetini al. “Gittim” işaretledikçe ilerler.</p>
    ${done.length ? `<div class="box"><b>🏅 <span>Tamamladıkların</span></b><p style="margin:4px 0 0">${done.map(r => `<span>${esc(r.c.name)}</span>`).join(', ')}</p></div>` : ''}
    ${rows.map(({ c, pr }) => `<button class="box coll" data-a="collopen" data-v="${c.id}"><span class="cic" aria-hidden="true">${c.icon}</span><span class="ct"><b><span>${esc(c.name)}</span>${pr.total && pr.done === pr.total ? ' 🏅' : ''}</b><span class="count">${esc(c.desc)}</span>${bar31(pr.total ? pr.done / pr.total * 100 : 0)}</span><b class="cn">${fmt(pr.done)}/${fmt(pr.total)}</b></button>`).join('')}
    ${CUR ? '' : '<p class="note">İlerlemen bu tarayıcıda saklanır; giriş yaparsan hesabına kaydedilir.</p>'}`;
}
function collHTML() {
  const c = COLLS.find(x => x.id === XV.arg); if (!c) return '<h1 class="xh">Koleksiyonlar</h1>';
  const pr = collProgress(c);
  return `<h1 class="xh">${c.icon} <span>${esc(c.name)}</span></h1><p class="cbig">${fmt(pr.done)} / ${fmt(pr.total)}</p>${bar31(pr.total ? pr.done / pr.total * 100 : 0)}
    ${pr.total && pr.done === pr.total ? '<p class="cdone">🏅 <span>Tebrikler, bu koleksiyonu tamamladın!</span></p>' : ''}
    <div class="planlist" style="margin-top:12px">${pr.items.map(it => { const first = byId(it.ids.find(x => S.visited.has(x)) || it.ids[0]);
      const sub = c.regions ? `<span class="count"><span>${fmt(it.ids.length)} yer</span></span>` : c.groups && first ? `<span class="count" translate="no">${esc(first.n)} · ${esc(first.il)}</span>` : first ? `<span class="count" translate="no">${esc(first.il)}</span>` : '';
      return `<button class="planit" data-a="pick" data-v="${first ? first.id : ''}"><span class="pic" aria-hidden="true">${it.ok ? '✅' : '⬜'}</span><span class="pt"><b${c.regions || c.groups ? '' : ' translate="no"'}>${esc(it.label)}</b>${sub}</span><span class="count" aria-hidden="true">›</span></button>`; }).join('')}</div>
    ${c.id === 'unesco' ? '<p class="note">Liste UNESCO’nun 2023 itibarıyla Türkiye’deki 21 Dünya Mirası alanına göredir.</p>' : ''}`;
}

/* =========================================================================
   "Neresi bu?" — fotoğraftan yeri bil. Günlük 5 soru herkes için aynı.
   ========================================================================= */
function rng31(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hash31 = s => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
function makeQuiz(n, seed) {
  const all = PLACES, pool = all.filter(p => !p.closed && photoOf(p.id)), r = seed ? rng31(hash31(seed)) : Math.random;
  const pick = arr => arr[Math.floor(r() * arr.length)], qs = [], used = new Set();
  let guard = 0;
  while (qs.length < n && guard++ < 500) {
    const p = pick(pool); if (!p || used.has(p.id)) continue; used.add(p.id);
    const others = all.filter(x => x.id !== p.id && x.il !== p.il && !x.closed), same = others.filter(x => x.c === p.c), opts = [p];
    let g2 = 0;
    while (opts.length < 4 && g2++ < 200) { const o = pick(same.length >= 6 ? same : others); if (o && !opts.some(x => x.id === o.id || x.n === o.n)) opts.push(o); }
    if (opts.length < 4) continue;
    opts.sort(() => r() - 0.5); qs.push({ p, opts });
  }
  return qs;
}
const QZ = { mode: 'daily', qs: [], i: 0, score: 0, ans: null, t0: 0, top: null };
function quizSaved() { const j = ls.get('gezi-quiz', {}) || {}; return { done: j.day === trDay() ? j.score : null, best: j.best || 0 }; }
async function loadQuizTop() {
  try { const { data, error } = await sb.from('quiz_scores').select('score,ms,profiles(name)').eq('day', trDay()).order('score', { ascending: false }).order('ms', { ascending: true }).limit(20); if (error) throw error; QZ.top = data || []; }
  catch (_) { QZ.top = []; }
  if (XV && XV.kind === 'quiz' && !QZ.qs.length) renderX();
}
function quizHTML() {
  const q = QZ.qs[QZ.i];
  if (q) {
    const ph = photoOf(q.p.id);
    return `<h1 class="xh">Neresi bu?</h1><p class="count" style="font-weight:700"><span>Soru ${fmt(QZ.i + 1)}/${fmt(QZ.qs.length)}</span> · <span>Puan ${fmt(QZ.score)}</span></p>
      <div class="qimg"><img src="${esc(ph.url(Math.min(1280, 960)))}" alt="Neresi bu?" decoding="async"></div><p class="note" style="margin-top:4px" translate="no">© ${esc(ph.author)} · ${esc(ph.license)}</p>
      ${q.opts.map(o => { const right = QZ.ans && o.id === q.p.id, wrong = QZ.ans === o.id && o.id !== q.p.id;
        return `<button class="qopt${right ? ' ok' : wrong ? ' bad' : ''}" data-a="qzans" data-v="${o.id}"${QZ.ans ? ' aria-disabled="true"' : ''}><b translate="no">${right ? '✓ ' : wrong ? '✗ ' : ''}${esc(o.n)}</b><span translate="no">${esc(o.il)}</span></button>`; }).join('')}`;
  }
  const sv = quizSaved();
  return `<h1 class="xh">Neresi bu?</h1><p class="qbig" aria-hidden="true">📸</p><p class="note" style="text-align:center">Fotoğrafa bak, Türkiye’nin neresi olduğunu bil.</p>
    <div class="box"><b>Günün sorusu</b><p class="note" style="margin:2px 0 0">Herkes için aynı 5 fotoğraf; günde bir kez oynanır.</p>
      ${sv.done != null ? `<p class="qres">Bugünkü puanın: ${fmt(sv.done)}/5</p>` : '<button class="btn pri" style="width:100%;margin-top:10px" data-a="qzstart" data-v="daily">Günün sorusunu oyna</button>'}
      ${CUR ? '' : '<p class="note">Skor tablosuna girmek için giriş yap.</p>'}</div>
    <div class="box"><b>Serbest oyun</b><p class="note" style="margin:2px 0 0">Rastgele 10 fotoğraf. En iyi skorun: ${fmt(sv.best)}/10</p><button class="btn" style="width:100%;margin-top:10px" data-a="qzstart" data-v="free">Oyna</button></div>
    <h2 class="xh2">Bugünün skor tablosu</h2>
    ${!ONLINE() ? '<p class="note">Skor tablosu için internet bağlantısı gerekir.</p>' : QZ.top === null ? '<p class="note">Yükleniyor…</p>' : !QZ.top.length ? '<p class="note">Bugün henüz kimse oynamadı.</p>'
      : `<ol class="qtop">${QZ.top.map((r, k) => `<li><span class="rank">${k + 1}</span><b translate="no">${esc((r.profiles && r.profiles.name) || '?')}</b><b>${fmt(r.score)}/5</b><span class="count">${fmt(Math.round(r.ms / 1000))} sn</span></li>`).join('')}</ol>`}
    <p class="note">Fotoğraflar: Wikimedia Commons</p>`;
}
async function quizFinish(final) {
  const ms = Date.now() - QZ.t0, sv = ls.get('gezi-quiz', {}) || {};
  if (QZ.mode === 'daily') {
    ls.set('gezi-quiz', { day: trDay(), score: final, best: Math.max(sv.best || 0, final) });
    if (CUR && ME && ONLINE()) { const { error } = await sb.from('quiz_scores').insert({ user_id: ME.id, day: trDay(), score: final, ms: Math.min(ms, 3600000) }); if (error && error.code !== '23505') toast('Bir hata oluştu, lütfen tekrar dene.'); }
    toast(`Bugünkü puanın: ${final}/5`);
  } else {
    if (final > (sv.best || 0)) ls.set('gezi-quiz', { ...sv, best: final });
    toast(`Puan ${final}/10`);
  }
  if (ONLINE()) loadQuizTop();
}
Object.assign(A, {
  mquiz: () => { toggleMenu(false); QZ.qs = []; showX('quiz', null, backTo()); if (ONLINE()) loadQuizTop(); },
  qzstart: v => { if (v === 'daily' && quizSaved().done != null) return; QZ.mode = v === 'free' ? 'free' : 'daily'; QZ.qs = makeQuiz(QZ.mode === 'daily' ? 5 : 10, QZ.mode === 'daily' ? trDay() : null); QZ.i = 0; QZ.score = 0; QZ.ans = null; QZ.t0 = Date.now(); renderX(); $('xbody').scrollTop = 0; },
  qzans: v => {
    const q = QZ.qs[QZ.i]; if (!q || QZ.ans) return;
    QZ.ans = v; if (v === q.p.id) QZ.score++; renderX();
    setTimeout(() => {
      if (!XV || XV.kind !== 'quiz' || QZ.qs[QZ.i] !== q) return;
      if (QZ.i + 1 >= QZ.qs.length) { const s = QZ.score; QZ.qs = []; renderX(); quizFinish(s); }
      else { QZ.i++; QZ.ans = null; renderX(); }
    }, 1100);
  },
});

/* =========================================================================
   Yürüyüş parkurları (iz OpenStreetMap'ten, tarayıcıdan doğrudan)
   ========================================================================= */
const SEASON31 = { ilkbahar: 'İlkbahar', yaz: 'Yaz', sonbahar: 'Sonbahar', kis: 'Kış' }, LVL31 = ['', 'Kolay', 'Orta', 'Zor'];
const TRG = {};
const trailMeta = x => [x.km ? `<span>${fmt(x.km)} km</span>` : '', x.days ? `<span>${esc(x.days)} gün</span>` : '', `<span>${LVL31[x.lvl]}</span>`].filter(Boolean).join(' · ');
const seasons31 = x => x.season.split(',').map(s => `<span>${SEASON31[s]}</span>`).join(', ');
function trailsHTML() {
  return `<h1 class="xh">Yürüyüş parkurları</h1><p class="note">Türkiye’nin işaretli uzun yürüyüş yolları ve vadileri.</p>
    ${TRAILS.list.map(x => `<button class="box fest" data-a="trailopen" data-v="${x.id}"><b>🥾 <span translate="no">${esc(x.n)}</span></b><span class="count">${trailMeta(x)} · ${seasons31(x)}</span><span class="count" translate="no">${esc(x.from)} → ${esc(x.to)}</span></button>`).join('')}
    <p class="note">${esc(TRAILS.src)}</p>`;
}
function trailHTML() {
  const x = TRAILS.list.find(y => y.id === XV.arg); if (!x) return '<h1 class="xh">Yürüyüş parkurları</h1>';
  const g = TRG[x.id], c = x.a || x.b;
  return `<h1 class="xh" translate="no">${esc(x.n)}</h1><p class="count">${trailMeta(x)}</p><p class="para">${esc(x.d)}</p>
    <div class="box"><p style="margin:0">🟢 <span>Başlangıç</span>: <span translate="no">${esc(x.from)}</span></p><p style="margin:4px 0 0">🔴 <span>Bitiş</span>: <span translate="no">${esc(x.to)}</span></p><p style="margin:4px 0 0">🗓 <span>En iyi mevsim</span>: ${seasons31(x)}</p></div>
    ${g === 'loading' ? '<p class="note">Parkur izi OpenStreetMap’ten yükleniyor…</p>' : g === 'none' ? '<p class="note">Parkur izi şu an yüklenemedi; haritada başlangıç ve bitiş noktaları gösteriliyor.</p>' : Array.isArray(g) ? '<p class="note">Parkur izi: © OpenStreetMap katkıcıları. Yürümeden önce güncel işaretleri ve hava durumunu kontrol et.</p>' : ''}
    <div class="acts">${c ? `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${c[0]},${c[1]}" target="_blank" rel="noopener">Google Haritalar’da aç</a>` : ''}<a class="btn" href="https://cultureroutesinturkey.com/" target="_blank" rel="noopener">Culture Routes in Turkey sitesinde aç</a></div>
    <p class="note">Uzun parkurlarda yanında yeterli su taşı, birine güzergâhını haber ver ve yaz sıcağında öğle saatlerinde yürüme.</p>`;
}
function drawTrail(x) {
  const old = document.getElementById('routepath'); if (old) old.remove();
  const L = TRG[x.id];
  let pts;
  if (Array.isArray(L)) {
    const pl = L.map(l => l.map(([lng, lat]) => proj(lng, lat)));
    const d = pl.map(l => 'M' + l.map(([a, b]) => `${a.toFixed(2)} ${b.toFixed(2)}`).join('L')).join('');
    $('world').insertAdjacentHTML('beforeend', `<path id="routepath" d="${d}" fill="none" stroke="#C0392B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
    pts = pl.flat();
  } else pts = [x.a, x.b].filter(Boolean).map(([la, lo]) => proj(lo, la));
  if (!pts.length) { draw(); return; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), MAP.classList.contains('ml') ? 2048 : V.maxS, true);
}
async function loadTrail(x) {
  if (!x.osm) { drawTrail(x); return; }
  if (TRG[x.id] && TRG[x.id] !== 'none') { drawTrail(x); return; }
  TRG[x.id] = 'loading'; drawTrail(x); rx31();
  try {
    const els = await overpassQ(`[out:json][timeout:25];relation["route"="hiking"]["name"~"${x.osm}",i](${x.bbox});out geom;`, 25000), lines = [];
    for (const e of els) for (const m of e.members || []) if (m.type === 'way' && m.geometry) lines.push(m.geometry.map(g => [g.lon, g.lat]));
    TRG[x.id] = lines.length ? lines : 'none';
  } catch (_) { TRG[x.id] = 'none'; }
  if (XV && XV.kind === 'trail' && XV.arg === x.id) { renderX(); drawTrail(x); }
}

/* =========================================================================
   Mavi Bayrak (app_settings.blue_flag)
   ========================================================================= */
let BF = null, BFP = null;
function loadBF() {
  if (BF) return Promise.resolve(BF);
  if (!BFP) BFP = (async () => {
    try { if (!ONLINE()) throw 0; const { data, error } = await sb.from('app_settings').select('value').eq('key', 'blue_flag').maybeSingle(); if (error) throw error;
      const v = data && data.value; BF = typeof v === 'string' ? JSON.parse(v) : (v || {}); ls.set('gezi-bf', BF);
    } catch (_) { BF = ls.get('gezi-bf', {}) || {}; }
    BFP = null; return BF;
  })();
  return BFP;
}
const bfYear = id => BF ? (Object.keys(BF).filter(k => /^\d{4}$/.test(k)).sort().reverse().find(y => BF[y].includes(id)) || null) : null;
function bfBoxHTML(p) {
  const y = bfYear(p.id); if (!y) return '';
  return `<div class="box bfbox"><b>🏳️ <span>Mavi Bayrak</span></b><p style="margin:4px 0 0">${(BF.area || []).includes(p.id) ? `<span>Bu bölgede ${y} listesinde Mavi Bayrak almış plaj var.</span>` : `<span>${y} listesinde Mavi Bayrak almış.</span>`}</p>
    <p class="note" style="margin:4px 0 0">Mavi Bayrak her yıl yeniden verilir; güncel durum için mavibayrak.org.tr adresine bak.</p></div>`;
}
function bflagHTML() {
  if (!BF) return '<h1 class="xh">Mavi Bayraklı plajlar</h1><p class="note">Yükleniyor…</p>';
  const ids = [...new Set(Object.keys(BF).filter(k => /^\d{4}$/.test(k)).sort().reverse().flatMap(y => BF[y]))].filter(id => byId(id));
  return `<h1 class="xh">Mavi Bayraklı plajlar</h1><p class="note">Rehberdeki plajlardan Mavi Bayrak listelerinde yer alanlar. Mavi Bayrak; temiz su, güvenlik ve çevre yönetimi ölçütlerine göre her yıl verilir.</p>
    <div class="planlist" style="margin-top:10px">${ids.map(id => { const p = byId(id); return `<button class="planit" data-a="pick" data-v="${p.id}"><span class="pic" aria-hidden="true">🏳️</span><span class="pt"><b translate="no">${esc(p.n)}</b><span class="count"><span translate="no">${esc(p.il)}</span> · ${bfYear(id)}</span></span><span class="count" aria-hidden="true">›</span></button>`; }).join('')}</div>
    <a class="btn" style="width:100%;margin-top:12px" href="https://www.mavibayrak.org.tr/" target="_blank" rel="noopener" translate="no">mavibayrak.org.tr</a>`;
}

/* =========================================================================
   Fotoğraf için en iyi saatler + yakındaki seyir noktaları
   ========================================================================= */
const NATURE31 = new Set(['gol', 'dag', 'plaj', 'sahil', 'kanyon', 'selale', 'ada', 'olusum', 'seyir', 'park', 'kasaba', 'kale', 'antik', 'kule', 'mahalle']);
const PSP = {};
function photoSpotHTML(p) {
  const s = sunTimes(p.lat, p.lng); if (!s.rise || !s.set) return '';
  const H = 3600e3, sp = PSP[p.id];
  let more = '';
  if (NATURE31.has(p.c)) {
    if (sp === undefined) more = '<button class="trlb" style="margin-top:8px" data-a="pspots">🔭 <span>Yakındaki seyir noktaları</span></button>';
    else if (sp === 'loading') more = '<p class="note">Yükleniyor…</p>';
    else if (!sp.length) more = '<p class="note">3 km içinde işaretli seyir noktası bulunamadı.</p>';
    else more = `<div style="margin-top:6px">${sp.map(x => `<a class="spot" href="https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}" target="_blank" rel="noopener">🔭 ${x.n ? `<span translate="no">${esc(x.n)}</span>` : '<span>Seyir noktası</span>'} · ${fmtDist(x.d)}</a>`).join('')}</div><p class="note" style="margin:2px 0 0">© OpenStreetMap</p>`;
  }
  return `<div class="box" id="psbox"><b>📷 <span>Fotoğraf için en iyi saatler</span></b>
    <p style="margin:4px 0 0">🌅 <span>Sabah altın saati</span>: ${trClock(s.rise)}–${trClock(s.rise + H)}</p>
    <p style="margin:2px 0 0">🌇 <span>Akşam altın saati</span>: ${trClock(s.set - H)}–${trClock(s.set)}</p>
    <p style="margin:2px 0 0">🌆 <span>Mavi saat</span>: ${trClock(s.set)}–${trClock(s.set + 0.5 * H)}</p>${more}
    <p class="note" style="margin:4px 0 0">Saatler bugüne göre, Türkiye saatiyle.</p></div>`;
}
A.pspots = async () => {
  const p = byId(S.sel); if (!p || PSP[p.id] !== undefined) return;
  const paint = () => { const b = $('psbox'); if (b && S.sel === p.id) b.outerHTML = photoSpotHTML(p); };
  PSP[p.id] = 'loading'; paint();
  try {
    const els = await overpassQ(`[out:json][timeout:15];nwr(around:3000,${p.lat},${p.lng})[tourism=viewpoint];out center 40;`, 15000);
    PSP[p.id] = els.map(e => ({ n: (e.tags && e.tags.name) || '', lat: e.lat ?? (e.center && e.center.lat), lng: e.lon ?? (e.center && e.center.lon) })).filter(x => x.lat != null)
      .map(x => ({ ...x, d: meters(p.lat, p.lng, x.lat, x.lng) })).sort((a, b) => a.d - b.d).slice(0, 6);
  } catch (_) { delete PSP[p.id]; toast('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.'); }
  paint();
};
const rd31 = renderDetail;
renderDetail = function () {
  rd31();
  const p = S.sel && byId(S.sel); if (!p) return;
  if (ONLINE()) {
    const ta = $('detail').querySelector('[data-a="tripadd"]'), row = ta && ta.closest('.acts');
    if (row) row.insertAdjacentHTML('afterend', `<div class="acts"><button class="btn" data-a="shadd" data-v="${p.id}">👥 <span>Ortak listeye ekle</span></button></div><div id="shpick">${SH.pick === p.id ? shPickHTML(p.id) : ''}</div>`);
  }
  if (S.tab !== 'ov') return;
  const at = $('detail').querySelector('.sunbox') || $('detail').querySelector('.para');
  const html = bfBoxHTML(p) + photoSpotHTML(p);
  if (html) { if (at) at.insertAdjacentHTML('afterend', html); else $('detail').insertAdjacentHTML('beforeend', html); }
  if (!BF && ['plaj', 'sahil', 'ada'].includes(p.c)) loadBF().then(() => { if (S.sel === p.id && S.tab === 'ov' && bfYear(p.id)) renderDetail(); });
};

/* =========================================================================
   Valiz listesi (işaretler bu tarayıcıda saklanır)
   ========================================================================= */
const ACTS31 = [['deniz', '🏖', 'Deniz ve plaj'], ['yuruyus', '🥾', 'Doğa yürüyüşü'], ['cami', '🕌', 'Cami ziyareti'], ['kar', '⛷', 'Kar ve kayak'], ['balon', '🎈', 'Balon turu']];
const DAYS_ITEM = '{n} günlük iç çamaşırı ve çorap';
function packItems(o) {
  const winter = [11, 0, 1, 2].includes(o.month), summer = [5, 6, 7, 8].includes(o.month), cold = winter || [3, 9, 10].includes(o.month);
  const east = o.region === 5 || o.region === 3, bs = o.region === 4;
  const g = [
    ['Belgeler', ['Kimlik ya da pasaport', 'Ehliyet (araç kullanacaksan)', 'Kredi kartı ve biraz nakit TL', 'Konaklama ve bilet bilgileri', 'Seyahat sağlık sigortası (yabancıysan)']],
    ['Giyim', [DAYS_ITEM, 'Rahat yürüyüş ayakkabısı', 'Gece için hafif bir üst',
      ...(cold ? ['Mont ya da kalın ceket', 'Kazak', 'Bere ve eldiven'] : []), ...(summer ? ['Şapka', 'İnce ve açık renkli giysiler'] : []),
      ...(bs ? ['Yağmurluk ve su geçirmez ayakkabı'] : []), ...(east && winter ? ['Termal iç giyim', 'Kar botu'] : [])]],
    ['Sağlık ve bakım', ['Kişisel ilaçların', 'Ağrı kesici ve yara bandı', 'Diş fırçası ve macun', 'Islak mendil ve el dezenfektanı', ...(summer || o.acts.includes('deniz') ? ['Güneş kremi (SPF 30+)', 'Sinek kovucu'] : [])]],
    ['Elektronik', ['Telefon ve şarj aleti', 'Taşınabilir şarj cihazı', 'Çevrimdışı harita (uygulamadan indir)']],
  ];
  if (o.acts.includes('deniz')) g.push(['Deniz', ['Mayo', 'Plaj havlusu', 'Deniz ayakkabısı', 'Güneş gözlüğü']]);
  if (o.acts.includes('yuruyus')) g.push(['Yürüyüş', ['Su matarası', 'Küçük sırt çantası', 'Kuru yiyecek', 'Yürüyüş sopası', 'El feneri']]);
  if (o.acts.includes('cami')) g.push(['Cami ziyareti', ['Başörtüsü ya da şal', 'Diz altına inen giysi', 'Kolay çıkarılan ayakkabı']]);
  if (o.acts.includes('kar')) g.push(['Kar ve kayak', ['Kayak montu ve pantolonu', 'Kayak gözlüğü', 'Su geçirmez eldiven', 'Yüz için güneş kremi']]);
  if (o.acts.includes('balon')) g.push(['Balon turu', ['Sabah ayazı için kalın üst', 'Kapalı ayakkabı']]);
  return g;
}
const PK = (() => { const j = ls.get('gezi-pack', {}) || {}; return { o: Object.assign({ region: 1, month: new Date().getMonth(), days: 3, acts: [] }, j.o || {}), chk: j.chk || {} }; })();
const pkSave = () => ls.set('gezi-pack', { o: PK.o, chk: PK.chk });
function packHTML() {
  const o = PK.o, groups = packItems(o), all = groups.flatMap(([, xs]) => xs), done = all.filter(x => PK.chk[x]).length;
  const ch = (on, a, v, label) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  return `<h1 class="xh">Valiz listesi</h1>
    <p class="row-label" style="margin-top:8px">Nereye?</p><div class="chips wrapc">${REGIONS.map((n, r) => ch(o.region === r, 'pkreg', r, `<span>${esc(n)}</span>`)).join('')}</div>
    <p class="row-label" style="margin-top:12px">Ne zaman?</p><div class="chips" style="overflow-x:auto;flex-wrap:nowrap">${MONTHS.map((m, i) => ch(o.month === i, 'pkmon', i, `<span>${m}</span>`)).join('')}</div>
    <p class="row-label" style="margin-top:12px">Kaç gün?</p><div class="chips wrapc">${[2, 3, 5, 7, 10, 14].map(d => ch(o.days === d, 'pkday', d, fmt(d))).join('')}</div>
    <p class="row-label" style="margin-top:12px">Neler yapacaksın?</p><div class="chips wrapc">${ACTS31.map(([k, ic, l]) => ch(o.acts.includes(k), 'pkact', k, `<span aria-hidden="true">${ic}</span> <span>${l}</span>`)).join('')}</div>
    <p class="pkdone">${fmt(done)}/${fmt(all.length)} hazır</p>${bar31(all.length ? done / all.length * 100 : 0)}
    ${groups.map(([g, xs]) => `<h2 class="xh2" style="font-size:16px">${g}</h2><div class="pklist">${xs.map(x => `<button class="pkit" role="checkbox" aria-checked="${!!PK.chk[x]}" data-a="pkchk" data-v="${esc(x)}"><span aria-hidden="true">${PK.chk[x] ? '☑️' : '⬜'}</span><span>${x === DAYS_ITEM ? `${fmt(o.days)} günlük iç çamaşırı ve çorap` : esc(x)}</span></button>`).join('')}</div>`).join('')}
    <button class="btn" style="width:100%;margin-top:14px" data-a="pkclr">İşaretleri temizle</button>`;
}
const pkRe = () => { const st = $('xbody').scrollTop; renderX(); $('xbody').scrollTop = st; };
Object.assign(A, {
  mpack: () => { toggleMenu(false); showX('pack', null, backTo()); },
  pkreg: v => { PK.o.region = +v; pkSave(); pkRe(); },
  pkmon: v => { PK.o.month = +v; pkSave(); pkRe(); },
  pkday: v => { PK.o.days = +v; pkSave(); pkRe(); },
  pkact: v => { const a = PK.o.acts; PK.o.acts = a.includes(v) ? a.filter(x => x !== v) : [...a, v]; pkSave(); pkRe(); },
  pkchk: v => { PK.chk[v] = !PK.chk[v]; if (!PK.chk[v]) delete PK.chk[v]; pkSave(); pkRe(); },
  pkclr: () => { PK.chk = {}; pkSave(); pkRe(); },
  mcolls: () => { toggleMenu(false); showX('colls', null, backTo()); },
  collopen: v => showX('coll', v, 'colls'),
  mtrails: () => { toggleMenu(false); showX('trails', null, backTo()); },
  trailopen: v => { const x = TRAILS.list.find(y => y.id === v); if (!x) return; showX('trail', v, 'trails'); loadTrail(x); },
  mbflag: () => { toggleMenu(false); showX('bflag', null, backTo()); loadBF().then(rx31); },
});

/* ---- görünümler, Planla sayfası, profil, bildirimler ---- */
const rx31b = renderX;
renderX = function () {
  if (XV && MYK.has(XV.kind)) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>${XV.prev ? 'Geri' : 'Tüm yerler'}</span></button>`;
    const k = XV.kind, h = k === 'traveler' ? travelerHTML() : k === 'shared' ? sharedHTML() : k === 'strip' ? stripHTML() : k === 'year' ? yearHTML() : k === 'colls' ? collsHTML() : k === 'coll' ? collHTML()
      : k === 'quiz' ? quizHTML() : k === 'trails' ? trailsHTML() : k === 'trail' ? trailHTML() : k === 'bflag' ? bflagHTML() : packHTML();
    $('xbody').innerHTML = back + h;
    return;
  }
  rx31b();
};
const pl31 = planHTML;
planHTML = function () {
  const it = (a, ic, l, s) => `<button class="planit" data-a="${a}"><span class="pic" aria-hidden="true">${ic}</span><span class="pt"><b>${l}</b><span class="count">${s}</span></span><span class="count" aria-hidden="true">›</span></button>`;
  let h = pl31();
  const add = (ONLINE() ? it('mshared', '👥', 'Ortak listeler', 'Arkadaşlarınla birlikte gezi listesi') : '') + it('mtrails', '🥾', 'Yürüyüş parkurları', 'Likya Yolu, Kaçkarlar ve daha fazlası')
    + it('mbflag', '🏳️', 'Mavi Bayraklı plajlar', 'Temiz ve güvenli plajlar') + it('mpack', '🎒', 'Valiz listesi', 'Bölgeye ve mevsime göre eşya listesi');
  const i = h.indexOf('data-a="mfest"'), j = i < 0 ? -1 : h.indexOf('</div>', i);
  if (j > 0) h = h.slice(0, j) + add + h.slice(j);
  const fun = `<p class="amgroup" style="padding:14px 0 6px">Eğlence ve anılar</p><div class="planlist">${it('mcolls', '🏅', 'Koleksiyonlar', 'UNESCO mirasları, 7 bölge ve daha fazlası') + it('mquiz', '📸', 'Neresi bu?', 'Fotoğraftan yeri bil, günün sorusunu çöz') + (ONLINE() ? it('myear', '📅', 'Yıllık gezi özeti', 'Bu yıl gezdiklerin tek kartta') : '')}</div>`;
  const y = h.lastIndexOf('<p class="amgroup"');
  return y > 0 ? h.slice(0, y) + fun + h.slice(y) : h + fun;
};
const rp31 = renderProfile;
renderProfile = function () {
  rp31(); if (!CUR || !ME || !ONLINE()) return;
  const at = $('prof').querySelector('.pentry') || $('prof').querySelector('.box'); if (!at) return;
  at.insertAdjacentHTML(at.classList.contains('pentry') ? 'afterend' : 'beforebegin', `<div class="acts pacts"><button class="btn" data-a="tvl" data-v="${esc(ME.id)}">👤 <span>Gezgin profilim</span></button><button class="btn" data-a="myear">📅 <span>Yıllık özetim</span></button></div>`);
};
NTXT.follow = n => `${n} seni takip etmeye başladı`; NICON.follow = '👤';
NTXT.trip_join = n => `${n} ortak gezi listene katıldı`; NICON.trip_join = '👥';
const no31 = A.nopen;
A.nopen = v => {
  const n = (NOTE.list || []).find(x => x.id === v);
  if (n && n.kind === 'follow' && n.actor) { showX('traveler', n.actor, 'inbox'); loadTraveler(n.actor); return; }
  if (n && n.kind === 'trip_join') { SH.list = null; showX('shared', null, 'inbox'); loadShared().then(rx31); return; }
  no31(v);
};
