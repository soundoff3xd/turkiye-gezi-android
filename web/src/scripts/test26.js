const { chromium } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.goto('file://' + file); await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); }); await pg.waitForTimeout(900);
  await pg.evaluate(() => select('ayasofya')); await pg.waitForTimeout(400);
  const link = await pg.evaluate(() => !!document.querySelector('#detail .corlink'));
  await pg.evaluate(() => { CUR = CUR || { name: 'x' }; A.cor('ayasofya'); A.ckind('konum'); });
  await pg.waitForTimeout(300);
  const dlg = await pg.evaluate(() => ({ open: document.getElementById('cordlg').open, rows: document.querySelectorAll('#corkinds .row').length, go: document.getElementById('corgo').disabled }));
  await pg.screenshot({ path: out + '/cor.png' });
  await pg.evaluate(() => closeDlg(document.getElementById('cordlg')));
  await pg.evaluate(() => {
    CUR.mod = true; showX('mod');
    Object.assign(MOD, { tab: 'cor', fbs: [], reps: [], names: {}, cors: [{ id: 'c1', place_id: 'ayasofya', user_id: 'u', kind: 'konum', note: 'Giriş kapısı yanlış', lat: 41.0086, lng: 28.98, status: 'open', created_at: new Date().toISOString() }], crashes: [{ id: 1, platform: 'web', version: 'web', message: 'TypeError: x', stack: 'at a\nat b', context: 'app.js:1', created_at: new Date().toISOString() }], usage: [{ name: 'screen:place', platform: 'web', n: 40 }, { name: 'act:visit', platform: 'android', n: 12 }, { name: 'tab:map', platform: 'android', n: 30 }] });
    renderX();
  });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '/modcor.png', clip: { x: 0, y: 0, width: 600, height: 800 } });
  const res = {};
  for (const t of ['fb', 'rep', 'err', 'stat']) { await pg.evaluate(t => { MOD.tab = t; renderX(); }, t); res[t] = await pg.evaluate(() => document.getElementById('xbody').innerText.slice(0, 80).replace(/\n/g, ' | ')); }
  await pg.screenshot({ path: out + '/modstat.png', clip: { x: 0, y: 0, width: 600, height: 800 } });
  console.log('bağlantı:', link, '| diyalog:', JSON.stringify(dlg), '\n', JSON.stringify(res, null, 1), '\nhatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
