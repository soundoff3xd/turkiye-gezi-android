const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(300);
  console.log(await pg.evaluate(() => { const t = document.querySelector('.p-tr'); return PLACES.filter(p => !t.isPointInFill(new DOMPoint(p.x, p.y))).map(p => p.n + ' (' + p.il + ')'); }));
  await b.close();
})();
