const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [n, vp] of [['ar-mobil', { width: 390, height: 844 }], ['ar-masaustu', { width: 1280, height: 800 }]]) {
    const pg = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(300);
    await pg.selectOption('#lang2', 'ar'); await pg.waitForTimeout(150);
    if (n === 'ar-mobil') await pg.screenshot({ path: process.argv[3] + '/ar-gate.png' });
    await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(150);
    await pg.evaluate(() => select('goreme')); await pg.waitForTimeout(700);
    await pg.screenshot({ path: process.argv[3] + '/' + n + '.png' });
    const ow = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(n, 'yatay taşma:', ow);
  }
  await b.close();
})();
