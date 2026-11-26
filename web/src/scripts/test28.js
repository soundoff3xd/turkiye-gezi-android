const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const errs = [];
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8765/'); await pg.waitForTimeout(2500);
  const reg = await pg.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.installing || r.waiting)); });
  await pg.reload(); await pg.waitForTimeout(1500);
  await ctx.setOffline(true);
  await pg.reload(); await pg.waitForTimeout(2000);
  const off = await pg.evaluate(() => ({ title: document.title, places: typeof PLACES !== 'undefined' ? PLACES.length : 0, bar: !document.getElementById('offbar').hidden }));
  console.log('sw:', reg, '| çevrimdışı yükleme:', JSON.stringify(off), '| hatalar:', errs.slice(0, 3));
  await b.close();
})();
