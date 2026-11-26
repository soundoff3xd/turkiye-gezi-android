const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [], log = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'tr-TR' });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.route(/fonts\.|supabase|jsdelivr|openfreemap/, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(1000);
  await pg.click('[data-a="demo"]'); await pg.waitForTimeout(600); await pg.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });
  const H = () => pg.evaluate(() => Math.round($('panel').getBoundingClientRect().height));
  const cdp = await ctx.newCDPSession(pg);
  const swipe = async (y0, y1, steps, ms) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y0 + (y1 - y0) * i / steps }] }); await pg.waitForTimeout(ms); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(450);
  };
  const gy = async () => pg.evaluate(() => { const r = $('grip').getBoundingClientRect(); return r.top + r.height / 2; });
  log.push(`başlangıç ${await H()}px`);
  let y = await gy(); await swipe(y, y - 300, 12, 30); log.push(`yukarı yavaş sürükle → ${await H()}px (tam boy: ${await pg.evaluate(() => S.full)})`);
  y = await gy(); await swipe(y, y + 250, 12, 30); log.push(`aşağı sürükle → ${await H()}px`);
  y = await gy(); await swipe(y, y + 120, 3, 10); log.push(`aşağı hızlı fırlat → ${await H()}px (kapalı: ${await pg.evaluate(() => S.collapsed)})`);
  y = await gy(); await swipe(y, y - 90, 3, 10); log.push(`yukarı hızlı fırlat → ${await H()}px`);
  y = await gy(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y - 150 }] }); await pg.waitForTimeout(100);
  log.push(`parmak basılıyken panel parmağı izliyor: ${await H()}px`); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(450);
  await pg.screenshot({ path: process.argv[3] + '/drag.png' });
  await pg.tap('#grip'); await pg.waitForTimeout(450); log.push(`dokununca (eski davranış) → ${await H()}px`);
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
