const { chromium } = require('playwright');
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  for (const [name, vp] of [['mobil', { width: 390, height: 844 }], ['masaustu', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'tr-TR', deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} }); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(300); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(2300);
    await pg.click('#acct'); await pg.waitForTimeout(100);
    log.push(`${name} | menü: ${await pg.isVisible('#acctmenu')} | öğeler: ${await pg.$$eval('#acctmenu [role=menuitem]', e => e.map(x => x.textContent.trim()).join(', '))} | odak: ${await pg.evaluate(() => document.activeElement.textContent.trim())}`);
    await pg.keyboard.press('ArrowDown'); log.push(`${name} | ok tuşu sonrası odak: ${await pg.evaluate(() => document.activeElement.textContent.trim())}`);
    await pg.screenshot({ path: `${out}/${name}-menu.png` });
    await pg.keyboard.press('Escape'); log.push(`${name} | Escape ile kapandı: ${!(await pg.isVisible('#acctmenu'))}`);
    await pg.click('#acct'); await pg.click('[data-a="mprofile"]'); await pg.waitForTimeout(100);
    log.push(`${name} | hesap ayarları → profil açık: ${await pg.isVisible('#profv')}`);
    await pg.click('#acct'); await pg.click('[data-a="msupport"]'); await pg.waitForTimeout(100);
    log.push(`${name} | destek penceresi: ${await pg.$eval('#support', d => d.open)} | düğme: ${await pg.textContent('#supgo')}`);
    await pg.click('[data-a="supamt"][data-v="250"]'); await pg.click('[data-a="supfreq"][data-v="monthly"]');
    log.push(`${name} | 250 seçince: ${await pg.textContent('#supgo')} | aylık seçili: ${await pg.getAttribute('[data-a="supfreq"][data-v="monthly"]', 'aria-selected')}`);
    await pg.click('[data-a="supamt"][data-v="custom"]'); await pg.fill('#supcustom', '75abc');
    log.push(`${name} | özel tutar: ${await pg.inputValue('#supcustom')} → ${await pg.textContent('#supgo')}`);
    await pg.click('#supgo');
    log.push(`${name} | bağlantı yokken kurulum notu: ${await pg.isVisible('#supsetup')}`);
    await pg.screenshot({ path: `${out}/${name}-destek.png` });
    await pg.evaluate(() => { SUPPORT.url = 'https://example.org/bagis?tutar={amount}'; renderSupport(); });
    const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), pg.click('#supgo')]);
    log.push(`${name} | açılan sayfa: ${popup ? popup.url() : 'yok'}`);
    if (popup) await popup.close();
    await pg.click('[data-a="supclose"]');
    await pg.click('#acct'); await pg.click('[data-a="mlogout"]'); await pg.waitForTimeout(150);
    log.push(`${name} | menüden çıkış → hesap ekranı: ${await pg.evaluate(() => document.getElementById('auth').open)}`);
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
