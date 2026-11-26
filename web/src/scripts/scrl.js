const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(300);
  await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(2500);
  await pg.click('[data-a="cat"][data-v="kultur"]'); await pg.click('[data-a="sub"][data-v="muze"]');
  await pg.$eval('#listv', e => e.scrollTop = 330); await pg.waitForTimeout(100);
  await pg.screenshot({ path: process.argv[3] + '/kategori-3.png' });
  console.log(await pg.$eval('#listv', e => e.scrollHeight + '/' + e.clientHeight));
  await b.close();
})();
