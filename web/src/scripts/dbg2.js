const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.route(/fonts\.|supabase|jsdelivr|openfreemap/, r => r.abort());
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(1000);
  await pg.click('[data-a="demo"]'); await pg.waitForTimeout(600);
  await pg.evaluate(() => { S.full = true; setSheet(); }); await pg.waitForTimeout(500);
  console.log(await pg.evaluate(() => { const r = $('grip').getBoundingClientRect(); const el = document.elementFromPoint(195, r.top + r.height / 2); return [r.top, r.height, el && (el.id || el.className || el.tagName), $('top').offsetHeight]; }));
  await b.close();
})();
