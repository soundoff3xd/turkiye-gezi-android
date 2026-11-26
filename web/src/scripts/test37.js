const { chromium } = require('playwright');
const [file, o1, o2, o3] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 900 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => {
    const out = {};
    out.menu = [...document.querySelectorAll('#acctmenu .amgroup, #acctmenu [role=menuitem]')].map(x => (x.className === 'amgroup' ? '#' : '') + x.innerText.trim()).join(' | ');
    showX('plan'); out.plan = document.querySelectorAll('.planit').length;
    A.mfest(); out.fest = document.querySelectorAll('.fest').length; A.festm('12'); out.dec = [...document.querySelectorAll('.fest b')].map(x => x.innerText);
    showX('help'); out.faq = document.querySelectorAll('.faq').length;
    showX('city', 'Nevşehir'); out.city = /Kapadokya Havalimanı/.test(document.getElementById('xbody').innerText) && /Hacı Bektaş/.test(document.getElementById('xbody').innerText);
    // Q&A sekmesi (sahte veri)
    ME = { id: 'me' };
    const Q = [{ id: 'q1', user_id: 'u2', body: 'Otopark var mı?', created_at: new Date().toISOString(), hidden: false, profiles: { name: 'Ali' }, place_answers: [{ id: 'a1', user_id: 'me', body: 'Evet, ücretli.', created_at: new Date().toISOString(), hidden: false, profiles: { name: 'Ben' } }] }];
    const mk = d => { const q = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: d }), then: r => r({ data: d }) }; return q; };
    sb = Object.assign(sb || {}, { from: t => t === 'place_questions' ? mk(Q) : mk([]), functions: { invoke: async () => ({ data: { items: [], by: {} } }) } });
    hideX(); select('goreme'); A.tab('qa'); await new Promise(r => setTimeout(r, 300));
    out.qa = document.getElementById('detail').innerText.split('\n').filter(x => /Otopark|Evet|Sorular|Sor$/.test(x)).join(' | ');
    out.tabs = [...document.querySelectorAll('#detail .tab')].map(x => x.innerText + (x.getAttribute('aria-selected') === 'true' ? '*' : '')).join(',');
    return out;
  });
  console.log(JSON.stringify(r, null, 1), '| hatalar:', errs.length ? errs : 'yok');
  await pg.screenshot({ path: o1 });
  await pg.evaluate(() => { showX('plan'); }); await pg.waitForTimeout(200); await pg.screenshot({ path: o2 });
  await pg.evaluate(() => { toggleMenu(true); }); await pg.waitForTimeout(200); await pg.screenshot({ path: o3 });
  await b.close();
})();
