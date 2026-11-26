const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await p.route(/fonts\.|supabase|jsdelivr|openfreemap/, r => r.abort());
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await p.click('[data-a="demo"]'); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => [typeof MKI, document.querySelectorAll('#pins .lmp').length, document.querySelectorAll('#pins .mkp').length, document.querySelectorAll('#pins .cl').length, document.querySelectorAll('#pins .pin').length, V.s, V.maxS].join(' | ')));
  await p.screenshot({ path: process.argv[3] + '/dbg.png' });
  console.log(errs);
  await b.close();
})();
