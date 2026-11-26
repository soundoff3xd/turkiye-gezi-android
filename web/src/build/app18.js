/* ===== aşama 1: bilgi düzeltme, moderatör sekmeleri, hata kaydı, anonim kullanım sayıları ===== */

/* ---- anonim kullanım sayıları: yalnızca "hangi ekran/eylem kaç kez" (kimlik yok) ---- */
const TRK = { m: {}, t: null };
function track(name) {
  name = String(name).toLowerCase().replace(/[^a-z0-9_:.-]/g, '').slice(0, 40); if (!name) return;
  TRK.m[name] = Math.min(200, (TRK.m[name] || 0) + 1);
  if (!TRK.t) TRK.t = setTimeout(trackFlush, 60000);
}
function trackFlush() {
  clearTimeout(TRK.t); TRK.t = null;
  const ev = TRK.m; if (!Object.keys(ev).length || !ONLINE()) return;
  TRK.m = {};
  sb.rpc('track', { p_platform: 'web', p_events: ev }).then(() => { }, () => { });
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') trackFlush(); });
addEventListener('pagehide', trackFlush);
const TRK_ACTS = new Set(['visit', 'fav', 'compose', 'share', 'tripadd', 'report', 'fbsend', 'csend', 'navgo', 'xrec', 'mtrip', 'paint', 'gshare', 'bell']);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.getAttribute('data-a'); if (TRK_ACTS.has(a)) track('act:' + a);
}, true);
const sx18 = showX; showX = function (kind, arg, prev) { track('screen:' + kind); return sx18(kind, arg, prev); };
const sel18 = select; select = function (id) { track('screen:place'); return sel18(id); };
track('screen:open');

/* ---- hata kaydı: site çökerse mesaj + yığın, en fazla 8 kayıt/oturum, aynı mesaj bir kez ---- */
const CRASH = { n: 0, last: '' };
function logCrash(msg, stack, ctx) {
  try {
    msg = String(msg || 'Hata').slice(0, 500);
    if (!ONLINE() || CRASH.n >= 8 || msg === CRASH.last || /ResizeObserver loop|Script error\.?$/.test(msg)) return;
    CRASH.n++; CRASH.last = msg;
    sb.rpc('log_crash', { p_platform: 'web', p_version: 'web', p_message: msg, p_stack: String(stack || '').slice(0, 4000), p_context: String(ctx || location.pathname).slice(0, 200) }).then(() => { }, () => { });
  } catch (_) { }
}
addEventListener('error', e => { if (e && e.message) logCrash(e.message, e.error && e.error.stack, (e.filename || '').split('/').pop() + ':' + e.lineno); });
addEventListener('unhandledrejection', e => { const r = e && e.reason; logCrash(r && r.message ? r.message : String(r), r && r.stack, 'promise'); });

/* ---- moderatörün onayladığı konum/kapandı düzeltmeleri ---- */
const lcp18 = loadCommunityPlaces;
loadCommunityPlaces = async function () {
  await lcp18();
  try {
    const { data } = await sb.from('place_overrides').select('place_id,lat,lng,closed');
    (data || []).forEach(o => {
      const i = PLACES.findIndex(p => p.id === o.place_id); if (i < 0) return;
      if (o.closed) { PLACES.splice(i, 1); return; }
      const p = PLACES[i];
      if (o.lat != null && o.lng != null) { p.lat = o.lat; p.lng = o.lng; [p.x, p.y] = proj(p.lng, p.lat); }
    });
  } catch (_) { }
};

/* ---- "Bilgi yanlış mı?" düzeltme önerisi ---- */
const CORK = [['konum', '📍', 'Konum yanlış'], ['bilgi', '📝', 'Açıklama veya bilgi yanlış'], ['kapali', '🚫', 'Burası kapandı / artık yok'], ['diger', '💬', 'Başka bir şey']];
const COR = { pid: null, kind: null, here: false };
document.body.insertAdjacentHTML('beforeend', `
<dialog id="cordlg" aria-labelledby="cort"><div class="dlg"><div class="dh"><h2 id="cort" style="font-size:20px">Bilgi yanlış mı?</h2><button type="button" class="xb" data-a="dclose" data-v="cordlg" aria-label="Kapat">${CLOSE_SVG}</button></div>
  <p style="margin-top:0">Neyin yanlış olduğunu söyle, moderatör inceleyip düzeltsin.</p>
  <div id="corkinds" class="corl"></div>
  <textarea class="in" id="cortext" rows="3" maxlength="600" placeholder="Doğrusu ne? Kısaca yaz…" hidden></textarea>
  <button class="btn pri" style="width:100%;margin-top:10px" data-a="csend" id="corgo" disabled>Gönder</button></div></dialog>`);
