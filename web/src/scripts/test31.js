const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(600);
  // çevrimiçi taklidi: sb.functions.invoke('food') sahte veri döndürsün
  await pg.evaluate(() => {
    window.sb = window.sb || {}; sb = sb || {};
    sb.functions = { invoke: async (n, o) => ({ data: { items: [{ n: 'Karakol Restaurant', k: 'restaurant', c: 'turkish', lat: 41.0093, lng: 28.981, d: 107 }, { n: 'Tantuni Evi', k: 'fast_food', c: 'kebab', lat: 41.01, lng: 28.98, d: 340 }, { n: 'Green Corner', k: 'cafe', c: '', lat: 41.0088, lng: 28.9787, d: 1240 }] }, error: null }) };
    window.ONLINE_ORIG = ONLINE;
  });
  const ok = await pg.evaluate(() => { try { return ONLINE(); } catch (e) { return 'err ' + e.message; } });
  await pg.evaluate(() => { select('mersinkalesi' in {} ? 'x' : (PLACES.find(p => p.il === 'Mersin') || PLACES[0]).id); }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => { const b = document.getElementById('foodbox'); return b ? b.innerText.replace(/\n+/g, ' | ') : null; });
  console.log('online:', ok, '| kutu:', r, '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
