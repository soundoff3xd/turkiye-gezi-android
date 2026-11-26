/* ===== aşama 9: düzen (Planla, gruplu hesap menüsü, yardım) + haftanın fotoğrafı, festivaller, ulaşım,
   harcamalar, ziyaretçilere soru, ziyaretçi bilgileri (erişilebilirlik / çocuklarla / evcil hayvan) ===== */
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const monthsTxt = ms => ms.map(m => `<span>${MONTHS[m - 1]}</span>`).join(' – ');

/* --- hesap menüsü: Hesap · Ayarlar · Destek; gezi planlamayla ilgili her şey Planla'da --- */
(function regroupMenu() {
  const m = $('acctmenu'); if (!m) return;
  const get = a => m.querySelector(`[data-a="${a}"]`);
  const move = ['mtrip', 'mjournal', 'mroutes', 'mphrases', 'mrec', 'mpaint'];
  move.forEach(a => { const b = get(a); if (b) b.remove(); });
  const head = m.querySelector('.amhead'), logout = get('mlogout');
  const pick = list => list.map(get).filter(Boolean);
  const hesap = pick(['mnotes', 'mprofile', 'minterests']);
  const ayar = pick(['mtheme', 'mprivacy']);
  const destek = pick(['mfeedback', 'legal', 'mmod', 'msupport']);
  m.querySelectorAll('.amsep').forEach(x => x.remove());
  const plan = document.createElement('div'); plan.innerHTML = `<button role="menuitem" data-a="mplan"><span class="emi" aria-hidden="true">📋</span><span>Planla</span></button><button role="menuitem" data-a="mhelp"><span class="emi" aria-hidden="true">❔</span><span>Yardım</span></button>`;
  const sec = (t, items) => { const h = document.createElement('div'); h.className = 'amgroup'; h.textContent = t; return [h, ...items]; };
  const frag = [...sec('Hesap', hesap), ...sec('Gezi', [plan.children[0]]), ...sec('Ayarlar', ayar), ...sec('Destek', [plan.children[1] || plan.firstChild, ...destek])];
  const rest = [...m.children].filter(x => x !== head && x !== logout && !frag.includes(x));
  frag.forEach(x => m.insertBefore(x, logout));
  rest.forEach(x => m.insertBefore(x, logout));
  const sep = document.createElement('div'); sep.className = 'amsep'; m.insertBefore(sep, logout);
})();
/* liste panelindeki kısa yollar: Planla + Gezi listem */
(function planButtons() {
  const x = document.querySelector('.xcards'); if (!x) return;
  x.innerHTML = `<button class="btn xrec" data-a="mplan">📋 <span>Planla</span></button><button class="btn" data-a="mtrip">🧳 <span>Gezi listem</span></button>`;
})();

