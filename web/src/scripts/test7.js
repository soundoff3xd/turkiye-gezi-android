const { chromium } = require('playwright');
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  for (const [name, vp] of [['mobil', { width: 390, height: 844 }], ['masaustu', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'tr-TR', deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(300);
    await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(150);
    await pg.click('#segmount [data-v="photos"]'); await pg.waitForTimeout(200);
    log.push(`${name} | vitrin açık: ${await pg.isVisible('#photov')} | kart: ${await pg.$$eval('#photos .pcard', e => e.length)} | madalya: ${await pg.$$eval('#photos .rankb', e => e.length)}`);
    await pg.screenshot({ path: `${out}/${name}-vitrin.png` });
    const before = await pg.$eval('#photos .pcard .plike span', e => e.textContent);
    await pg.click('#photos .pcard .plike'); await pg.waitForTimeout(100);
    const after = await pg.$eval('#photos .pcard .plike span', e => e.textContent);
    log.push(`${name} | ilk fotoğraf beğeni: ${before} → ${after} | basılı: ${await pg.$eval('#photos .pcard .plike', e => e.getAttribute('aria-pressed'))}`);
    await pg.click('[data-a="psort"][data-v="new"]'); await pg.waitForTimeout(100);
    log.push(`${name} | en yeni sıralamada ilk: ${await pg.$eval('#photos .plink', e => e.textContent)}`);
    await pg.click('#photos .pimg'); await pg.waitForTimeout(150);
    log.push(`${name} | görüntüleyici açık: ${await pg.$eval('#lightbox', d => d.open)}`);
    await pg.screenshot({ path: `${out}/${name}-lightbox.png` });
    await pg.click('#lightbox [data-a="pgo"]'); await pg.waitForTimeout(400);
    await pg.click('[data-a="tab"][data-v="pho"]'); await pg.waitForTimeout(100);
    log.push(`${name} | yer kartı foto sekmesi: ${await pg.$eval('#detail .tab[data-v="pho"]', e => e.textContent)} | galeri: ${await pg.$$eval('#detail .pgrid .pcard', e => e.length)}`);
    await pg.click('.acts [data-a="compose"]'); await pg.click('[data-a="star"][data-v="5"]');
    await pg.setInputFiles('#cfile', { name: 'k.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
    await pg.click('#cgo'); await pg.waitForTimeout(200);
    await pg.click('[data-a="back"]'); await pg.click('#segmount [data-v="photos"]'); await pg.click('[data-a="psort"][data-v="new"]'); await pg.waitForTimeout(100);
    log.push(`${name} | yüklenen foto vitrinde ilk: ${await pg.$eval('#photos .pc2', e => e.textContent)} | gerçek görsel: ${await pg.$$eval('#photos .pimg img', e => e.length)}`);
    await pg.click('#acct'); await pg.click('[data-a="mlogout"]'); await pg.waitForTimeout(100);
    await pg.click('[data-a="demo"]'); await pg.waitForTimeout(150);
    log.push(`${name} | tekrar girişte beğeni hatırlandı: ${await pg.evaluate(() => S.plikes.size)}`);
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
