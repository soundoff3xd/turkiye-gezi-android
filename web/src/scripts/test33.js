const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(600);
  const r = await pg.evaluate(async () => {
    let rows = [{ val: 2, user_id: 'a' }, { val: 2, user_id: 'b' }, { val: 1, user_id: 'c' }];
    const q = { select: () => q, eq: () => q, limit: async () => ({ data: rows }), delete: () => q, upsert: async (o) => { rows = rows.filter(x => x.user_id !== o.user_id).concat([{ val: o.val, user_id: o.user_id }]); return { error: null }; } };
    sb = Object.assign(sb || {}, { from: () => q, functions: { invoke: async () => ({ data: { items: [] }, error: null }) } });
    ME = { id: 'me' }; window.__on = ONLINE();
    const p = PLACES.find(x => x.c === 'muze'); select(p.id); await new Promise(r => setTimeout(r, 400));
    const t1 = document.getElementById('detail').innerText;
    A.accv('0'); await new Promise(r => setTimeout(r, 300));
    return { on: window.__on, muze: t1.includes('Müzekart'), acc: (document.getElementById('accbox') || {}).innerText };
  });
  console.log(JSON.stringify(r), '| hatalar:', errs.length ? errs : 'yok');
  await pg.screenshot({ path: out });
  await b.close();
})();