function renderCor() {
  $('corkinds').innerHTML = CORK.map(([k, i, l]) => `<button type="button" class="row corr" data-a="ckind" data-v="${k}" aria-pressed="${COR.kind === k}"><span aria-hidden="true">${i}</span><span class="rb"><span class="rn">${l}</span></span></button>`).join('')
    + (COR.kind === 'konum' ? `<button type="button" class="row corr dash" data-a="chere" aria-pressed="${COR.here}"><span aria-hidden="true">${COR.here ? '☑' : '☐'}</span><span class="rb"><span class="rn">${MEPOS ? 'Şu an buradayım, doğru konum benim konumum' : 'Konumumu kullan'}</span></span></button>` : '');
  $('cortext').hidden = !COR.kind;
  corValid();
}
function corValid() {
  const n = $('cortext').value.trim().length;
  $('corgo').disabled = !(COR.kind && (n >= 3 || COR.kind === 'kapali' || (COR.kind === 'konum' && COR.here && MEPOS)));
}
$('cortext').addEventListener('input', corValid);
const rd18 = renderDetail;
renderDetail = function () {
  rd18();
  if (S.tab !== 'ov' || !S.sel) return;
  const d = $('detail'), p = byId(S.sel); if (!p) return;
  const notes = d.querySelectorAll(':scope > p.note'); const at = notes[notes.length - 1];
  const html = `<button type="button" class="linkbtn corlink" data-a="cor" data-v="${esc(p.id)}">⚑ <span>Bilgi yanlış mı? Düzeltme öner</span></button>`;
  if (at) at.insertAdjacentHTML('afterend', html); else d.insertAdjacentHTML('beforeend', html);
};
Object.assign(A, {
  cor: v => {
    if (!CUR) { openAuth('in'); return; }
    Object.assign(COR, { pid: v, kind: null, here: false }); $('cortext').value = ''; renderCor(); openDlg($('cordlg'));
  },
  ckind: v => { COR.kind = v; renderCor(); },
  chere: () => {
    COR.here = !COR.here;
    if (COR.here && !MEPOS && typeof A.locate === 'function') { try { A.locate(); } catch (_) { } }
    renderCor();
  },
  csend: async () => {
    if (!needOnline() || !ME || !COR.kind) return;
    const here = COR.kind === 'konum' && COR.here && MEPOS ? MEPOS : null;
    $('corgo').disabled = true;
    const { error } = await sb.from('corrections').insert({ place_id: COR.pid, kind: COR.kind, note: $('cortext').value.trim().slice(0, 600), lat: here ? here.lat : null, lng: here ? here.lng : null });
    $('corgo').disabled = false;
    if (error) { toast(/limit/i.test(error.message || '') ? 'Bugün çok fazla öneri gönderdin. Yarın tekrar deneyebilirsin.' : 'Bir hata oluştu, lütfen tekrar dene.'); return; }
    closeDlg($('cordlg')); toast('Teşekkürler! Önerin moderatöre iletildi.');
  },
});