function planHTML() {
  const G = [
    ['Gezini planla', [['mtrip', '🧳', 'Gezi listem', 'Gideceğin yerler ve en kısa rota'], ['mroutes', '🗺', 'Hazır rotalar', 'Gün gün planlanmış rotalar'], ['xrec', '🧭', 'Nereye gitmeliyim?', 'İlgi alanlarına göre şehir önerileri'], ['mfest', '🎉', 'Festival takvimi', 'Her yıl tekrarlanan şenlikler']]],
    ['Gezerken', [['mjournal', '📔', 'Gezi günlüklerim', 'Gün gün notlar, fotoğraflar ve harcamalar'], ['mphrases', '💬', 'Türkçe cep sözlüğü', 'Temel ifadeler, sesli okunuşuyla'], ['mpaint', '🎨', 'Haritamı boya', 'Gezdiğin illeri haritada boya']]],
    ['Yardım', [['mhelp', '❔', 'Yardım ve sık sorulanlar', 'Uygulamayı nasıl kullanırım?']]],
  ];
  return `<h1 class="xh">Planla</h1>${G.map(([g, items]) => `<p class="amgroup" style="padding:14px 0 6px">${g}</p><div class="planlist">${items.map(([a, ic, l, s]) => `<button class="planit" data-a="${a}"><span class="pic" aria-hidden="true">${ic}</span><span class="pt"><b>${l}</b><span class="count">${s}</span></span><span class="count" aria-hidden="true">›</span></button>`).join('')}</div>`).join('')}`;
}
function helpHTML() {
  return `<h1 class="xh">Yardım ve sık sorulanlar</h1>
  <div class="box"><b>Dört ana bölüm</b>
    <p class="note" style="margin:6px 0 0">🗺 <b class="hb">Harita</b>: <span>Tüm yerler haritada; işarete dokun, yerin sayfası açılsın.</span><br>🧭 <b class="hb">Liste</b>: <span>Arama, bölge ve kategori, sıralama, bugünün önerileri.</span><br>📋 <b class="hb">Planla</b>: <span>Gezi listesi, hazır rotalar, festivaller, günlük ve sözlük.</span><br>📷 <b class="hb">Vitrin</b>: <span>Gezginlerin fotoğrafları ve haftanın fotoğrafı.</span></p>
    <p class="note"><span>Sağ üstteki profil düğmesinde hesap, bildirimler, dil, görünüm ve gizlilik ayarları bulunur.</span></p></div>
  ${FAQ.map(([q, a], i) => `<details class="box faq"${i ? '' : ' open'}><summary><b>${esc(q)}</b></summary><p>${esc(a)}</p></details>`).join('')}
  <button class="btn" data-a="mfeedback" style="width:100%;margin-top:14px">💬 <span>Görüş ve öneri gönder</span></button>`;
}
function festHTML() {
  const m = XV.arg || 0, now = new Date().getMonth() + 1;
  const list = FEST.filter(f => !m || f[2].includes(m)).sort((a, b) => ((a[2][0] - now + 12) % 12) - ((b[2][0] - now + 12) % 12));
  return `<h1 class="xh">Festival takvimi</h1><p class="note">Her yıl tekrarlanan festival ve şenlikler. Tarihler yıldan yıla değişebilir; gitmeden önce resmî duyuruları kontrol et.</p>
  <div class="chips wrapc" style="margin-top:10px"><button class="chip" data-a="festm" data-v="0" aria-pressed="${!m}">Yakında</button>${MONTHS.map((x, i) => `<button class="chip" data-a="festm" data-v="${i + 1}" aria-pressed="${m === i + 1}">${x}</button>`).join('')}</div>
  ${list.length ? list.map(f => `<button class="box fest" data-a="festil" data-v="${esc(f[1])}"><span class="count" style="color:var(--accent);font-weight:800">${monthsTxt(f[2])} · <span translate="no">${esc(f[1])}</span></span><b>${esc(f[0])}</b><span class="fd">${esc(f[3])}</span></button>`).join('') : '<p class="note">Bu ay için festival yok</p>'}`;
}
function cityExtrasHTML(il) {
  const fs = FEST.filter(f => f[1] === il), air = TRANSPORT.air[il] || [], yht = TRANSPORT.yht.includes(il);
  return `${fs.length ? `<div class="box"><b>🎉 <span>Festivaller</span></b>${fs.map(f => `<p style="margin:4px 0 0"><b style="display:inline;color:var(--ink);font-size:14px">${esc(f[0])}</b> · ${monthsTxt(f[2])}</p>`).join('')}</div>` : ''}
  <div class="box"><b>🚌 <span>Nasıl gidilir</span></b>${air.length ? air.map(a => `<p style="margin:4px 0 0" translate="no">✈ ${esc(a)}</p>`).join('') : '<p style="margin:4px 0 0">✈ <span>Bu ilde havalimanı yok; en yakın ildeki havalimanını kullanabilirsin.</span></p>'}${yht ? '<p style="margin:4px 0 0">🚄 <span>Yüksek hızlı tren (YHT) durağı var</span></p>' : ''}<p style="margin:4px 0 0">🚌 <span>Şehirlerarası otobüsler il merkezindeki otogara gelir.</span></p><p style="margin:6px 0 0"><a href="https://ebilet.tcddtasimacilik.gov.tr" target="_blank" rel="noopener">TCDD ↗</a> · <a href="https://www.dhmi.gov.tr" target="_blank" rel="noopener">DHMİ ↗</a></p></div>`;
}
const ch29 = cityHTML;
cityHTML = function () {
  const h = ch29(), k = '<h2 class="xh2">', i = h.lastIndexOf(k), d = cityExtrasHTML(XV.arg);
  return i > 0 ? h.slice(0, i) + d + h.slice(i) : h + d;
};
const rx29 = renderX;
renderX = function () {
  if (XV && ['plan', 'help', 'festivals'].includes(XV.kind)) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>Tüm yerler</span></button>`;
    $('xbody').innerHTML = back + (XV.kind === 'plan' ? planHTML() : XV.kind === 'help' ? helpHTML() : festHTML());
    return;
  }
  rx29();
  if (XV && XV.kind === 'journal' && JR.cur && ME && JR.cur.user_id === ME.id) mountExpenses(JR.cur.id);
};
Object.assign(A, {
  mplan: () => { toggleMenu(false); showX('plan'); },
  mhelp: () => { toggleMenu(false); showX('help'); },
  mfest: () => showX('festivals', 0, 'plan'),
  festm: v => { XV.arg = +v; renderX(); },
  festil: v => { if (PLACES.some(p => p.il === v)) showX('city', v, 'festivals'); },
});

/* --- haftanın fotoğrafı (Vitrin) --- */
let POW = null;
const rph29 = renderPhotos;
renderPhotos = function () {
  rph29();
  if ($('photov').hidden || !POW) return;
  const ph = allPhotos().find(x => x.id === 'pp' + POW.review_id); if (!ph) return;
  const p = byId(ph.pid), h = $('photos').querySelector('h1');
  const card = `<button class="pow" data-a="popen" data-v="${esc(ph.id)}">${photoImg(ph)}<span class="powb">🏆 <span>Haftanın fotoğrafı</span></span><span class="powt"><b translate="no">${esc(p.n)}</b><span class="count">📷 ${esc(ph.by)}${POW.likes ? ` · <span>Bu hafta ${fmt(POW.likes)} beğeni</span>` : ''}</span></span></button>`;
  if (h) h.insertAdjacentHTML('afterend', card);
};
setTimeout(() => { if (ONLINE()) sb.rpc('photo_of_week').then(({ data }) => { POW = data && data[0] || null; if (POW && !$('photov').hidden) renderPhotos(); }, () => { }); }, 1500);

/* --- ziyaretçi bilgileri: erişilebilirlik + çocuklarla + evcil hayvan --- */
const VK = [['access', '♿', 'Erişilebilirlik', [[2, 'Erişilebilir'], [1, 'Kısmen'], [0, 'Erişilemez']]], ['kids', '🧒', 'Çocuklarla', [[2, 'Uygun'], [1, 'Kısmen'], [0, 'Uygun değil']]], ['pets', '🐕', 'Evcil hayvan', [[2, 'Kabul ediliyor'], [1, 'Kısmen'], [0, 'Kabul edilmiyor']]]];
accessHTML = function (p) {
  const all = ACCD[p.id]; if (!all) return '';
  return `<b>👥 <span>Ziyaretçi bilgileri</span></b>${VK.map(([k, ic, l, opts]) => {
    const rows = all.filter(r => (r.kind || 'access') === k), mine = ME ? (rows.find(r => r.user_id === ME.id) || {}).val : undefined;
    const cnt = [0, 1, 2].map(v => rows.filter(r => r.val === v).length), top = rows.length ? [2, 1, 0].reduce((a, v) => (cnt[v] > cnt[a] ? v : a), 2) : -1;
    return `<p class="vk"><b style="display:inline;color:var(--ink);font-size:14px">${ic} <span>${l}</span></b> · ${top < 0 ? '<span>Henüz bilgi yok</span>' : `<span>${opts.find(o => o[0] === top)[1]}</span> (<span>${rows.length} ziyaretçiye göre</span>)`}</p>${ME ? `<div class="accrow">${opts.map(([v, t]) => `<button class="chip${mine === v ? ' on' : ''}" data-a="vkv" data-v="${k}:${v}" aria-pressed="${mine === v}"><span>${t}</span>${cnt[v] ? ` (${cnt[v]})` : ''}</button>`).join('')}</div>` : ''}`;
  }).join('')}<p class="note" style="margin:6px 0 0">Ziyaretçilerin bildirdiği bilgidir; gitmeden önce yeri arayıp sor.</p>`;
};
loadAccess = async function (id) {
  const { data } = await sb.from('place_access').select('val,user_id,kind').eq('place_id', id).limit(1500);
  ACCD[id] = data || [];
  const b = $('accbox'); if (b && S.sel === id) { const p = byId(id); if (p) b.innerHTML = accessHTML(p); }
};
A.vkv = async v => {
  const [kind, val] = v.split(':'), id = S.sel, n = +val; if (!ME || !id || !needOnline()) return;
  const mine = ((ACCD[id] || []).find(r => r.user_id === ME.id && (r.kind || 'access') === kind) || {}).val;
  const { error } = mine === n ? await sb.from('place_access').delete().eq('place_id', id).eq('user_id', ME.id).eq('kind', kind)
    : await sb.from('place_access').upsert({ place_id: id, user_id: ME.id, kind, val: n });
  if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
  track('act:visitor_info'); loadAccess(id);
};

/* --- ziyaretçilere soru sor (yer sayfasında "Sorular" sekmesi) --- */
const QA = {};
function qaHTML(p) {
  const list = QA[p.id];
  const form = ME ? `<form class="qaform" data-f="qask"><textarea id="qtext" rows="2" maxlength="300" placeholder="Sorunu yaz"></textarea><button class="btn pri" type="submit">Sor</button></form>` : '';
  return `<p class="note">Otopark var mı, kışın açık mı? Merak ettiğini sor; buraya gitmiş gezginler cevaplasın.</p>${form}
  ${!list ? '<p class="note">Yükleniyor…</p>' : !list.length ? '<div class="card" style="text-align:center"><b>Henüz soru yok</b><p class="note">İlk soruyu sen sor.</p></div>'
    : list.map(q => `<div class="card qa"><b class="qq">❓ ${esc(q.body)}</b><span class="count"><span translate="no">${esc((q.profiles || {}).name || '?')}</span> · ${agoText(q.created_at)}</span>${q.hidden ? '<p class="hidnote">Şikâyetler nedeniyle gizlendi; moderatör inceliyor.</p>' : ''}
      ${(q.place_answers || []).map(a => `<div class="qans"><p>${esc(a.body)}</p><span class="count"><span translate="no">${esc((a.profiles || {}).name || '?')}</span> · ${agoText(a.created_at)}${ME && (a.user_id === ME.id || (CUR && CUR.mod)) ? ` · <button class="lnk" data-a="qdel" data-v="a:${a.id}">Sil</button>` : ''}${ME && a.user_id !== ME.id ? ` · <button class="lnk" data-a="qrep" data-v="answer:${a.id}" aria-label="Şikâyet et">⚑</button>` : ''}</span></div>`).join('')}
      ${ME ? `<form class="qaform" data-f="qans" data-v="${q.id}"><input maxlength="500" placeholder="Cevap yaz"><button class="btn" type="submit">Gönder</button></form>` : ''}
      <span class="count">${ME && (q.user_id === ME.id || (CUR && CUR.mod)) ? `<button class="lnk" data-a="qdel" data-v="q:${q.id}">Soruyu sil</button>` : ''}${ME && q.user_id !== ME.id ? ` <button class="lnk" data-a="qrep" data-v="question:${q.id}">⚑ <span>Şikâyet et</span></button>` : ''}</span></div>`).join('')}`;
}
async function loadQA(id) {
  const { data, error } = await sb.from('place_questions').select('id,user_id,body,created_at,hidden,profiles!place_questions_user_id_profiles_fkey(name),place_answers(id,user_id,body,created_at,hidden,profiles!place_answers_user_id_profiles_fkey(name))').eq('place_id', id).order('created_at', { ascending: false }).limit(50);
  QA[id] = error ? [] : (data || []).map(q => ({ ...q, place_answers: (q.place_answers || []).sort((a, b) => a.created_at.localeCompare(b.created_at)) }));
  if (S.sel === id && S.tab === 'qa') renderDetail();
}
const rd29 = renderDetail;
renderDetail = function () {
  const qa = S.tab === 'qa';
  if (qa) S.tab = 'rev';
  rd29();
  if (qa) S.tab = 'qa';
  const tabs = $('detail').querySelector('.tabs'); if (!tabs || !S.sel) return;
  tabs.insertAdjacentHTML('beforeend', `<button class="tab" role="tab" data-a="tab" data-v="qa" aria-selected="${qa}">Sorular</button>`);
  if (!qa) return;
  tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.v === 'qa'));
  while (tabs.nextSibling) tabs.nextSibling.remove();
  const p = byId(S.sel); if (!p) return;
  if (!ONLINE()) { tabs.insertAdjacentHTML('afterend', '<p class="note">Bu bölüm için internet gerekir.</p>'); return; }
  tabs.insertAdjacentHTML('afterend', `<div id="qabox">${qaHTML(p)}</div>`);
  if (!QA[p.id]) loadQA(p.id);
};
document.addEventListener('submit', async ev => {
  const f = ev.target.closest && ev.target.closest('form[data-f="qask"],form[data-f="qans"]'); if (!f) return;
  ev.preventDefault(); if (!ME || !needOnline()) return;
  const id = S.sel, btn = f.querySelector('[type=submit]');
  const body = (f.dataset.f === 'qask' ? $('qtext').value : f.querySelector('input').value).trim();
  if (f.dataset.f === 'qask' ? body.length < 5 : !body) return;
  btn.disabled = true;
  const { error } = f.dataset.f === 'qask' ? await sb.from('place_questions').insert({ place_id: id, body: body.slice(0, 300) })
    : await sb.from('place_answers').insert({ question_id: f.dataset.v, body: body.slice(0, 500) });
  btn.disabled = false;
  if (error) { typeof fail === 'function' ? fail(error) : toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
  track(f.dataset.f === 'qask' ? 'act:question' : 'act:answer');
  if (f.dataset.f === 'qask') toast('Sorun gönderildi');
  loadQA(id);
});
Object.assign(A, {
  qdel: async v => {
    const [k, id] = v.split(':'); const { error } = await sb.from(k === 'q' ? 'place_questions' : 'place_answers').delete().eq('id', id);
    if (error) toast('Bir hata oluştu, lütfen tekrar dene.'); else loadQA(S.sel);
  },
  qrep: async v => {
    const [type, id] = v.split(':'); if (!ME || !window.confirm(tx('Bu içerik uygunsuz olarak şikâyet edilsin mi?'))) return;
    const { error } = await sb.from('reports').insert({ user_id: ME.id, target_type: type, target_id: id, reason: 'uygunsuz' });
    if (error) { typeof fail === 'function' ? fail(error) : toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    toast('Şikâyetin alındı, teşekkürler'); loadQA(S.sel);
  },
});
/* bildirim: yanıt gelince */
NTXT.answer = n => `${n} sorunu yanıtladı`; NICON.answer = '❓';
const no29 = A.nopen;
A.nopen = v => { const n = (NOTE.list || []).find(x => x.id === v); if (n && n.kind === 'answer' && n.place_id && byId(n.place_id)) { hideX(); select(n.place_id); S.tab = 'qa'; renderDetail(); return; } no29(v); };

/* --- gezi harcamaları (yalnızca günlüğün sahibi görür) --- */
const XCATS = [['stay', '🛏', 'Konaklama'], ['food', '🍽', 'Yemek'], ['transport', '🚗', 'Ulaşım'], ['ticket', '🎟', 'Giriş ücreti'], ['shop', '🛍', 'Alışveriş'], ['other', '•', 'Diğer']];
const XSYM = { TRY: '₺', EUR: '€', USD: '$', GBP: '£' };
const EXP = {};
const money = o => Object.entries(o).map(([c, v]) => `${fmt(Math.round(v * 100) / 100)} ${XSYM[c] || c}`).join(' + ');
function expHTML(jid) {
  const list = EXP[jid]; if (!list) return '<b>💰 <span>Harcamalar</span></b><p class="note">Yükleniyor…</p>';
  const tot = {}, by = {};
  list.forEach(e => { tot[e.currency] = (tot[e.currency] || 0) + e.amount; (by[e.cat] = by[e.cat] || {})[e.currency] = (by[e.cat][e.currency] || 0) + e.amount; });
  return `<details class="exp"><summary><b>💰 <span>Harcamalar</span></b><span class="exptot">${list.length ? money(tot) : '<span>Henüz harcama yok</span>'}</span><span class="note" style="display:block;margin:2px 0 0">Yalnızca sen görürsün; günlüğü paylaşsan da gizli kalır.</span></summary>
    ${XCATS.filter(([k]) => by[k]).map(([k, ic, l]) => `<p style="margin:4px 0 0">${ic} <span>${l}</span>: ${money(by[k])}</p>`).join('')}
    <form class="expform" data-f="exp"><select id="xcat">${XCATS.map(([k, ic, l]) => `<option value="${k}">${ic} ${l}</option>`).join('')}</select><input id="xamt" inputmode="decimal" placeholder="Tutar" required><select id="xcur">${Object.entries(XSYM).map(([c, s]) => `<option value="${c}">${s}</option>`).join('')}</select><input id="xnote" maxlength="120" placeholder="Not (isteğe bağlı)"><button class="btn pri" type="submit">＋ <span>Harcama ekle</span></button></form>
    <ul class="explist">${list.slice().reverse().map(e => { const c = XCATS.find(x => x[0] === e.cat) || XCATS[5]; return `<li><span>${c[1]}</span><span class="fn"><b>${fmt(e.amount)} ${XSYM[e.currency] || e.currency}</b><span class="count">${esc(e.day)} · <span>${c[2]}</span>${e.note ? ' · ' + esc(e.note) : ''}</span></span><button class="lnk" data-a="xdel" data-v="${e.id}" aria-label="Sil">✕</button></li>`; }).join('')}</ul></details>`;
}
async function loadExp(jid) {
  const { data } = await sb.from('journal_expenses').select('id,day,cat,amount,currency,note').eq('journal_id', jid).order('day').order('created_at');
  EXP[jid] = (data || []).map(x => ({ ...x, amount: Number(x.amount) }));
  const b = $('expbox'); if (b) { const open = b.querySelector('details') && b.querySelector('details').open; b.innerHTML = expHTML(jid); if (open) b.querySelector('details').open = true; }
}
function mountExpenses(jid) {
  const at = $('xbody').querySelector('.jshare'); if (!at || $('expbox')) return;
  at.insertAdjacentHTML('afterend', `<div class="box" id="expbox">${expHTML(jid)}</div>`);
  if (!EXP[jid]) loadExp(jid);
}
document.addEventListener('submit', async ev => {
  const f = ev.target.closest && ev.target.closest('form[data-f="exp"]'); if (!f) return;
  ev.preventDefault(); if (!ME || !JR.cur || !needOnline()) return;
  const amount = Number(String($('xamt').value).replace(',', '.')); if (!(amount > 0)) return;
  const { error } = await sb.from('journal_expenses').insert({ journal_id: JR.cur.id, cat: $('xcat').value, amount: Math.round(amount * 100) / 100, currency: $('xcur').value, note: $('xnote').value.trim().slice(0, 120) });
  if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
  track('act:expense'); loadExp(JR.cur.id);
});
A.xdel = async v => { await sb.from('journal_expenses').delete().eq('id', v); if (JR.cur) loadExp(JR.cur.id); };
