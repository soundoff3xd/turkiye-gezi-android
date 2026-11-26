const { chromium } = require('playwright');
const fs = require('fs');
const D = process.argv[4];
(async () => {
  const [file, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const errs = [], log = [], styles = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'tr-TR' });
  const pg = await ctx.newPage(); await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} }); pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('konsol: ' + m.text().slice(0, 200)); });
  await pg.addInitScript(`window.GEZI_CFG={maptilerKey:'TESTKEY'}`);
  await pg.route(/fonts\.|supabase/, r => r.abort());
  await pg.route(/maplibre-gl@4\.7\.1\/dist\/maplibre-gl\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(D + '/ml/dist/maplibre-gl.js') }));
  await pg.route(/maplibre-gl@4\.7\.1\/dist\/maplibre-gl\.css/, r => r.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(D + '/ml/dist/maplibre-gl.css') }));
  await pg.route(/tiles\.openfreemap\.org\/styles\//, r => { styles.push(r.request().url().split('/').pop()); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(D + '/style.json') }); });
  await pg.route(/api\.maptiler\.com\/tiles/, r => r.fulfill({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(D + '/sat.jpg') }));
  await pg.goto('file://' + file); await pg.waitForTimeout(1200);
  await pg.click('[data-a="demo"]'); 
  await pg.waitForFunction(() => window.ML_ON, null, { timeout: 20000 }).catch(() => log.push('ML AÇILMADI'));
  await pg.waitForTimeout(800);
  const align = () => pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('#pins .pin').forEach(b => { const p = byId(b.dataset.v); if (!p) return; const q = ML.map.project([p.lng, p.lat]); out.push(Math.hypot(q.x - parseFloat(b.style.left), q.y - parseFloat(b.style.top))); });
    return out.length ? Math.max(...out).toFixed(2) + 'px (' + out.length + ' iğne)' : 'iğne yok';
  });
  log.push('gerçek harita: ' + await pg.evaluate(() => MAP.classList.contains('ml') && !!document.querySelector('#ml canvas')) + ' | stil: ' + styles.join(',') + ' | zoom: ' + await pg.evaluate(() => ML.map.getZoom().toFixed(2)));
  await pg.screenshot({ path: out + '/ml-1.png' });
  log.push('kümeler: ' + await pg.$$eval('#pins .cl', e => e.length) + ' | tekli iğne: ' + await pg.$$eval('#pins .pin', e => e.length));
  // sürükle
  const before = await pg.evaluate(() => [ML.map.getCenter().lng, V.tx]);
  await pg.mouse.move(500, 400); await pg.mouse.down(); await pg.mouse.move(400, 350, { steps: 8 }); await pg.mouse.up(); await pg.waitForTimeout(500);
  const after = await pg.evaluate(() => [ML.map.getCenter().lng, V.tx]);
  log.push('sürükleme: harita merkezi ' + before[0].toFixed(3) + '→' + after[0].toFixed(3) + ' | V.tx ' + Math.round(before[1]) + '→' + Math.round(after[1]));
  // tekerlek
  const z0 = await pg.evaluate(() => ML.map.getZoom()); await pg.mouse.move(600, 420); await pg.mouse.wheel(0, -400); await pg.waitForTimeout(700);
  log.push('tekerlek: ' + z0.toFixed(2) + '→' + (await pg.evaluate(() => ML.map.getZoom())).toFixed(2));
  await pg.click('[data-a="zin"]'); await pg.waitForTimeout(500); log.push('+ düğmesi: ' + (await pg.evaluate(() => ML.map.getZoom())).toFixed(2));
  await pg.click('[data-a="home"]'); await pg.waitForTimeout(900); log.push('Türkiye\'ye dön: ' + (await pg.evaluate(() => ML.map.getZoom())).toFixed(2));
  // küme tıkla
  const cz = await pg.evaluate(() => ML.map.getZoom());
  await pg.click('#pins .cl'); await pg.waitForTimeout(900);
  log.push('kümeye tıklama: zoom ' + cz.toFixed(2) + '→' + (await pg.evaluate(() => ML.map.getZoom())).toFixed(2) + ' | iğne hizası: ' + await align());
  // yer seç
  await pg.evaluate(() => select('ayasofya')); await pg.waitForTimeout(900);
  log.push('Ayasofya seçildi: zoom ' + (await pg.evaluate(() => ML.map.getZoom())).toFixed(2) + ' | hizalama: ' + await align() + ' | seçili iğne görünür: ' + await pg.evaluate(() => { const e = document.querySelector('#pins .pin.sel'); if (!e) return false; const x = parseFloat(e.style.left), y = parseFloat(e.style.top); return x > 0 && x < MAP.clientWidth && y > 0 && y < MAP.clientHeight; }));
  await pg.screenshot({ path: out + '/ml-2.png' });
  // yer öner → haritada işaretle
  await pg.click('[data-a="back"]'); await pg.click('[data-a="home"]'); await pg.waitForTimeout(900);
  await pg.click('[data-a="sugg"]'); await pg.click('[data-a="spick"]'); await pg.waitForTimeout(200);
  const pt = await pg.evaluate(() => { const rc = MAP.getBoundingClientRect(), ll = ML.map.unproject([700 - rc.left, 450 - rc.top]); return [ll.lat, ll.lng]; });
  await pg.mouse.click(700, 450); await pg.waitForTimeout(300);
  const got = await pg.evaluate(() => S.pickPt && [S.pickPt.lat, S.pickPt.lng, S.pickPt.inTr]);
  log.push('konum işaretleme: beklenen ' + pt.map(v => v.toFixed(4)) + ' | alınan ' + (got ? got.slice(0, 2).map(v => v.toFixed(4)) + ' Türkiye içi: ' + got[2] : 'YOK'));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  // katmanlar
  await pg.click('#layersbtn'); await pg.waitForTimeout(200);
  log.push('uydu seçeneği görünür: ' + await pg.isVisible('#soptsat') + ' | göller satırı gizli: ' + !(await pg.isVisible('#lylakes')));
  await pg.screenshot({ path: out + '/ml-3.png' });
  await pg.click('#soptsat'); await pg.waitForTimeout(1200);
  log.push('uydu: katman ' + await pg.evaluate(() => !!ML.map.getLayer('sat')) + ' | kaynak ' + await pg.evaluate(() => (ML.map.getSource('sat') || {}).tiles) + ' | telif: ' + await pg.textContent('#credit'));
  await pg.screenshot({ path: out + '/ml-sat.png' });
  await pg.click('input[name="mstyle"][value="dark"]', { force: true }); await pg.waitForTimeout(1200);
  log.push('koyu stil: istenen stiller ' + styles.join(',') + ' | uydu katmanı kalktı: ' + await pg.evaluate(() => !ML.map.getLayer('sat')));
  await pg.click('input[name="mstyle"][value="std"]', { force: true }); await pg.waitForTimeout(800);
  await pg.keyboard.press('Escape');
  await pg.selectOption('#lang', 'ar'); await pg.waitForTimeout(600);
  log.push('arapça: yön ' + await pg.evaluate(() => document.documentElement.dir) + ' | hizalama: ' + await align());
  await pg.screenshot({ path: out + '/ml-ar.png' });
  // telefon görünümü
  await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(800);
  await pg.selectOption('#lang', 'tr'); await pg.click('[data-a="home"]'); await pg.waitForTimeout(900);
  log.push('telefon: hizalama ' + await align());
  await pg.screenshot({ path: out + '/ml-tel.png' });
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
