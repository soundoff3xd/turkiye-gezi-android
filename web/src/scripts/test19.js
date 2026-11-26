const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const log = [], errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.route(/fonts\.|jsdelivr|openfreemap|maptiler|supabase/, r => r.abort());
  await pg.goto('file://' + file); await pg.waitForTimeout(1000);
  log.push(`ilk açılış penceresi açık: ${await pg.evaluate(() => $('onb').open)} | giriş penceresi kapalı: ${await pg.evaluate(() => !$('auth').open)}`);
  await pg.screenshot({ path: out + '/onb-1.png' });
  await pg.click('.olang[data-v="en"]'); await pg.waitForTimeout(300);
  log.push(`İngilizce seçildi → başlık: "${await pg.textContent('#onbt')}" | düğme: "${await pg.textContent('#onbgo')}"`);
  await pg.click('.olang[data-v="tr"]'); await pg.waitForTimeout(200);
  await pg.click('#onbgo'); await pg.waitForTimeout(200);
  await pg.click('.oint[data-v="kultur"]'); await pg.click('.oint[data-v="deniz"]');
  log.push(`ilgi adımı düğmesi: "${await pg.textContent('#onbgo')}" | seçili: ${await pg.$$eval('.oint[aria-pressed="true"]', e => e.length)}`);
  await pg.screenshot({ path: out + '/onb-2.png' });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  log.push(`Esc ile kapanmıyor: ${await pg.evaluate(() => $('onb').open)}`);
  await pg.click('#onbgo'); await pg.waitForTimeout(400);
  log.push(`Başla → giriş penceresi: ${await pg.evaluate(() => $('auth').open)} | kayıt: ${await pg.evaluate(() => localStorage.getItem('gezi-interests') + ' / ' + localStorage.getItem('gezi-start'))}`);
  await pg.click('[data-a="demo"]'); await pg.waitForTimeout(600);
  const fy = await pg.evaluate(() => ({ cat: S.cat, n: results().length, groups: [...new Set(results().map(x => (x.p || x).g))].join(','), tile: !!document.querySelector('#cats .gt.fy[aria-pressed="true"]') }));
  log.push(`girişten sonra: kategori=${fy.cat} | ${fy.n} yer | gruplar=${fy.groups} | Senin için kutucuğu seçili: ${fy.tile}`);
  await pg.screenshot({ path: out + '/onb-3.png' });
  await pg.click('#acct'); await pg.click('[data-a="minterests"]'); await pg.waitForTimeout(200);
  log.push(`menü → İlgi alanlarım: açık=${await pg.evaluate(() => $('onb').open)} | Atla gizli: ${await pg.evaluate(() => $('onbskip').hidden)} | düğme: "${await pg.textContent('#onbgo')}"`);
  await pg.click('.oint[data-v="kultur"]'); await pg.click('.oint[data-v="deniz"]'); await pg.click('#onbgo'); await pg.waitForTimeout(300);
  log.push(`hepsi kaldırıldı → Senin için kutucuğu yok: ${!(await pg.$('#cats .gt.fy'))} | kategori: ${await pg.evaluate(() => S.cat)}`);
  await pg.reload(); await pg.waitForTimeout(900);
  log.push(`yeniden yükleme → pencere yine açılmıyor: ${await pg.evaluate(() => !$('onb').open)}`);
  await ctx.close();

  // fotoğraf seven + Atla
  for (const mode of ['foto', 'atla']) {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'tr-TR' });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(mode + ': ' + e.message));
    await p.route(/fonts\.|jsdelivr|openfreemap|maptiler|supabase/, r => r.abort());
    await p.goto('file://' + file); await p.waitForTimeout(900);
    if (mode === 'foto') { await p.click('#onbgo'); await p.click('.oint[data-v="foto"]'); await p.click('#onbgo'); }
    else { await p.click('#onbskip'); await p.click('#onbskip'); }
    await p.waitForTimeout(300);
    await p.click('[data-a="demo"]'); await p.waitForTimeout(700);
    log.push(`${mode}: vitrin açık=${await p.evaluate(() => S.pmode === 'photos' && !$('photov').hidden)} | kategori=${await p.evaluate(() => S.cat)} | Senin için kutucuğu: ${!!(await p.$('#cats .gt.fy'))}`);
    if (mode === 'foto') await p.screenshot({ path: out + '/onb-foto.png' });
    await c.close();
  }
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
