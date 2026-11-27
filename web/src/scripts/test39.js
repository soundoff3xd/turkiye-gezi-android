const { chromium } = require('playwright');
const [file] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(500);
  const out = await pg.evaluate(async () => {
    const R = {};
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // sahte Supabase
    const geom = { type: 'LineString', coordinates: [[28.97, 41.01], [29.5, 40.8], [30.4, 40.75], [32.85, 39.93]] };
    sb = {
      functions: { invoke: async (fn, { body }) => fn === 'route' ? { data: { geometry: geom, distance: 450000, duration: 16000, steps: [{ i: 'Düz git', d: 1000, t: 60, w: 0, e: 1, y: 6, k: 0 }], legs: body.coordinates.slice(1).map(() => ({ d: 150000, t: 5000 })), lang: 'tr', avoid: body.avoid || [] } }
        : fn === 'fx' ? { data: { date: '27.11.2026', rates: { EUR: 55.6, USD: 50.7, GBP: 66.6 } } }
        : fn === 'along' ? { data: { items: [{ k: 'fuel', n: 'Shell', lat: 40.8, lng: 29.5 }, { k: 'rest', n: 'Dinlenme', lat: 40.75, lng: 30.4 }] } } : { data: null } },
      from: t => { const q = { select: () => q, eq: () => q, not: () => q, order: () => q, range: async () => ({ data: t === 'place_hours' ? [{ place_id: PLACES.find(p => p.c === 'muze').id, oh: 'Mo-Su 00:00-24:00' }] : [] }), maybeSingle: async () => ({ data: t === 'app_settings' ? { value: JSON.stringify({ updated: '2026-11', items: [['🥯', 'Simit (İstanbul)', '30 TL', 'Eylül 2026']], tips: ['Fiyat listesi olmayan yerde önce fiyatı sor.'] }) } : null }), then: r => r({ data: [] }) }; return q; },
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    };
    window.fetch = async () => { throw new Error('offline'); }; // Overpass yok -> sunucu yedeği
    MEPOS = { lat: 41.0, lng: 28.9, acc: 20 };
    // plan menüsü
    showX('plan'); R.plan = ['Döviz çevirici', 'Fiyat rehberi', 'Acil durum'].every(x => document.getElementById('xbody').innerText.includes(x));
    // acil durum
    A.memerg(); await sleep(300); R.emerg = document.getElementById('xbody').innerText.slice(0, 160).replace(/\n/g, ' | ');
    // döviz
    A.mfx(); await sleep(200); R.fx = (document.getElementById('fxres') || {}).textContent;
    // fiyat
    A.mprices(); await sleep(200); R.prices = document.getElementById('xbody').innerText.includes('30 TL');
    // açılış saatleri + cami
    await loadHours(); hideX(); const mz = PLACES.find(p => p.c === 'muze'), cm = PLACES.find(p => p.c === 'cami');
    select(mz.id); S.tab = 'ov'; renderDetail(); R.hours = (document.querySelector('.hoursbox') || {}).innerText;
    select(cm.id); S.tab = 'ov'; renderDetail(); R.mosque = ((document.querySelector('.hoursbox') || {}).innerText || '').slice(0, 120);
    back && back();
    S.open = true; renderList(); R.openCount = PLACES.filter(p => matchPlace(p, '', false)).length + ' ' + isOpenNow(mz.id); S.open = false; renderList();
    // gezi rotası
    TRIP = PLACES.filter(p => p.il === 'Ankara').slice(0, 2).map(p => p.id); tripSave();
    showX('trip'); await tripRoute('driving-car'); await sleep(100);
    const xb = () => document.getElementById('xbody').innerText;
    R.trip = { avoid: xb().includes('Paralı yol yok'), arrive: xb().includes('Varış'), share: xb().includes('Rotayı paylaş'), along: xb().includes('Yol üstü mola') };
    A.travoid('tollways'); await sleep(500); R.avoidSent = AVOID.slice();
    await A.tralong('fuel'); await sleep(300); R.alongItems = (xb().match(/Shell/g) || []).length;
    A.tstay(TRIP[0]); R.stay = xb().includes('15 dk');
    AVOID = []; ls.set('gezi-avoid', []);
    // şehir planı + hava
    WX[`41.01,28.97`] = null;
    REC.subs = ['muze']; showX('city', 'İstanbul'); A.rstart('1'); await sleep(200); R.city = xb().toLowerCase().includes('ne zaman') + ' ' + xb().includes('Yükleniyor');
    return R;
  });
  console.log(JSON.stringify(out, null, 1), '\n| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
