const { chromium } = require('playwright');
(async () => {
  const [file, out, img] = process.argv.slice(2);
  const b = await chromium.launch(); const errs = [], log = [];
  for (const [w, h, scheme, lang] of [[390, 844, 'light', 'tr'], [1280, 800, 'dark', 'ar']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/fonts\.|jsdelivr|supabase/, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(800);
    await pg.click('[data-a="demo"]'); await pg.waitForTimeout(300);
    if (lang !== 'tr') { await pg.selectOption('#lang', lang); await pg.waitForTimeout(200); }
    await pg.click('#acct'); await pg.click('[data-a="mprofile"]'); await pg.waitForTimeout(200);
    await pg.setInputFiles('#avfile', img); await pg.waitForTimeout(700);
    log.push(`${w}px ${lang}: profil resmi ${!!(await pg.$('#prof .bigav img'))} | düğme ${!!(await pg.$('#acct img'))} | bildirim "${await pg.textContent('#toast')}" | etiketler: ${(await pg.$$eval('.avacts .lnk', e => e.map(x => x.textContent))).join(' / ')}`);
    await pg.screenshot({ path: `${out}/av-${w}.png` });
    await pg.reload(); await pg.waitForTimeout(800);
    log.push(`  yenileyince kaldı: ${!!(await pg.$('#acct img'))} | boyut: ${await pg.evaluate(() => Math.round(JSON.stringify(localStorage).length / 1024))} KB`);
    // yorum yap ve avatarın kartta çıktığını gör
    await pg.evaluate(() => select('ayasofya')); await pg.waitForTimeout(300);
    await pg.click('.acts [data-a="compose"]'); await pg.click('[data-a="star"][data-v="4"]'); await pg.fill('#ctext', 'Muhteşem'); await pg.click('#cgo'); await pg.waitForTimeout(300);
    log.push(`  yorumda avatar: ${!!(await pg.$('#detail .card .av.img img'))}`);
    await pg.click('#detail .card [data-a="replies"]'); await pg.fill('#detail .rf input', 'Katılıyorum'); await pg.click('#detail [data-a="send"]'); await pg.waitForTimeout(200);
    log.push(`  yanıtta avatar: ${!!(await pg.$('#detail .rep .av.img img'))}`);
    await pg.screenshot({ path: `${out}/av-yorum-${w}.png` });
    // kaldır
    await pg.click('#acct'); await pg.click('[data-a="mprofile"]'); await pg.click('[data-a="avdel"]'); await pg.waitForTimeout(300);
    log.push(`  kaldırınca: ${!(await pg.$('#acct img'))}`);
    // yanlış dosya
    await pg.setInputFiles('#avfile', { name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') }); await pg.waitForTimeout(300);
    log.push(`  GIF reddi: "${await pg.textContent('#toast')}"`);
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
