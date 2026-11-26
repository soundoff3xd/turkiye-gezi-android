const { chromium } = require('playwright');
const [file] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  const res = await pg.evaluate(async () => {
    const J = { id: '11111111-2222-3333-4444-555555555555', title: 'Kapadokya, Ekim', started_on: '2026-10-02', shared: true, user_id: 'u1' };
    const E = [{ id: 'e1', place_id: PLACES[0].id, day: '2026-10-02', note: 'Balonları izledik <b>x</b>', photo_path: null }, { id: 'e2', place_id: null, day: '2026-10-03', note: 'Testi kebabı', photo_path: null }];
    const q = (data) => { const o = { select: () => o, eq: () => o, order: () => o, maybeSingle: async () => ({ data }), then: (r) => r({ data: E, error: null }) }; return o; };
    sb = { from: t => t === 'journals' ? q(J) : q(E), storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } };
    ME = { id: 'other' };
    showX('journal', J.id); await loadJournal(J.id);
    const ro = document.getElementById('xbody').innerText.replace(/\n+/g, ' | ');
    const roForm = !!document.querySelector('form[data-f="jadd"]');
    ME = { id: 'u1' }; renderX();
    const own = !!document.querySelector('form[data-f="jadd"]') && !!document.querySelector('[data-a="jshared"]');
    const xss = !document.querySelector('#xbody b b');
    return { ro, roForm, own, xss };
  });
  console.log(JSON.stringify(res), '| hatalar:', errs.length ? errs : 'yok');
  await pg.screenshot({ path: process.argv[3] || '/tmp/j.png' });
  await b.close();
})();
