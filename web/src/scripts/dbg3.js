const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(500); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(100);
  await pg.click('[data-a="sugg"]'); await pg.click('[data-a="spick"]'); await pg.waitForTimeout(100);
  console.log(await pg.evaluate(() => ({ top: document.getElementById('top').getBoundingClientRect().bottom, el: document.elementFromPoint(195, 260).outerHTML.slice(0, 90) })));
  await b.close();
})();
