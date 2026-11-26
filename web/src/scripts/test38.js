const { chromium } = require('playwright');
const [file] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => {
    const J = { id: '11111111-2222-3333-4444-555555555555', title: 'Kapadokya', started_on: '2026-10-02', shared: false, user_id: 'me' };
    const X = [{ id: 'x1', day: '2026-10-02', cat: 'food', amount: '350.5', currency: 'TRY', note: 'Testi kebabı' }, { id: 'x2', day: '2026-10-02', cat: 'stay', amount: '80', currency: 'EUR', note: '' }];
    const mk = (one, many) => { const q = { select: () => q, eq: () => q, order: () => q, maybeSingle: async () => ({ data: one }), then: r => r({ data: many }) }; return q; };
    sb = { from: t => t === 'journals' ? mk(J, [J]) : t === 'journal_expenses' ? mk(null, X) : mk(null, []), storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } };
    ME = { id: 'me' };
    showX('journal', J.id); await loadJournal(J.id); await new Promise(r => setTimeout(r, 300));
    return (document.getElementById('expbox') || {}).innerText;
  });
  console.log(JSON.stringify(r), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
