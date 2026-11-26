const { chromium } = require('playwright');
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  for (const [name, vp] of [['mobil', { width: 390, height: 844 }], ['masaustu', { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, locale: 'tr-TR', deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(300); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(2300);
    // ölçek doğruluğu: Ayasofya–Anıtkabir arası gerçek mesafe ~350 km
    const chk = await pg.evaluate(() => {
      const a = byId('ayasofya'), b2 = byId('anitkabir');
      const px = Math.hypot(a.x - b2.x, a.y - b2.y) * V.s;
      const R = 6371, r = Math.PI / 180, dl = (b2.lng - a.lng) * r, x = dl * Math.cos((a.lat + b2.lat) / 2 * r), y = (b2.lat - a.lat) * r;
      const km = Math.hypot(x, y) * R;
      const el = document.getElementById('scale'), txt = el.textContent, w = el.getBoundingClientRect().width;
      const scaleKm = parseFloat(txt.replace(/\./g, '').replace(',', '.')) * (txt.includes('km') ? 1 : 0.001);
      return { ölçek: txt, genişlik: Math.round(w), gerçekKm: Math.round(km), ölçekleTahmin: Math.round(px / w * scaleKm) };
    });
    log.push(`${name} | ölçek: ${JSON.stringify(chk)}`);
    await pg.click('#layersbtn'); await pg.waitForTimeout(100);
    log.push(`${name} | panel açık: ${await pg.isVisible('#layerpanel')} | düğme: ${await pg.getAttribute('#layersbtn', 'aria-expanded')}`);
    await pg.click('.sopt:has(input[value="dark"])'); await pg.uncheck('#lyprov'); await pg.waitForTimeout(100);
    log.push(`${name} | koyu: ${await pg.$eval('#mapwrap', e => e.className)} | il sınırı görünür: ${await pg.$eval('.p-prov', e => getComputedStyle(e).display !== 'none')}`);
    await pg.screenshot({ path: `${out}/${name}-katman.png` });
    await pg.mouse.click(vp.width - 200, vp.height / 2 - 150); await pg.waitForTimeout(100);
    log.push(`${name} | dışarı tıklayınca kapandı: ${!(await pg.isVisible('#layerpanel'))}`);
    await pg.click('[data-a="zin"]'); await pg.click('[data-a="zin"]'); const s1 = await pg.evaluate(() => V.s);
    await pg.click('[data-a="home"]'); await pg.waitForTimeout(700); const s2 = await pg.evaluate(() => V.s);
    log.push(`${name} | Türkiye'ye dön: ${s1.toFixed(3)} → ${s2.toFixed(3)}`);
    await pg.reload(); await pg.waitForTimeout(400);
    log.push(`${name} | yenileyince stil hatırlandı: ${await pg.$eval('#mapwrap', e => e.className)}`);
    await pg.evaluate(() => localStorage.removeItem('gezi-mapstyle'));
    await ctx.close();
  }
  console.log(log.join('\n')); console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
