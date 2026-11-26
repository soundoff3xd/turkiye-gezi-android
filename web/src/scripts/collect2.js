const { chromium } = require('playwright');
(async () => {
  const [file, lang] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + file); await pg.waitForTimeout(300); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(100);
  await pg.selectOption('#lang', lang); await pg.waitForTimeout(100);
  const set = new Set();
  const grab = async () => { await pg.waitForTimeout(50); (await pg.evaluate(() => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { if (n.parentElement.closest('script,style,#map')) continue; const t = n.nodeValue.trim(); if (t) out.push(t); }
    document.querySelectorAll('[placeholder],[aria-label],[alt]').forEach(e => { if (!e.closest('#map')) ['placeholder', 'aria-label', 'alt'].forEach(a => e.getAttribute(a) && out.push(e.getAttribute(a))); });
    return out;
  })).forEach(t => set.add(t)); };
  await grab();
  for (const s of ['favs', 'rating', 'reviews']) { await pg.click(`[data-a="sort"][data-v="${s}"]`); await grab(); }
  for (const id of ['ayasofya', 'galatakulesi', 'goreme', 'selimiye', 'midyat']) {
    await pg.evaluate(i => select(i), id); await grab();
    for (const t of ['rev', 'pho']) { await pg.click(`[data-a="tab"][data-v="${t}"]`); await grab(); }
    await pg.click('[data-a="tab"][data-v="rev"]'); const r = await pg.$('[data-a="replies"]'); if (r) { await r.click(); await grab(); }
    await pg.click('[data-a="visit"]'); await pg.click('[data-a="fav"]'); await grab();
    await pg.click('[data-a="back"]');
  }
  await pg.evaluate(() => select('selimiye')); await pg.click('.acts [data-a="compose"]'); await grab(); await pg.click('#cform [data-a="close"]');
  await pg.click('[data-a="back"]'); await pg.click('[data-a="sugg"]'); await pg.fill('#sname', 'www.x.com AAAAAAA'); await pg.click('#sform .go'); await grab();
  await pg.click('[data-a="sclose"]'); await pg.click('[data-a="pend"]'); await grab();
  await pg.click('[data-a="vok"][data-v="g1"]'); await pg.click('[data-a="vbad"][data-v="g2"]'); await grab();
  const nm = new Set(await pg.evaluate(() => PLACES.flatMap(p => [p.n, p.il, p.semt || '']).concat(GEO.labels.map(l => l[0])).concat(S.sugg.map(g => g.n))));
  const bad = [...set].filter(s => /[ğüşıöçĞÜŞİÖÇ]|\b(ve|bir|için|yer|gün|önce)\b/.test(s) && !nm.has(s) && !s.split(/ · |, /).every(x => nm.has(x.trim())));
  console.log('hatalar:', errs.length ? errs : 'yok', '| metin sayısı:', set.size);
  const b2 = bad.filter(s => !s.includes(' · ')); console.log(b2.length + ' şüpheli; ' + b2.join(' // '));
  await b.close();
})();
