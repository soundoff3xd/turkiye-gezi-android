const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 420, height: 860 }, locale: 'de-DE' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); localStorage.setItem('gezi-lang', 'de'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(500);
  await pg.evaluate(() => { showX('phrases'); }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => ({ lang: window.LANG, first: [...document.querySelectorAll('.phr')].slice(0, 3).map(x => x.innerText.replace(/\n/g, ' / ')), h: document.querySelector('#xbody h1').innerText, sec: document.querySelector('#xbody h2').innerText }));
  await pg.screenshot({ path: out });
  await pg.evaluate(() => { showX('routes'); }); await pg.waitForTimeout(300);
  r.route = await pg.evaluate(() => document.querySelector('.route').innerText);
  console.log(JSON.stringify(r, null, 1), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
