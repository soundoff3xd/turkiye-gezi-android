const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); localStorage.setItem('gezi-lang', '"de"'); } catch (_) {} });
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(200);
  await pg.evaluate(() => { if (window.setLang) setLang('de'); });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { MEPOS = { lat: 41, lng: 29, acc: 10 }; A.memerg(); });
  await pg.waitForTimeout(400);
  const t1 = await pg.evaluate(() => document.getElementById('xbody').innerText.slice(0, 200));
  await pg.evaluate(() => { HOURS = new Map([[PLACES.find(p => p.c === 'muze').id, 'Mo-Su 09:00-17:00']]); hideX(); select(PLACES.find(p => p.c === 'muze').id); S.tab = 'ov'; renderDetail(); });
  await pg.waitForTimeout(300);
  const t2 = await pg.evaluate(() => (document.querySelector('.hoursbox') || {}).innerText);
  console.log(window = { lang: await pg.evaluate(() => window.LANG), t1, t2 }, errs);
  await b.close();
})();
