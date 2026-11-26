const { chromium } = require('playwright');
(async () => {
  const [f, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(), errs = [];
  for (const [name, vp] of [['mobil', { width: 390, height: 844 }], ['masaustu', { width: 1280, height: 800 }]]) {
    const pg = await b.newPage({ viewport: vp });
    pg.on('pageerror', e => errs.push(name + ': ' + e.message));
    await pg.route(/fonts\./, r => r.abort());
    await pg.goto('file://' + f); await pg.waitForTimeout(500); await pg.evaluate(() => demoLogin()); await pg.waitForTimeout(100);
    await pg.click('[data-a="sugg"]');
    await pg.click('#sform .go');
    const e1 = await pg.$$eval('#serr li', l => l.length);
    await pg.fill('#sname', 'Asdasdasdasd SALAK');
    await pg.click('[data-a="spick"]');
    const mb = await pg.$eval('#map', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + (r.width > 500 ? 430 : 260)]; });
    await pg.mouse.click(mb[0], mb[1]); await pg.waitForTimeout(200);
    console.log(await pg.evaluate(([x,y]) => ({ picking: S.picking, dlg: document.getElementById('suggest').open, el: document.elementFromPoint(x,y).outerHTML.slice(0,60), sy: scrollY, app: document.getElementById('app').scrollTop, mw: document.getElementById('mapwrap').scrollTop }), mb), mb);
    const loc = await pg.textContent('#sloc');
    await pg.fill('#sdesc', 'Kısa');
    await pg.click('#sform .go');
    const e2 = await pg.$$eval('#serr li', l => l.map(x => x.textContent));
    await pg.screenshot({ path: `${out}/${name}-s1.png` });
    await pg.fill('#sname', 'Deneme Kanyonu');
    await pg.fill('#sdesc', 'Yürüyüş yolu olan, içinden dere geçen sakin bir kanyon.');
    await pg.setInputFiles('#sfile', { name: 'kanit.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
    await pg.check('#sbeen');
    await pg.click('#sform .go'); await pg.waitForTimeout(300);
    const openD = await pg.$eval('#suggest', d => d.open);
    await pg.click('[data-a="vok"][data-v="g1"]'); await pg.waitForTimeout(200);
    await pg.screenshot({ path: `${out}/${name}-s2.png` });
    await pg.click('[data-a="pback"]');
    await pg.fill('#q', 'Güvercin'); await pg.waitForTimeout(100);
    const found = await pg.$$eval('#rows .rn', l => l.map(x => x.textContent));
    console.log(name, '| boş gönderim hata sayısı:', e1, '| konum:', loc, '| hatalar:', e2.length, '| dialog açık mı:', openD, '| aramada:', found);
  }
  console.log('sayfa hataları:', errs.length ? errs : 'yok'); await b.close();
})();
