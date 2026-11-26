const { chromium } = require('playwright');
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  for (const [name, vp] of [['mobil', { width: 390, height: 844 }], ['masaustu', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'tr-TR' });
    const pg = await ctx.newPage(); await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
    pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(400);
    const gateOpen = () => pg.evaluate(() => document.getElementById('auth').open && document.getElementById('auth').classList.contains('gate'));
    log.push(`${name} | açılışta hesap ekranı: ${await gateOpen()}`);
    await pg.screenshot({ path: `${out}/${name}-gate.png` });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
    log.push(`${name} | iki kez Escape sonrası hâlâ açık: ${await gateOpen()}`);
    await pg.mouse.click(5, 5); await pg.waitForTimeout(100);
    log.push(`${name} | dışarı tıklayınca hâlâ açık: ${await gateOpen()} | seçili yer: ${await pg.evaluate(() => S.sel)}`);
    await pg.fill('#aname', 'Ayşe'); await pg.fill('#aemail', `ayse${name}@ornek.com`); await pg.fill('#apass', 'gizli-sifre-2'); await pg.click('#ago'); await pg.waitForTimeout(300);
    log.push(`${name} | üye olunca ekran kapandı: ${!(await pg.evaluate(() => document.getElementById('auth').open))} | kullanıcı: ${await pg.evaluate(() => CUR && CUR.name)}`);
    await pg.reload(); await pg.waitForTimeout(400);
    log.push(`${name} | yenileyince ekran yok: ${!(await gateOpen())}`);
    await pg.click('#acct'); await pg.click('[data-a="mlogout"]'); await pg.waitForTimeout(200);
    log.push(`${name} | çıkışta ekran geri geldi: ${await gateOpen()}`);
    await pg.click('[data-a="amode"][data-v="in"]'); await pg.fill('#aemail', `ayse${name}@ornek.com`); await pg.fill('#apass', 'gizli-sifre-2'); await pg.click('#ago'); await pg.waitForTimeout(200);
    log.push(`${name} | giriş yapınca kapandı: ${!(await pg.evaluate(() => document.getElementById('auth').open))}`);
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
