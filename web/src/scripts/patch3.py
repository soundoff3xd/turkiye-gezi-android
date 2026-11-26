import sys
b = sys.argv[1]
def rep(fn, pairs):
    t = open(f'{b}/{fn}').read()
    for old, new in pairs:
        assert t.count(old) == 1, (fn, old[:60])
        t = t.replace(old, new)
    open(f'{b}/{fn}', 'w').write(t)

rep('app1.js', [(
    "rating: (p.base.rating * p.base.count + mine.reduce((a, x) => a + x.rating, 0)) / count,",
    "rating: count ? (p.base.rating * p.base.count + mine.reduce((a, x) => a + x.rating, 0)) / count : 0,")])

rep('app2.js', [
    ('<span class="${hot(\'rating\')}"><span class="st" aria-hidden="true">★</span> ${rt(s.rating)}</span>',
     '${s.count ? `<span class="${hot(\'rating\')}"><span class="st" aria-hidden="true">★</span> ${rt(s.rating)}</span>` : \'<span class="badge">Yeni</span>\'}${p.added ? \'<span class="badge">Topluluk ekledi</span>\' : \'\'}'),
    ('<span>${stars(s.rating)} <b>${rt(s.rating)}</b> <span class="count">(${fmt(s.count)} yorum)</span></span>',
     '${s.count ? `<span>${stars(s.rating)} <b>${rt(s.rating)}</b> <span class="count">(${fmt(s.count)} yorum)</span></span>` : \'<span class="count">Henüz puan yok</span>\'}${p.added ? `<span class="count">${esc(p.added)} önerdi, topluluk onayladı</span>` : \'\'}'),
    ('body = `<div class="sum"><div class="big">${rt(s.rating)}</div><div>${stars(s.rating)}<div class="count">${fmt(s.count)} yorum</div></div></div>',
     'body = `${s.count ? `<div class="sum"><div class="big">${rt(s.rating)}</div><div>${stars(s.rating)}<div class="count">${fmt(s.count)} yorum</div></div></div>` : \'\'}'),
    ("  $('listv').hidden = !!S.sel; $('detailv').hidden = !S.sel;",
     "  $('pendv').hidden = true; $('listv').hidden = !!S.sel; $('detailv').hidden = !S.sel;"),
])

CSS = """.stbar{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:13px;font-weight:600}
.st-wait{color:var(--star)}.st-mod{color:var(--accent)}.st-ok{color:var(--ok)}.st-no{color:var(--muted)}
.prog{height:6px;border-radius:3px;background:var(--line);margin-top:6px;overflow:hidden}.prog i{display:block;height:100%;background:var(--ok)}
.pin.pend i{background:var(--surface);border:2.5px dashed var(--accent)}
.pin.pickpt i{width:26px;height:26px;background:var(--ok);border:3px solid #fff}
#map.picking{cursor:crosshair}
#pickbar{position:absolute;z-index:25;left:50%;top:124px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;background:var(--ink);color:var(--bg);padding:6px 6px 6px 16px;border-radius:24px;box-shadow:var(--shadow);font-size:14px;font-weight:600;white-space:nowrap}
#pickbar button{height:36px;border:0;border-radius:18px;padding:0 14px;background:var(--bg);color:var(--ink);font-weight:600}
.sel-in{width:100%;height:44px;border-radius:12px;border:1px solid var(--chip-line);background:var(--surface);padding:0 10px}
.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.locrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px}
.chk{display:flex;align-items:center;gap:10px;min-height:44px;margin-top:8px;font-size:14px}.chk input{width:20px;height:20px;accent-color:var(--accent)}
#serr{color:var(--accent);font-size:14px;margin-top:12px}#serr ul{margin:6px 0 0;padding-left:18px}
.btn:disabled{opacity:.55;cursor:default}
"""
MARKUP_PEND = """    <div id="pendv" class="view" hidden>
      <div class="vs" id="pend"></div>
    </div>
  </aside>"""
DLG = """  <dialog id="suggest" aria-labelledby="sgt">
    <form class="dlg" id="sform" novalidate>
      <div class="dh"><div><h2 id="sgt" style="font-size:20px">Yeni yer öner</h2><div class="count">Uygulamada olmayan, gezdiğin bir yer</div></div><button type="button" class="xb" data-a="sclose" aria-label="Kapat"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      <label class="lab" for="sname">Yerin adı</label>
      <input class="in" id="sname" style="width:100%" maxlength="70" placeholder="Örneğin: Tortum Şelalesi">
      <span class="lab">Konum</span>
      <div class="locrow"><button type="button" class="btn" style="flex:none;padding:0 16px" id="spick" data-a="spick">Haritada işaretle</button><span class="count" id="sloc"></span></div>
      <div class="two"><div><label class="lab" for="sil">İl</label><select class="sel-in" id="sil"></select></div><div><label class="lab" for="scat">Kategori</label><select class="sel-in" id="scat"></select></div></div>
      <label class="lab" for="sdesc">Kısa açıklama</label>
      <textarea class="in" id="sdesc" rows="3" maxlength="300" placeholder="Ne görülür, neden gidilmeli?"></textarea>
      <label class="file"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>Kanıt fotoğrafı ekle (orada çektiğin)<input type="file" id="sfile" accept="image/*,video/*"></label>
      <div id="sprev"></div>
      <label class="chk"><input type="checkbox" id="sbeen">Bu yeri kendim ziyaret ettim</label>
      <div id="serr" role="alert"></div>
      <button class="go" type="submit">İncelemeye gönder</button>
      <p class="note">Önerin otomatik kontrollerden geçer, sonra ${NEED} kullanıcı onaylayınca haritaya eklenir. Şikâyet alan öneriler moderatöre gider.</p>
    </form>
  </dialog>
  <div id="pickbar" hidden>Konumu seçmek için haritaya dokun<button type="button" data-a="pickcancel">Vazgeç</button></div>
  <div id="toast\""""
DLG = DLG.replace('${NEED}', '3')
rep('template.html', [
    ("--shadow:0 6px 24px rgba(20,49,58,.18);", "--shadow:0 6px 24px rgba(20,49,58,.18);--ok:#2E6B47;"),
    ("--shadow:0 6px 24px rgba(0,0,0,.5);color-scheme:dark}}", "--shadow:0 6px 24px rgba(0,0,0,.5);--ok:#6BC28F;color-scheme:dark}}"),
    ("--shadow:0 6px 24px rgba(0,0,0,.5);color-scheme:dark}\n[hidden]", "--shadow:0 6px 24px rgba(0,0,0,.5);--ok:#6BC28F;color-scheme:dark}\n" + CSS + "[hidden]"),
    ('<div class="lh"><h1>Gezilecek yerler</h1><span class="count" id="count"></span></div>',
     '<div class="lh"><h1>Gezilecek yerler</h1><span class="count" id="count"></span></div>\n        <div class="acts" style="margin-top:8px"><button class="btn pri" data-a="sugg">Yer öner</button><button class="btn" data-a="pend" id="pendbtn">Onay bekleyenler</button></div>'),
    ("  </aside>", MARKUP_PEND),
    ('  <div id="toast"', DLG),
])
rep('../scripts/build.py', [("open(b + '/app2.js').read()", "open(b + '/app2.js').read() + '\\n' + open(b + '/app3.js').read()")])
print('ok')
