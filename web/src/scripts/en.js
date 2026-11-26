const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(300);
  await pg.selectOption('#lang', 'en'); await pg.waitForTimeout(200);
  await pg.screenshot({ path: process.argv[3] + '/en-1.png' });
  await pg.evaluate(() => select('ayasofya')); await pg.waitForTimeout(700);
  await pg.screenshot({ path: process.argv[3] + '/en-2.png' }); await b.close();
})();
