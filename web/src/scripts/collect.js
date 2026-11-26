const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(300);
  const set = new Set();
  const grab = async () => (await pg.evaluate(() => {
    const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { if (n.parentElement.closest('script,style,#map,#rows,#labels')) continue; const t = n.nodeValue.trim(); if (t) out.push(t); }
    document.querySelectorAll('[placeholder],[aria-label]').forEach(e => { if (!e.closest('#map')) ['placeholder', 'aria-label'].forEach(a => e.getAttribute(a) && out.push(e.getAttribute(a))); });
    document.querySelectorAll('#rows li:first-child *').forEach(e => [...e.childNodes].forEach(c => c.nodeType === 3 && c.nodeValue.trim() && out.push(c.nodeValue.trim())));
    return out;
  })).forEach(t => set.add(t.replace(/\d[\d.,]*/g, '{n}')));
  await grab();
  for (const id of ['ayasofya', 'galatakulesi']) {
    await pg.evaluate(i => select(i), id); await pg.waitForTimeout(100); await grab();
    for (const t of ['rev', 'pho']) { await pg.click(`[data-a="tab"][data-v="${t}"]`); await grab(); }
    await pg.click('[data-a="tab"][data-v="rev"]'); await pg.click('[data-a="replies"]'); await grab();
    await pg.click('[data-a="back"]');
  }
  await pg.evaluate(() => select('selimiye')); await pg.click('[data-a="tab"][data-v="rev"]'); await grab(); await pg.click('[data-a="tab"][data-v="pho"]'); await grab();
  await pg.click('.acts [data-a="compose"]'); await grab(); await pg.click('#cform [data-a="close"]');
  await pg.click('[data-a="back"]'); await pg.click('[data-a="sugg"]'); await pg.fill('#sname', 'x'); await pg.click('#sform .go'); await grab();
  await pg.click('[data-a="sclose"]'); await pg.click('[data-a="pend"]'); await grab();
  console.log(JSON.stringify([...set], null, 0));
  await b.close();
})();
