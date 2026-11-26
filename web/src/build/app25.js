/* ===== aşama 5: gezi günlüğü (uygulamayla ortak; ?gunluk=<id> bağlantısı yalnızca okunur açılır) ===== */
const JR = { list: null, cur: null, entries: null, err: false };
const jLink = id => `${location.origin}${location.pathname}?gunluk=${id}`;
const isUUID = s => /^[0-9a-f-]{36}$/i.test(String(s || ''));
async function loadJournals() {
  if (!ME) return;
  const { data, error } = await sb.from('journals').select('id,title,started_on,shared,journal_entries(count)').eq('user_id', ME.id).order('started_on', { ascending: false });
  JR.list = error ? [] : (data || []).map(j => ({ ...j, n: (j.journal_entries && j.journal_entries[0] && j.journal_entries[0].count) || 0 }));
  if (XV && XV.kind === 'journals') renderX();
}
async function loadJournal(id) {
  JR.cur = null; JR.entries = null; JR.err = false;
  const [a, b] = await Promise.all([
    sb.from('journals').select('id,title,started_on,shared,user_id').eq('id', id).maybeSingle(),
    sb.from('journal_entries').select('id,place_id,day,note,photo_path,created_at').eq('journal_id', id).order('day').order('created_at'),
  ]);
  JR.cur = a.data || null; JR.entries = b.data || []; JR.err = !a.data;
  if (XV && XV.kind === 'journal') renderX();
}
function journalsHTML() {
  const l = JR.list;
  const form = `<form class="box jnew" data-f="jnew"><label class="count" for="jtitle">Yeni günlük adı (ör. Kapadokya, Ekim)</label><div class="row"><input id="jtitle" maxlength="80" required autocomplete="off"><button class="btn pri" type="submit">＋ <span>Oluştur</span></button></div></form>`;
  const body = l == null ? '<p class="note">Yükleniyor…</p>'
    : !l.length ? '<p class="note"><span>Henüz günlüğün yok</span>. <span>Bir gezi için günlük oluştur, gittiğin yerleri ekledikçe hikâyen oluşsun.</span></p>'
      : l.map(j => `<button class="box pentry" data-a="jopen" data-v="${esc(j.id)}"><span class="pic" aria-hidden="true">📔</span><span style="flex:1;text-align:start"><b>${esc(j.title)}</b><span class="count">${esc(j.started_on)} · <span>${j.n} kayıt</span>${j.shared ? ' · 🔗 <span>Paylaşıldı</span>' : ''}</span></span><span class="count" aria-hidden="true">›</span></button>`).join('');
  return `<h1 class="xh">Gezi günlüklerim</h1><p class="note">Gezdiğin yerleri gün gün not et, fotoğraf ekle; istersen arkadaşlarınla bağlantıyla paylaş.</p>${form}${body}`;
}
function journalHTML() {
  const j = JR.cur, es = JR.entries;
  if (!j) return JR.err ? '<h1 class="xh">Gezi günlüğü</h1><p class="note">Bu günlük bulunamadı.</p>' : '<p class="note">Yükleniyor…</p>';
  const own = !!(ME && j.user_id === ME.id);
  const days = []; (es || []).forEach(e => { const d = days.find(x => x[0] === e.day); d ? d[1].push(e) : days.push([e.day, [e]]); });
  const places = own ? `<datalist id="jplaces">${PLACES.map(p => `<option value="${esc(p.n)} · ${esc(p.il)}">`).join('')}</datalist>` : '';
  return `<h1 class="xh" translate="no">${esc(j.title)}</h1><p class="count">${esc(j.started_on)} · <span>${(es || []).length} kayıt</span></p>
  ${own ? `<div class="box jshare"><label class="tg"><input type="checkbox" data-a="jshared"${j.shared ? ' checked' : ''}> <b>Bağlantıyla paylaş</b></label><p class="note" style="margin:4px 0 0">${j.shared ? 'Bağlantıyı bilen herkes günlüğünü görebilir.' : 'Şu an yalnızca sen görüyorsun.'}</p>${j.shared ? '<button class="btn" data-a="jlink" style="margin-top:8px">↗ <span>Paylaş</span></button>' : ''}</div>` : ''}
  ${!es || !es.length ? '<p class="note">Henüz kayıt yok</p>' : days.map(([d, l]) => `<h2 class="xh2 jday">${esc(d)}</h2>${l.map(e => {
    const p = e.place_id && byId(e.place_id), img = pubUrl(e.photo_path);
    return `<div class="box jent">${p ? `<button class="jpl" data-a="jplace" data-v="${esc(p.id)}"><b translate="no">${esc(p.n)}</b><span class="count">${esc(p.il)}</span></button>` : ''}${e.note ? `<p translate="no" class="jnote">${esc(e.note)}</p>` : ''}${img ? `<img src="${esc(img)}" alt="" loading="lazy" class="jimg">` : ''}${own ? `<button class="lnk" data-a="jdel" data-v="${esc(e.id)}">Sil</button>` : ''}</div>`;
  }).join('')}`).join('')}
  ${own ? `<form class="box jadd" data-f="jadd"><b>Kayıt ekle</b>
    <label class="count" for="jpl">Yer ara (isteğe bağlı)</label><input id="jpl" list="jplaces" autocomplete="off">${places}
    <label class="count" for="jday">Gün</label><input id="jday" type="date" required value="${new Date().toISOString().slice(0, 10)}">
    <label class="count" for="jtx">Not</label><textarea id="jtx" maxlength="1000" rows="3" placeholder="Neler yaşadın? Ne yedin, kimle tanıştın?"></textarea>
    <p class="note" style="margin:4px 0">Fotoğraf eklemek için uygulamayı kullanabilirsin.</p>
    <button class="btn pri" type="submit">Kaydet</button></form>
    <button class="btn" data-a="jdelall" style="width:100%;margin-top:18px">Günlüğü sil</button>` : `<p class="note" style="margin-top:18px">Türkiye Gezi Rehberi ile sen de gezi günlüğü tutabilirsin.</p>`}`;
}
const rx25 = renderX;
renderX = function () {
  if (XV && (XV.kind === 'journals' || XV.kind === 'journal')) {
    const back = `<button class="back" data-a="xback">${ICON.back}<span>${XV.prev ? 'Geri' : 'Tüm yerler'}</span></button>`;
    $('xbody').innerHTML = back + (XV.kind === 'journals' ? journalsHTML() : journalHTML());
    return;
  }
  rx25();
};
const xb25 = A.xback;
A.xback = function (...a) {
  if (XV && XV.kind === 'journal' && XV.prev === 'journals') { showX('journals'); loadJournals(); return; }
  return xb25.apply(this, a);
};
$('acctmenu').querySelector('[data-a="mtrip"]').insertAdjacentHTML('afterend', `<button role="menuitem" data-a="mjournal"><span class="emi" aria-hidden="true">📔</span><span>Gezi günlüklerim</span></button>`);
function placeFromInput(v) {
  v = String(v || '').trim(); if (!v) return null;
  const exact = PLACES.find(p => `${p.n} · ${p.il}` === v) || PLACES.find(p => p.n === v);
  if (exact) return exact;
  const f = fold(v.split(' · ')[0]); return PLACES.find(p => fold(p.n) === f) || null;
}
document.addEventListener('submit', async ev => {
  const f = ev.target.closest && ev.target.closest('form[data-f="jnew"],form[data-f="jadd"]'); if (!f) return;
  ev.preventDefault(); if (!ME || !needOnline()) return;
  const btn = f.querySelector('[type=submit]'); btn.disabled = true;
  try {
    if (f.dataset.f === 'jnew') {
      const title = $('jtitle').value.trim().slice(0, 80); if (!title) return;
      const { data, error } = await sb.from('journals').insert({ title }).select('id').single();
      if (error) throw error;
      track('act:journal_new'); showX('journal', data.id, 'journals'); loadJournal(data.id);
    } else {
      const raw = $('jpl').value, p = placeFromInput(raw), note = $('jtx').value.trim().slice(0, 1000), day = $('jday').value;
      if (raw.trim() && !p) { toast('Yer bulunamadı, listeden seç'); return; }
      if (!p && !note) { toast('Bir yer seç ya da not yaz'); return; }
      const { error } = await sb.from('journal_entries').insert({ journal_id: JR.cur.id, place_id: p ? p.id : null, day, note });
      if (error) throw error;
      track('act:journal_entry'); loadJournal(JR.cur.id);
    }
  } catch (e) { (typeof fail === 'function' ? fail : () => toast('Bir hata oluştu, lütfen tekrar dene.'))(e); } finally { btn.disabled = false; }
});
Object.assign(A, {
  mjournal: () => { toggleMenu(false); if (!CUR) { openAuth('in'); return; } if (!needOnline()) return; JR.list = null; showX('journals'); loadJournals(); },
  jopen: v => { if (!isUUID(v)) return; showX('journal', v, 'journals'); loadJournal(v); },
  jplace: v => { const d = document.getElementById('jpubdlg'); if (d && d.open) { if (!CUR) return; d.close(); JPUB = null; } if (byId(v)) { hideX(); select(v); } },
  jshared: async () => {
    const j = JR.cur; if (!j) return;
    const { error } = await sb.from('journals').update({ shared: !j.shared }).eq('id', j.id);
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); renderX(); return; }
    j.shared = !j.shared; if (j.shared) track('act:journal_share'); renderX();
  },
  jlink: () => { const j = JR.cur; if (j) shareLink(jLink(j.id), j.title, `📔 ${j.title} · ${tx('Türkiye Gezi Rehberi')}`); },
  jdel: async v => {
    const e = (JR.entries || []).find(x => x.id === v); if (!e) return;
    const { error } = await sb.from('journal_entries').delete().eq('id', v);
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    if (e.photo_path) sb.storage.from('photos').remove([e.photo_path]).catch(() => { });
    loadJournal(JR.cur.id);
  },
  jdelall: async () => {
    const j = JR.cur; if (!j || !window.confirm(tx('Bu günlük ve tüm kayıtları silinsin mi?'))) return;
    const paths = (JR.entries || []).map(e => e.photo_path).filter(Boolean);
    const { error } = await sb.from('journals').delete().eq('id', j.id);
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    if (paths.length) sb.storage.from('photos').remove(paths).catch(() => { });
    toast('Günlük silindi'); JR.list = null; showX('journals'); loadJournals();
  },
});
/* bağlantıyla gelen ve üye olmayan ziyaretçi: günlüğü giriş penceresinden önce, ayrı bir pencerede göster */
let JPUB = null;
function jpubHTML() {
  const h = journalHTML().replace(/<button class="btn" data-a="jdelall"[\s\S]*$/, '');
  return `<div class="dlg"><div class="dh"><span>📔</span><button type="button" class="xb" data-a="jpclose" aria-label="Kapat">${ICON.x || '✕'}</button></div><div class="jpub">${h}</div><button class="btn pri" data-a="jpclose" style="width:100%;margin-top:14px">${CUR ? 'Siteye devam et' : 'Sen de üye ol, gezini kaydet'}</button></div>`;
}
async function showJPub(id) {
  let d = document.getElementById('jpubdlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'jpubdlg'; d.setAttribute('aria-label', tx('Gezi günlüğü')); document.body.appendChild(d); }
  d.innerHTML = jpubHTML();
  try { if (adlg.open) adlg.close(); } catch (_) { }
  if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
  const [a, b] = await Promise.all([
    sb.from('journals').select('id,title,started_on,shared,user_id').eq('id', id).maybeSingle(),
    sb.from('journal_entries').select('id,place_id,day,note,photo_path,created_at').eq('journal_id', id).order('day').order('created_at'),
  ]);
  JR.cur = a.data || null; JR.entries = b.data || []; JR.err = !a.data;
  d.innerHTML = jpubHTML();
}
const gate25 = gate;
gate = function () { if (JPUB && !CUR) { showJPub(JPUB); return; } gate25(); };
A.jpclose = () => {
  const d = document.getElementById('jpubdlg'); if (d) { d.close ? d.close() : d.removeAttribute('open'); }
  JPUB = null; if (!CUR) gate25();
};
(function openJournalLink() {
  let id = null; try { id = new URLSearchParams(location.search).get('gunluk'); } catch (_) { }
  if (!isUUID(id)) return;
  let n = 0;
  const go = () => {
    if (!sb && n++ < 20) { setTimeout(go, 500); return; }
    if (!sb) return;
    track('act:open_link');
    if (CUR) { showX('journal', id); loadJournal(id); } else { JPUB = id; if (adlg.open) showJPub(id); }
    try { history.replaceState(null, '', location.pathname); } catch (_) { }
  };
  setTimeout(go, 700);
})();
