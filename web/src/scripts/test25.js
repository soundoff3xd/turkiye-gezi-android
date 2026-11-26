const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(900);
  await pg.evaluate(() => A.pmode('photos')); await pg.waitForTimeout(250);
  const st = await pg.evaluate(() => ({ cls: document.getElementById('ploader').className, vis: getComputedStyle(document.getElementById('ploader')).display }));
  await pg.screenshot({ path: out + '/loader.png', clip: { x: 0, y: 0, width: 600, height: 800 } });
  await pg.waitForTimeout(800);
  const st2 = await pg.evaluate(() => getComputedStyle(document.getElementById('ploader')).display);
  console.log('geçişte:', JSON.stringify(st), '| sonra:', st2, '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
