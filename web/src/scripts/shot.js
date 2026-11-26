const { chromium } = require('playwright');
(async () => {
  const f = 'file://' + process.argv[2], out = process.argv[3];
  const b = await chromium.launch();
  const errs = [];
  for (const [name, vp, dark] of [['mobil', { width: 390, height: 844 }, false], ['masaustu', { width: 1280, height: 800 }, true]]) {
    const pg = await b.newPage({ viewport: vp, colorScheme: dark ? 'dark' : 'light' });
    pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(f); await pg.waitForTimeout(600); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(100);
    await pg.screenshot({ path: `${out}/${name}-1.png` });
    await pg.click('[data-a="sort"][data-v="favs"]'); await pg.waitForTimeout(200);
    const first = await pg.$eval('#rows .rn', e => e.textContent);
    await pg.click('[data-a="reg"][data-v="3"]'); await pg.waitForTimeout(700);
    await pg.screenshot({ path: `${out}/${name}-2.png` });
    await pg.click('#rows .row'); await pg.waitForTimeout(700);
    await pg.click('[data-a="tab"][data-v="rev"]');
    await pg.click('[data-a="visit"]');
    await pg.screenshot({ path: `${out}/${name}-3.png` });
    await pg.click('.acts [data-a="compose"]'); await pg.click('[data-a="star"][data-v="4"]');
    await pg.fill('#ctext', 'Deneme yorumu'); await pg.click('#cgo'); await pg.waitForTimeout(300);
    const cnt = await pg.$eval('.sum .count', e => e.textContent);
    const pins = await pg.$$eval('.pin,.cl', e => e.length);
    console.log(name, '| favori sıralamasında ilk:', first, '| yorum sayısı:', cnt, '| pin/küme:', pins);
    await pg.screenshot({ path: `${out}/${name}-4.png` });
  }
  console.log('hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
