const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1200, height: 860 } });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 12, weather_code: 63 }, daily: { time: ['2026-11-25'], weather_code: [63], temperature_2m_max: [14], temperature_2m_min: [8], precipitation_probability_max: [80] } }) }));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(600);
  const before = await pg.evaluate(() => document.getElementById('wxpick').innerText.trim());
  await pg.evaluate(() => { MEPOS = { lat: 41.0086, lng: 28.9802, acc: 20 }; wxKey = ''; renderList(); }); await pg.waitForTimeout(800);
  const after = await pg.evaluate(() => ({ txt: document.getElementById('wxpick').innerText.replace(/\n+/g, ' | ').slice(0, 300), n: document.querySelectorAll('#wxpick .wxp').length }));
  await pg.screenshot({ path: out + '/wx.png', clip: { x: 0, y: 0, width: 600, height: 860 } });
  console.log(JSON.stringify({ before, after }), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
