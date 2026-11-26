const { chromium } = require('playwright');
const fs = require('fs');
const [file, out, mockSrc] = process.argv.slice(2);
let MOCK = fs.readFileSync(mockSrc, 'utf8').split('const MOCK = `')[1].split('`;\n')[0];
MOCK = MOCK.replace('eq(k, v) {', 'in() { return b; }, eq(k, v) {').replace("suggestion_votes: [], users: [] }", "suggestion_votes: [], users: [], feedback: [], reports: [] }");
const WX = { current: { temperature_2m: 14.3, weather_code: 2 }, daily: { time: ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'], weather_code: [2, 61, 0, 71], temperature_2m_max: [15, 12, 16, 5], temperature_2m_min: [4, 6, 3, -2], precipitation_probability_max: [10, 80, 0, 60] } };
(async () => {
  const b = await chromium.launch(); const log = [], errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', deviceScaleFactor: 2, permissions: ['geolocation'], geolocation: { latitude: 38.6431, longitude: 34.8289 } });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  pg.on('dialog', d => d.dismiss());
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} navigator.share = async d => { window.__shared = d; }; });
  await pg.addInitScript(MOCK);
  await pg.addInitScript(`(() => { const cc = window.supabase.createClient; window.supabase.createClient = (...a) => { const c = cc(...a);
    c.functions = { invoke: async (n, o) => { window.__route = o.body; const cs = o.body.coordinates; const geom = []; for (let i = 0; i < cs.length - 1; i++) for (let k = 0; k < 10; k++) geom.push([cs[i][0] + (cs[i+1][0]-cs[i][0])*k/10, cs[i][1] + (cs[i+1][1]-cs[i][1])*k/10]); geom.push(cs[cs.length-1]);
      const steps = []; for (let i = 0; i < cs.length - 1; i++) { steps.push({ i: 'Düz devam et', d: 800, t: 120, w: i*10, e: i*10+5, y: i ? 11 : 11, k: i }, { i: 'Sağa dön, Göreme yoluna gir', d: 600, t: 90, w: i*10+5, e: i*10+10, y: 1, k: i }); } steps.push({ i: 'Hedefe vardın', d: 0, t: 0, w: geom.length-1, e: geom.length-1, y: 10, k: cs.length-2 });
      return { data: { geometry: { type: 'LineString', coordinates: geom }, distance: 1400*(cs.length-1), duration: 210*(cs.length-1), steps, legs: cs.slice(1).map(() => ({ d: 1400, t: 210 })), lang: 'tr' }, error: null }; } };
    const rpc0 = c.rpc.bind(c); c.rpc = (n, a) => n === 'mod_reports' ? Promise.resolve({ data: window.__db.reports.map(r => ({ target_type: r.target_type, target_id: r.target_id, reports: 1, reasons: [r.reason], last_at: r.created_at, hidden: false, body: 'Kötü yorum', photo_path: null, place_id: 'goreme', author: 'Ali' })), error: null }) : rpc0(n, a);
    return c; }; })()`);
  await pg.route(/supabase\.co/, r => r.fulfill({ status: 200, body: '{}' }));
  await pg.route(/open-meteo/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(WX) }));
  await pg.route(/fonts\.|jsdelivr|openfreemap|maptiler/, r => r.abort());
  await pg.goto('file://' + file + '?yer=efes'); await pg.waitForTimeout(1300);
  log.push(`bağlantı ?yer=efes → seçili: ${await pg.evaluate(() => S.sel)} | adres temizlendi: ${await pg.evaluate(() => !location.search)}`);
  await pg.click('[data-a="amode"][data-v="up"]'); await pg.fill('#aname', 'Mert'); await pg.fill('#aemail', 'm@ornek.com'); await pg.fill('#apass', 'sifre-12345'); await pg.click('#ago');
  await pg.waitForTimeout(1200);
  log.push(`gizlilik bağlantısı giriş penceresinde: ${await pg.evaluate(() => !!document.querySelector('#aform [data-a="mprivacy"]'))}`);
  await pg.evaluate(() => { S.sel = null; showView(); fitTurkey(false); });
  await pg.waitForTimeout(400);
  log.push(`harita: ünlü yer ${await pg.$$eval('#pins .lmp:not(.lmc)', e => e.length)} | ünlü yerli küme ${await pg.$$eval('#pins .lmc', e => e.length)} | kategori ${await pg.$$eval('#pins .mkp', e => e.length)} | düz küme ${await pg.$$eval('#pins .cl', e => e.length)}`);
  await pg.screenshot({ path: out + '/v6-harita.png' });
  // yer kartı: gezi listesi, paylaş, hava durumu
  const nev = await pg.evaluate(() => PLACES.filter(p => p.il === 'Nevşehir').slice(0, 3).map(p => p.id));
  for (const id of nev) { await pg.evaluate(id => select(id), id); await pg.waitForTimeout(250); await pg.click('#detail [data-a="tripadd"]'); }
  await pg.waitForTimeout(500);
  log.push(`gezi listesi: ${await pg.evaluate(() => TRIP.join(','))} | hava kutusu: ${await pg.$eval('#wxbox', e => e.innerText.replace(/\s+/g, ' ').slice(0, 90)).catch(() => 'YOK')}`);
  await pg.screenshot({ path: out + '/v6-kart.png', fullPage: false });
  await pg.click('#detail [data-a="share"]'); await pg.waitForTimeout(200);
  log.push(`paylaş: ${JSON.stringify(await pg.evaluate(() => window.__shared && window.__shared.url.split('?')[1]))}`);
  // gezi listem → rota → navigasyon
  await pg.click('#acct'); await pg.click('#acctmenu [data-a="mtrip"]'); await pg.waitForTimeout(300);
  log.push(`gezi listem görünümü: ${await pg.$$eval('#xbody .trip li', e => e.length)} durak`);
  await pg.click('#xbody [data-a="troute"]'); await pg.waitForTimeout(1500);
  log.push(`çok duraklı rota: istek ${await pg.evaluate(() => window.__route.coordinates.length)} nokta | ayaklar ${await pg.$$eval('#xbody .legs li', e => e.length)} | çizgi ${!!(await pg.$('#routepath'))}`);
  await pg.screenshot({ path: out + '/v6-gezi.png' });
  await pg.click('#xbody [data-a="tnav"]'); await pg.waitForTimeout(1500);
  log.push(`navigasyon: mod ${await pg.evaluate(() => document.body.classList.contains('navmode'))} | panel gizli ${await pg.evaluate(() => getComputedStyle($('panel')).display === 'none')} | üst: ${await pg.$eval('#navui .nbanner', e => e.innerText.replace(/\s+/g, ' '))} | alt: ${await pg.$eval('#navui .npanel', e => e.innerText.replace(/\s+/g, ' '))}`);
  await pg.screenshot({ path: out + '/v6-nav.png' });
  const pts = await pg.evaluate(() => NAV.route.geometry.coordinates);
  await ctx.setGeolocation({ latitude: pts[3][1] + 0.0012, longitude: pts[3][0] + 0.0012 }); await pg.waitForTimeout(700);
  await ctx.setGeolocation({ latitude: pts[3][1] + 0.0013, longitude: pts[3][0] + 0.0013 }); await pg.waitForTimeout(900);
  log.push(`rotadan çıkınca yeniden hesap: ${await pg.evaluate(() => NAV && (NAV.lastRe > 0) + ' · ' + NAV.status + ' · başlangıç ' + window.__route.coordinates[0].map(x => x.toFixed(4)).join(','))}`);
  await pg.click('[data-a="navend"]'); await pg.waitForTimeout(300);
  log.push(`navigasyon bitti: ${await pg.evaluate(() => !document.body.classList.contains('navmode') && $('navui').hidden)}`);
  // nereye gitmeliyim
  await pg.click('#acct'); await pg.click('#acctmenu [data-a="mrec"]'); await pg.waitForTimeout(200);
  await pg.click('#xbody [data-a="rsub"][data-v="antik"]'); await pg.waitForTimeout(200);
  log.push(`öneri (antik kent): ${(await pg.$$eval('#xbody .card.city .cn', e => e.slice(0, 5).map(x => x.textContent))).join(', ')}`);
  await pg.screenshot({ path: out + '/v6-oneri.png' });
  await pg.click('#xbody .card.city'); await pg.waitForTimeout(400);
  log.push(`şehir planı: ${await pg.$eval('#xbody .xh', e => e.textContent)} | ${await pg.$$eval('#xbody .plan li', e => e.length)} durak | gün sekmeleri ${await pg.$$eval('#xbody .tabs .tab', e => e.length)}`);
  await pg.screenshot({ path: out + '/v6-sehir.png' });
  await pg.click('#xbody [data-a="xback"]'); await pg.waitForTimeout(200);
  log.push(`geri → ${await pg.$eval('#xbody .xh', e => e.textContent)}`);
  // geri bildirim
  await pg.click('#acct'); await pg.click('#acctmenu [data-a="mfeedback"]'); await pg.waitForTimeout(300);
  await pg.click('#fbdlg [data-a="fbkind"][data-v="hata"]'); await pg.click('#fbdlg [data-a="fbstar"][data-v="4"]'); await pg.fill('#fbtext', 'Harita bazen yavaş açılıyor.'); await pg.click('#fbgo'); await pg.waitForTimeout(500);
  log.push(`geri bildirim kaydı: ${JSON.stringify(await pg.evaluate(() => window.__db.feedback.map(f => [f.kind, f.rating, f.platform])))} | gönderdiklerim: ${await pg.$$eval('#fbmine .card', e => e.length)}`);
  await pg.screenshot({ path: out + '/v6-geribildirim.png' });
  await pg.click('#fbdlg [data-a="dclose"]');
  // şikâyet
  await pg.evaluate(() => { S.posts.unshift({ id: 'r-x', pid: 'goreme', author: 'Ali', uid: 'u-ali', ruid: 'u-ali', av: null, rating: 1, text: 'Kötü yorum', media: { kind: 'photo', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }, likes: 0, replies: [], ago: 'az önce', at: Date.now() }); select('goreme'); S.tab = 'rev'; renderDetail(); });
  await pg.click('#detail .rpt'); await pg.waitForTimeout(200);
  log.push(`şikâyet: seçenekler ${await pg.$$eval('#rpbody .row', e => e.length)}`);
  await pg.click('#rpbody [data-a="rptype"][data-v="photo"]'); await pg.click('#rpbody [data-a="rpsend"][data-v="uygunsuz"]'); await pg.waitForTimeout(500);
  log.push(`şikâyet kaydı: ${JSON.stringify(await pg.evaluate(() => window.__db.reports.map(r => [r.target_type, r.target_id, r.reason])))}`);
  // gizlilik
  await pg.click('#acct'); await pg.click('#acctmenu [data-a="mprivacy"]'); await pg.waitForTimeout(200);
  log.push(`gizlilik: ${await pg.$$eval('#privdlg .ph3', e => e.length)} bölüm | ${await pg.$eval('#privdate', e => e.textContent)}`);
  await pg.click('#privdlg [data-a="dclose"]');
  // profil rozetleri + moderatör
  await pg.evaluate(() => { CUR.mod = true; showProfile(true); });
  log.push(`rozetler: ${await pg.$$eval('#prof .bdg', e => e.length)} rozet, kazanılan ${await pg.$$eval('#prof .bdg.ok', e => e.length)} | ayar satırları ${await pg.$$eval('#prof .setl .row', e => e.length)}`);
  await pg.screenshot({ path: out + '/v6-profil.png', fullPage: false });
  log.push('mod satırı görünür: ' + await pg.$eval('#prof [data-a="mmod"]', e => !!(e.offsetWidth || e.offsetHeight)));
  await pg.evaluate(() => A.mmod()); await pg.waitForTimeout(500);
  log.push(`moderatör: geri bildirim ${await pg.$$eval('#xbody .card', e => e.length)} | sekmeler ${await pg.$$eval('#xbody .tabs .tab', e => e.map(x => x.textContent).join(' / '))}`);
  await pg.click('#xbody [data-a="modtab"][data-v="rep"]'); await pg.waitForTimeout(200);
  log.push(`moderatör şikâyetler: ${await pg.$$eval('#xbody .card', e => e.length)}`);
  // İngilizce
  await pg.evaluate(() => setLang('en')); await pg.waitForTimeout(300);
  log.push(`en: ${await pg.$eval('#xbody .xh', e => e.textContent)} | ${await pg.$eval('#xbody .tabs', e => e.innerText.replace(/\s+/g, ' '))}`);
  const trLeft = sel => pg.evaluate(sel => { const out = new Set(); document.querySelectorAll(sel).forEach(root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (t && /[çğışöüÇĞİŞÖÜ]/.test(t) && !n.parentElement.closest('.rn,.tname b,.cn,.cm,b.xh,h1.xh,.count span:first-child')) out.add(t.slice(0, 80)); } }); return [...out]; }, sel);
  const left = [];
  for (const v of ['rec', 'trip', 'mod']) { await pg.evaluate(v => showX(v), v); await pg.waitForTimeout(150); left.push(...await trLeft('#xbody')); }
  await pg.evaluate(() => { REC.subs = ['antik']; showX('city', 'Antalya', 'rec'); }); await pg.waitForTimeout(150); left.push(...await trLeft('#xbody'));
  await pg.evaluate(() => { A.mfeedback(); }); await pg.waitForTimeout(300); left.push(...await trLeft('#fbdlg')); await pg.evaluate(() => closeDlg($('fbdlg')));
  await pg.evaluate(() => { A.mprivacy(); }); await pg.waitForTimeout(200); left.push(...await trLeft('#privdlg')); await pg.evaluate(() => closeDlg($('privdlg')));
  await pg.evaluate(() => { A.report('review:r-x:photo'); }); await pg.waitForTimeout(200); left.push(...await trLeft('#rpdlg')); await pg.evaluate(() => { A.rptype('review'); }); left.push(...await trLeft('#rpdlg')); await pg.evaluate(() => closeDlg($('rpdlg')));
  await pg.evaluate(() => { showProfile(true); }); await pg.waitForTimeout(200); left.push(...await trLeft('#prof .badges, #prof .setl'));
  await pg.evaluate(() => { select('goreme'); }); await pg.waitForTimeout(600); left.push(...await trLeft('#detail .acts, #wxbox'));
  await pg.evaluate(() => { toggleMenu(true); }); left.push(...await trLeft('#acctmenu')); await pg.evaluate(() => toggleMenu(false));
  log.push('en çevrilmeyen: ' + JSON.stringify([...new Set(left)]));
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
