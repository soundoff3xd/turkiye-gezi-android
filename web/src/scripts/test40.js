const { chromium } = require('playwright');
const [file, outdir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  const ids = 'anitkabir~ayasofya';
  await pg.goto('file://' + file + '?rota=' + ids + '&m=a&k=t'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(200);
  await pg.evaluate(() => {
    const geom = { type: 'LineString', coordinates: [[28.97, 41.01], [29.5, 40.8], [30.4, 40.75], [32.85, 39.93]] };
    sb = { functions: { invoke: async (fn, { body }) => fn === 'route' ? { data: { geometry: geom, distance: 450000, duration: 16000, steps: [{ i: 'Düz git', d: 1000, t: 60, w: 0, e: 1, y: 6, k: 0 }], legs: body.coordinates.slice(1).map(() => ({ d: 150000, t: 5000 })), lang: 'tr' } } : fn === 'along' ? { data: { items: [{ k: 'fuel', n: 'Shell', lat: 40.95, lng: 29.1 }, { k: 'rest', n: 'Bolu Dağı Tesisleri', lat: 40.75, lng: 30.4 }] } } : { data: null } },
      rpc: async () => ({ data: null }), from: () => { const q = { select: () => q, eq: () => q, not: () => q, range: async () => ({ data: [] }), maybeSingle: async () => ({ data: null }), then: r => r({ data: [] }) }; return q; } };
    window.fetch = async () => { throw new Error('offline'); };
    MEPOS = { lat: 41.0, lng: 28.9, acc: 20 };
  });
  await pg.waitForTimeout(1500);
  await pg.evaluate(async () => { await tripRoute('driving-car'); });
  const r = await pg.evaluate(() => ({ kind: XV && XV.kind, arg: XV && XV.arg, avoid: AVOID, route: !!(TROUTE && TROUTE.data) }));
  await pg.evaluate(async () => { await A.tralong('rest'); });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: outdir + '/trip.png', fullPage: false });
  await pg.evaluate(() => { const el = document.querySelector('.alongbox'); el && el.scrollIntoView(); });
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: outdir + '/trip2.png' });
  // nav + mola
  const n = await pg.evaluate(async () => {
    await navStart(['anitkabir'], 'driving-car');
    await navLoad(MEPOS, 0);
    NAV.drive0 = Date.now() - 2.1 * 3600e3; NAV.lastMove = null;
    navFix({ latitude: 41.0, longitude: 28.9, accuracy: 10 });
    const asked = !document.getElementById('nbreak').hidden;
    await A.nbreakfind();
    const items = document.querySelectorAll('#nbreak .nbr').length;
    A.nbreakadd('0');
    return { asked, items, stops: NAV.stops.map(s => s.n) };
  });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: outdir + '/nav.png' });
  await pg.evaluate(() => { A.navend(); A.memerg(); });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: outdir + '/emerg.png' });
  console.log(JSON.stringify({ r, n }), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
