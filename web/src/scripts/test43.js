const { chromium } = require('playwright');
const [file, outdir, lang] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(l => { try { localStorage.setItem('gezi-onboarded', '1'); localStorage.setItem('gezi-lang', JSON.stringify(l)); } catch (_) {} }, lang);
  await pg.goto('file://' + file); await pg.waitForTimeout(500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); });
  await pg.evaluate(l => setLang(l), lang); await pg.waitForTimeout(200);
  const out = {};
  for (const a of ['mcolls', 'mquiz', 'mtrails', 'mpack']) {
    await pg.evaluate(a => { A.mplan(); A[a](); }, a); await pg.waitForTimeout(300);
    out[a] = await pg.evaluate(() => document.getElementById('xbody').innerText.replace(/\n+/g, ' | ').slice(0, 420));
    await pg.screenshot({ path: `${outdir}/${lang}-${a}.png` });
  }
  await pg.evaluate(() => { A.mplan(); A.mtrails(); A.trailopen('kackar'); }); await pg.waitForTimeout(300);
  out.trail = await pg.evaluate(() => document.getElementById('xbody').innerText.replace(/\n+/g, ' | ').slice(0, 500));
  await pg.evaluate(() => { hideX(); select('oludeniz'); S.tab = 'ov'; renderDetail(); }); await pg.waitForTimeout(300);
  out.ps = await pg.evaluate(() => (document.getElementById('psbox') || {}).innerText);
  console.log(JSON.stringify(out, null, 1), errs);
  await b.close();
})();
