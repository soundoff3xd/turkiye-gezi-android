const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 420, height: 860 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => {
    try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {}
  });
  await pg.goto('file://' + file + '?gunluk=11111111-2222-3333-4444-555555555555');
  await pg.evaluate(() => {
    const J = { id: '11111111-2222-3333-4444-555555555555', title: 'Kapadokya, Ekim', started_on: '2026-10-02', shared: true, user_id: 'u1' };
    const E = [{ id: 'e1', place_id: PLACES.find(p => p.il === 'Nevşehir').id, day: '2026-10-02', note: 'Sabah balonları izledik, öğlen testi kebabı.', photo_path: null }, { id: 'e2', place_id: null, day: '2026-10-03', note: 'Avanos’ta çömlek yaptık.', photo_path: null }];
    const q = (data) => { const o = { select: () => o, eq: () => o, order: () => o, maybeSingle: async () => ({ data }), then: (r) => r({ data: E, error: null }) }; return o; };
    window.__sb = { from: t => t === 'journals' ? q(J) : q(E), storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } };
    sb = window.__sb;
  });
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(() => { const d = document.getElementById('jpubdlg'); return { open: !!(d && d.open), auth: document.getElementById('auth').open, txt: d ? d.innerText.replace(/\n+/g, ' | ') : null }; });
  console.log(JSON.stringify(r), '| hatalar:', errs.length ? errs : 'yok');
  await pg.screenshot({ path: out });
  await pg.evaluate(() => A.jpclose()); await pg.waitForTimeout(300);
  console.log('after close auth open:', await pg.evaluate(() => document.getElementById('auth').open));
  await b.close();
})();
