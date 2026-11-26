const { chromium } = require('playwright');
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  // masaüstü (fare): satırlar alta geçmeli, taşma olmamalı
  let ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'tr-TR', deviceScaleFactor: 1 });
  let pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + file); await pg.waitForTimeout(300); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(2300);
  const ov = () => pg.evaluate(() => [...document.querySelectorAll('#listv .chips, #top .chips, #cats, #subs')].filter(e => !e.hidden).map(e => e.id + ':' + (e.scrollWidth > e.clientWidth + 1 ? 'TAŞIYOR' : 'ok')).join(' '));
  log.push('masaüstü taşma: ' + await ov());
  await pg.click('[data-a="cat"][data-v="kultur"]'); await pg.waitForTimeout(150);
  log.push('masaüstü kültür seçince: ' + await ov() + ' | seçili kutucuk: ' + await pg.$eval('.gt[aria-pressed="true"] .gl', e => e.textContent));
  await pg.click('[data-a="sub"][data-v="muze"]'); await pg.waitForTimeout(150);
  log.push('müze sayısı: ' + await pg.textContent('#count'));
  await pg.screenshot({ path: out + '/kat-masaustu.png' });
  await ctx.close();
  // dokunmatik telefon: yatay kaydırma sürer; fare tekerleği ve sürükleme de çalışmalı
  ctx = await b.newContext({ viewport: { width: 600, height: 844 }, locale: 'tr-TR', deviceScaleFactor: 1 });
  pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/fonts\./, r => r.abort());
  await pg.goto('file://' + file); await pg.waitForTimeout(300); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(2300);
  const box = await pg.$eval('#regions', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await pg.mouse.move(box[0], box[1]); await pg.mouse.wheel(0, 300); await pg.waitForTimeout(150);
  log.push('telefon: tekerlekle bölge satırı kaydı: ' + await pg.$eval('#regions', e => e.scrollLeft));
  await pg.$eval('#regions', e => e.scrollLeft = 0);
  const reg0 = await pg.evaluate(() => S.reg);
  await pg.mouse.move(box[0] + 100, box[1]); await pg.mouse.down(); await pg.mouse.move(box[0] - 60, box[1], { steps: 8 }); await pg.mouse.up(); await pg.waitForTimeout(150);
  log.push('telefon: sürükleyince kaydı: ' + await pg.$eval('#regions', e => e.scrollLeft) + ' | sürükleme yanlışlıkla bölge seçmedi: ' + (await pg.evaluate(() => S.reg) === reg0));
  await pg.click('[data-a="cat"][data-v="doga"]'); await pg.waitForTimeout(150);
  await pg.$eval('#listv', e => e.scrollTop = 250); await pg.waitForTimeout(100);
  await pg.screenshot({ path: out + '/kat-mobil.png' });
  await ctx.close();
  console.log(log.join('\n')); console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