/* ---- moderatör paneli: düzeltmeler, hatalar, istatistik sekmeleri ---- */
Object.assign(MOD, { cors: null, crashes: null, usage: null, days: 7, stack: null });
const CORTXT = Object.fromEntries(CORK.map(([k, i, l]) => [k, [i, l]]));
loadMod = async function () {
  if (!ONLINE()) { Object.assign(MOD, { fbs: [], reps: [], cors: [], crashes: [] }); renderX(); return; }
  // bir sorgu başarısız olsa da diğer sekmeler dolsun
  const safe = q => Promise.resolve(q).then(x => x || {}, () => ({ data: null }));
  const [f, r, c, e] = await Promise.all([
    safe(sb.from('feedback').select('*').order('created_at', { ascending: false }).limit(200)),
    safe(sb.rpc('mod_reports')),
    safe(sb.from('corrections').select('*').order('created_at', { ascending: false }).limit(200)),
    safe(sb.from('crash_reports').select('*').order('created_at', { ascending: false }).limit(150)),
  ]);
  MOD.fbs = f.data || []; MOD.reps = r.data || []; MOD.cors = c.data || []; MOD.crashes = e.data || [];
  const ids = [...new Set([...MOD.fbs, ...MOD.cors].map(x => x.user_id))];
  if (ids.length) { const { data: ps } = await sb.from('profiles').select('id,name').in('id', ids); MOD.names = Object.fromEntries((ps || []).map(p => [p.id, p.name])); }
  if (MOD.tab === 'stat') await loadUsage();
  if (XV && XV.kind === 'mod') renderX();
};
async function loadUsage() {
  MOD.usage = null; if (XV && XV.kind === 'mod') renderX();
  const { data } = await sb.rpc('mod_usage', { p_days: MOD.days });
  MOD.usage = (data || []).map(x => ({ name: x.name, platform: x.platform, n: +x.n }));
  if (XV && XV.kind === 'mod') renderX();
}
const mh18 = modHTML;
function distM(a, b, c, d) { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.round(Math.sqrt(x * x + y * y) * 6371000); }
modHTML = function () {
  if (!CUR || !CUR.mod) return mh18();
  const tab = MOD.tab;
  const open = (MOD.fbs || []).filter(f => !f.handled).length, openCor = (MOD.cors || []).filter(c => c.status === 'open').length;
  const T = [['fb', 'Geri bildirimler', open], ['rep', 'Şikâyetler', (MOD.reps || []).length], ['cor', 'Düzeltmeler', openCor], ['err', 'Hatalar', (MOD.crashes || []).length], ['stat', 'İstatistik', null]];
  const tabs = `<div class="tabs modtabs" role="tablist">${T.map(([k, l, n]) => `<button class="tab" role="tab" data-a="modtab" data-v="${k}" aria-selected="${tab === k}"><span>${l}</span>${n != null ? ` (${n})` : ''}</button>`).join('')}</div>`;
  if (tab === 'fb' || tab === 'rep') {
    const h = mh18(); const i = h.indexOf('</div>', h.indexOf('class="tabs"'));
    return `<h1 class="xh">Moderatör paneli</h1>${tabs}${h.slice(i + 6)}`;
  }
  let body = '';
  if (tab === 'cor') {
    body = MOD.cors == null ? '<p class="note">Yükleniyor…</p>' : !MOD.cors.length ? '<p class="note">Düzeltme önerisi yok</p>' : MOD.cors.map(c => {
      const p = byId(c.place_id), [ic, l] = CORTXT[c.kind] || ['', c.kind];
      const canApply = (c.kind === 'konum' && c.lat != null) || c.kind === 'kapali';
      return `<div class="card${c.status !== 'open' ? ' dim' : ''}"><b>${ic} <span>${l}</span></b>
        <div style="color:var(--accent);font-weight:700;margin-top:2px" translate="no">${esc(p ? p.n + ' · ' + p.il : c.place_id)}</div>
        ${c.note ? `<p style="margin:6px 0 0;white-space:pre-wrap" translate="no">${esc(c.note)}</p>` : ''}
        ${c.lat != null ? `<div class="count">📍 <a href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}" target="_blank" rel="noopener">${(+c.lat).toFixed(5)}, ${(+c.lng).toFixed(5)}</a>${p ? ` · ${fmt(distM(p.lat, p.lng, c.lat, c.lng))} m` : ''}</div>` : ''}
        <span class="count">${esc(agoText(c.created_at))} · <span translate="no">${esc(MOD.names[c.user_id] || '?')}</span>${c.status === 'done' ? ' · ✓ <span>Çözüldü</span>' : c.status === 'rejected' ? ' · <span>Reddedildi</span>' : ''}</span>
        <div class="acts">${c.status === 'open'
          ? `${canApply ? `<button class="btn pri" data-a="corres" data-v="${c.id}:done:1">${c.kind === 'kapali' ? 'Kapandı olarak işaretle' : 'Konumu uygula'}</button>` : ''}<button class="btn" data-a="corres" data-v="${c.id}:done:0">✓ <span>Çözüldü</span></button><button class="btn" data-a="corres" data-v="${c.id}:rejected:0">Reddet</button>`
          : `<button class="btn" data-a="corres" data-v="${c.id}:open:0">Yeniden aç</button>`}</div></div>`;
    }).join('');
  } else if (tab === 'err') {
    body = MOD.crashes == null ? '<p class="note">Yükleniyor…</p>' : !MOD.crashes.length ? '<p class="note"><span>Kayıtlı hata yok</span>. <span>Uygulama ya da site çöktüğünde burada görünür.</span></p>'
      : `<div class="acts" style="justify-content:flex-end"><button class="btn" data-a="crdel" data-v="all">Hepsini temizle</button></div>` + MOD.crashes.map(x => `<div class="card">
        <b style="color:var(--accent)" translate="no">${esc(x.message)}</b>
        <div class="count">${esc(agoText(x.created_at))} · ${esc([x.platform, x.version, x.context].filter(Boolean).join(' · '))}</div>
        ${x.stack ? `<button class="linkbtn" data-a="crstack" data-v="${x.id}">${MOD.stack === x.id ? 'Ayrıntıyı gizle' : 'Ayrıntıyı göster'}</button>${MOD.stack === x.id ? `<pre class="crst" translate="no">${esc(x.stack.slice(0, 3000))}</pre>` : ''}` : ''}
        <div class="acts"><button class="btn" data-a="crdel" data-v="${x.id}">Sil</button></div></div>`).join('');
  } else {
    const chips = `<div class="chips wrapc" style="margin-top:12px">${[1, 7, 30].map(d => `<button class="chip" data-a="usedays" data-v="${d}" aria-pressed="${MOD.days === d}">${d === 1 ? 'Bugün' : `Son ${d} gün`}</button>`).join('')}</div>
      <p class="note">Yalnızca anonim sayılar: kim olduğun değil, hangi ekranın kaç kez açıldığı.</p>`;
    if (MOD.usage == null) body = chips + '<p class="note">Yükleniyor…</p>';
    else if (!MOD.usage.length) body = chips + '<p class="note">Henüz veri yok</p>';
    else {
      const plat = {}, by = {};
      MOD.usage.forEach(u => { plat[u.platform] = (plat[u.platform] || 0) + u.n; const [g, ...r] = u.name.split(':'); const k = r.join(':') || g; (by[g] = by[g] || {})[k] = (by[g][k] || 0) + u.n; });
      const GL = { tab: 'Sekmeler', screen: 'Ekranlar', act: 'Eylemler' };
      body = chips + `<div class="ustat">${Object.entries(plat).map(([k, n]) => `<div class="card"><b class="unum">${fmt(n)}</b><span>${k === 'web' ? 'Site' : k === 'android' ? 'Android' : esc(k)}</span></div>`).join('')}</div>`
        + Object.entries(by).map(([g, m]) => {
          const rows = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 15), max = rows[0][1] || 1;
          return `<div class="card"><b>${GL[g] || esc(g)}</b>${rows.map(([k, n]) => `<div class="ubar"><div class="lvl"><span translate="no">${esc(k)}</span><span class="count">${fmt(n)}</span></div><i style="width:${Math.max(3, n / max * 100)}%"></i></div>`).join('')}</div>`;
        }).join('');
    }
  }
  return `<h1 class="xh">Moderatör paneli</h1>${tabs}${body}`;
};
const mt18 = A.modtab;
Object.assign(A, {
  mmod: () => { toggleMenu(false); Object.assign(MOD, { fbs: null, reps: null, cors: null, crashes: null }); showX('mod'); loadMod(); },
  modtab: v => { mt18(v); if (v === 'stat' && MOD.usage == null) loadUsage(); },
  usedays: v => { MOD.days = +v; loadUsage(); },
  corres: async v => {
    const [id, st, ap] = v.split(':');
    const { error } = await sb.rpc('mod_resolve_correction', { p_id: id, p_status: st, p_apply: ap === '1' });
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    toast(ap === '1' ? 'Düzeltme uygulandı' : 'Kaydedildi');
    if (ap === '1') { try { await loadCommunityPlaces(); refreshAll(); } catch (_) { } }
    loadMod();
  },
  crstack: v => { MOD.stack = MOD.stack === +v ? null : +v; renderX(); },
  crdel: async v => {
    const q = sb.from('crash_reports').delete();
    const { error } = v === 'all' ? await q.gte('id', 0) : await q.eq('id', +v);
    if (error) { toast('Bir hata oluştu, lütfen tekrar dene.'); return; }
    loadMod();
  },
});
