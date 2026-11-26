const { chromium } = require('playwright');
const fs = require('fs');
const [file, out, mockSrc] = process.argv.slice(2);
const MOCK = fs.readFileSync(mockSrc, 'utf8').split('const MOCK = `')[1].split('`;\n')[0];
(async () => {
  const b = await chromium.launch(); const log = [], errs = [];
  for (const online of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'tr-TR', permissions: ['geolocation'], geolocation: { latitude: 38.6431, longitude: 34.8289 } });
    const pg = await ctx.newPage(); await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} }); pg.on('pageerror', e => errs.push((online ? 'online: ' : 'önizleme: ') + e.message));
    if (online) {
      await pg.addInitScript(MOCK);
      await pg.addInitScript(`(() => { const cc = window.supabase.createClient; window.supabase.createClient = (...a) => { const c = cc(...a);
        c.functions = { invoke: async (n, o) => { window.__route = o.body; return { data: { geometry: { type: 'LineString', coordinates: [[34.8289,38.6431],[34.836,38.641],[34.8453,38.6403]] }, distance: 2400, duration: 3720, steps: [{ i: 'Kuzeydoğuya ilerle', d: 300, t: 60 }, { i: 'Sola dön', d: 2100, t: 3600 }] }, error: null }; } };
        return c; }; })()`);
      await pg.route(/supabase\.co/, r => r.fulfill({ status: 200, body: '{}' }));
    }
    await pg.route(/fonts\.|jsdelivr|openfreemap|maptiler/, r => r.abort());
    await pg.goto('file://' + file); await pg.waitForTimeout(1200);
    const tag = online ? 'çevrimiçi' : 'önizleme';
    if (online) { await pg.click('[data-a="amode"][data-v="up"]'); await pg.fill('#aname', 'Mert'); await pg.fill('#aemail', 'm@ornek.com'); await pg.fill('#apass', 'sifre-12345'); await pg.click('#ago'); }
    else await pg.click('[data-a="demo"]');
    await pg.waitForTimeout(800);
    log.push(`${tag}: konum kendiliğinden alındı: ${await pg.evaluate(() => !!MEPOS)} | mavi nokta: ${!!(await pg.$('#pins .mepin'))}`);
    await pg.click('[data-a="locate"]'); await pg.waitForTimeout(900);
    const dot = await pg.$eval('#pins .mepin', e => [parseFloat(e.style.left), parseFloat(e.style.top)]);
    log.push(`${tag}: Konumum düğmesi → nokta ekranda: ${dot[0] > 0 && dot[0] < 1280 && dot[1] > 0 && dot[1] < 800} (V.s=${await pg.evaluate(() => V.s.toFixed(2))})`);
    await pg.click('[data-a="sort"][data-v="near"]'); await pg.waitForTimeout(300);
    log.push(`${tag}: Bana en yakın → ilk 3: ${(await pg.$$eval('#rows .row .rn', e => e.slice(0, 3).map(x => x.textContent))).join(', ')} | ilk uzaklık: ${await pg.$eval('#rows .row .dist', e => e.textContent.trim())}`);
    await pg.click('#rows .row'); await pg.waitForTimeout(500);
    log.push(`${tag}: kartta uzaklık: ${await pg.$eval('#detail .dist', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => 'YOK')}`);
    await pg.click('#detail [data-a="route"]'); await pg.waitForTimeout(1200);
    log.push(`${tag}: rota kutusu: ${await pg.$eval('#routebox', e => e.innerText.replace(/\s+/g, ' ').slice(0, 160)).catch(() => 'YOK')}`);
    if (online) {
      log.push(`${tag}: istek: ${JSON.stringify(await pg.evaluate(() => window.__route))} | çizgi: ${!!(await pg.$('#routepath'))}`);
      await pg.click('[data-a="rmode"][data-v="foot-walking"]'); await pg.waitForTimeout(800);
      log.push(`${tag}: yürüyüş seçildi → profil: ${await pg.evaluate(() => window.__route.profile)} | uygulama içi navigasyon düğmesi: ${!!(await pg.$('#routebox [data-a="navgo"]:not([disabled])'))} | Google bağlantısı: ${await pg.$eval('#routebox a.btn', e => e.href.split('?')[1])}`);
      await pg.screenshot({ path: out + '/site-rota.png' });
      await pg.click('[data-a="rclose"]'); await pg.waitForTimeout(300);
      log.push(`${tag}: kapatınca çizgi kalktı: ${!(await pg.$('#routepath'))}`);
    }
    await pg.click('[data-a="back"]').catch(() => {});
    await pg.click('[data-a="sugg"]'); await pg.click('[data-a="shere"]'); await pg.waitForTimeout(500);
    log.push(`${tag}: Şu an buradayım → ${await pg.textContent('#sloc')} | il: ${await pg.inputValue('#sil')}`);
    await ctx.close();
  }
  // izin yokken
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  const pg = await ctx.newPage(); await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} }); pg.on('pageerror', e => errs.push('izinsiz: ' + e.message));
  await pg.route(/fonts\.|jsdelivr|openfreemap|maptiler|supabase/, r => r.abort());
  await pg.goto('file://' + file); await pg.waitForTimeout(1000); await pg.click('[data-a="demo"]'); await pg.waitForTimeout(300);
  await pg.click('[data-a="locate"]'); await pg.waitForTimeout(800);
  log.push(`izinsiz: bildirim: "${await pg.textContent('#toast')}" | nokta yok: ${!(await pg.$('#pins .mepin'))}`);
  await pg.screenshot({ path: out + '/site-tel.png' });
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
