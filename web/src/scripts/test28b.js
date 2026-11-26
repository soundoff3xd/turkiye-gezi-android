const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(800);
  const rows = await pg.evaluate(() => ({ rows: document.querySelectorAll('#rows .row').length, thumbs: document.querySelectorAll('#rows .rthumb').length }));
  await pg.evaluate(() => select('ayasofya')); await pg.waitForTimeout(300);
  const hero = await pg.evaluate(() => { const f = document.querySelector('#detail .hero'); const im = f && f.querySelector('img'); return f && { src: im ? im.src.slice(0, 110) : '(görsel yüklenemedi, çerçeve kaldı)', cap: f.innerText }; });
  console.log(JSON.stringify({ rows, hero }), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
