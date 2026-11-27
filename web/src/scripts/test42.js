const { chromium } = require('playwright');
const [file, outdir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'tr-TR' });
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem('gezi-onboarded', '1'); } catch (_) {} });
  await pg.route('**/api.mymemory.translated.net/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ responseStatus: 200, responseData: { translatedText: 'Very beautiful place' } }) }));
  await pg.route('**/overpass**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: [{ type: 'relation', id: 1, members: [{ type: 'way', geometry: [{ lat: 36.55, lon: 29.15 }, { lat: 36.4, lon: 29.4 }, { lat: 36.3, lon: 29.8 }] }] }, { type: 'node', id: 5, lat: 38.64, lon: 34.83, tags: { name: 'Aşk Vadisi Seyir', tourism: 'viewpoint' } }] }) }));
  await pg.goto('file://' + file + '?ortak=11111111-2222-3333-4444-555555555555&k=abcdef123456'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => x.dataset.a === 'demo'); bt && bt.click(); });
  await pg.evaluate(() => {
    const DB = { follows: [], shared_trips: [{ id: '11111111-2222-3333-4444-555555555555', owner: 'u2', title: 'Kapadokya hafta sonu', invite: 'abcdef123456', created_at: new Date().toISOString() }],
      shared_trip_items: [{ trip_id: '11111111-2222-3333-4444-555555555555', place_id: 'goreme', added_by: 'u2', created_at: '2026-11-01', profiles: { name: 'Ayşe' } }], shared_trip_members: [],
      quiz_scores: [{ score: 4, ms: 42000, profiles: { name: 'Ayşe' } }], app_settings: [{ key: 'blue_flag', value: JSON.stringify({ 2026: ['oludeniz'], 2025: ['patara'], area: [] }) }],
      visits: [{ place_id: 'goreme', created_at: '2026-05-01' }, { place_id: 'efes', created_at: '2026-06-01' }, { place_id: 'pamukkale', created_at: '2026-06-02' }], reviews: [], journal_entries: [] };
    window.DB = DB; window.LOG = [];
    const q = (t) => { let rows = (DB[t] || []).slice(), op = 'select', payload = null; const f = [];
      const o = { select: () => o, order: () => o, limit: () => o, gte: () => o, lt: () => o, in: () => o, not: () => o, range: () => o,
        eq: (k, v) => { f.push([k, v]); return o; }, insert: p => { op = 'insert'; payload = p; return o; }, delete: () => { op = 'delete'; return o; },
        single: () => o.then(r => ({ ...r, data: Array.isArray(r.data) ? r.data[0] : r.data })), maybeSingle: () => o.then(r => ({ ...r, data: Array.isArray(r.data) ? r.data[0] || null : r.data })),
        then: (res, rej) => { const m = x => f.every(([k, v]) => x[k] === v);
          let out; if (op === 'insert') { const row = { id: 'n' + (DB[t] || []).length, created_at: new Date().toISOString(), invite: 'ffff0000', ...payload }; (DB[t] = DB[t] || []).push(row); LOG.push(['insert', t, payload]); out = { data: [row], error: null }; }
          else if (op === 'delete') { DB[t] = (DB[t] || []).filter(x => !m(x)); LOG.push(['delete', t, f]); out = { data: null, error: null }; }
          else out = { data: rows.filter(m), error: null, count: rows.filter(m).length };
          return Promise.resolve(out).then(res, rej); } };
      return o; };
    sb = { from: q, rpc: async (fn, a) => { LOG.push(['rpc', fn, a]);
      if (fn === 'traveler') return { data: { name: a.p_uid === 'u1' ? 'Ali' : 'Ayşe', avatar_path: null, since: '2025-03-01', visits: 12, provinces: 7, reviews: 3, photos: 2, followers: 5, following: 1, i_follow: DB.follows.some(x => x.followee === a.p_uid) } };
      if (fn === 'join_trip') { DB.shared_trip_members.push({ trip_id: a.p_trip, user_id: 'u1', profiles: { name: 'Ali' } }); return { data: { id: a.p_trip, title: 'Kapadokya hafta sonu', already: false } }; }
      return { data: null }; }, storage: { from: () => ({ getPublicUrl: p => ({ data: { publicUrl: 'https://x/' + p } }) }) }, functions: { invoke: async () => ({ data: null }) } };
    ME = { id: 'u1' }; CUR = { name: 'Ali', email: 'a@x', av: null };
    S.posts = [{ id: 'r1', pid: 'goreme', author: 'Ayşe', uid: 'u2', ruid: 'u2', av: null, rating: 5, text: 'Very nice place, we loved the balloons', media: null, likes: 0, replies: [], ago: '2 gün önce', at: Date.now(), sample: false },
      { id: 'r2', pid: 'efes', author: 'Ayşe', uid: 'u2', ruid: 'u2', av: null, rating: 4, text: 'Çok güzel bir yer', media: null, likes: 0, replies: [], ago: '3 gün önce', at: Date.now() - 1e6, sample: false }];
  });
  await pg.waitForTimeout(1800);
  const out = {};
  out.join = await pg.evaluate(() => ({ kind: XV && XV.kind, txt: document.getElementById('xbody').innerText.slice(0, 400) }));
  await pg.screenshot({ path: outdir + '/s-strip.png' });
  // yer ekle arama
  await pg.fill('#shq', 'efes'); await pg.waitForTimeout(200);
  out.search = await pg.evaluate(() => document.getElementById('shres').innerText.slice(0, 120));
  await pg.evaluate(async () => { await A.shaddp('efes'); }); await pg.waitForTimeout(200);
  out.items = await pg.evaluate(() => DB.shared_trip_items.map(x => x.place_id));
  // yer sayfası: yorum çevirisi, yazar, mavi bayrak, fotoğraf saatleri, ortak listeye ekle
  await pg.evaluate(() => { setLang('tr'); hideX(); select('goreme'); S.tab = 'rev'; renderDetail(); });
  await pg.waitForTimeout(300);
  out.rev = await pg.evaluate(() => ({ trl: document.querySelectorAll('#detail .trl').length, wlink: document.querySelectorAll('#detail .wlink').length }));
  await pg.evaluate(async () => { await A.trl('r1'); }); await pg.waitForTimeout(200);
  out.trlOut = await pg.evaluate(() => (document.querySelector('#detail .trlo') || {}).textContent);
  await pg.screenshot({ path: outdir + '/s-rev.png' });
  await pg.evaluate(() => A.tvl('u2')); await pg.waitForTimeout(400);
  out.trav = await pg.evaluate(() => document.getElementById('xbody').innerText.slice(0, 300));
  await pg.evaluate(async () => { await A.tfollow('u2'); }); await pg.waitForTimeout(300);
  out.follow = await pg.evaluate(() => ({ db: DB.follows.length, btn: (document.querySelector('[data-a="tfollow"]') || {}).innerText }));
  await pg.screenshot({ path: outdir + '/s-trav.png' });
  await pg.evaluate(() => A.xback()); await pg.waitForTimeout(300);
  out.backToPlace = await pg.evaluate(() => S.sel);
  await pg.evaluate(() => { S.tab = 'ov'; renderDetail(); }); await pg.waitForTimeout(200);
  out.ov = await pg.evaluate(() => ({ ps: !!document.getElementById('psbox'), sh: !!document.querySelector('[data-a="shadd"]') }));
  await pg.evaluate(async () => { await A.pspots(); }); await pg.waitForTimeout(200);
  out.spots = await pg.evaluate(() => document.getElementById('psbox').innerText);
  await pg.evaluate(() => A.shadd('goreme')); await pg.waitForTimeout(300);
  out.pick = await pg.evaluate(() => document.getElementById('shpick').innerText);
  await pg.screenshot({ path: outdir + '/s-ov.png' });
  await pg.evaluate(() => { select('oludeniz'); S.tab = 'ov'; renderDetail(); }); await pg.waitForTimeout(500);
  out.bf = await pg.evaluate(() => (document.querySelector('.bfbox') || {}).innerText);
  // vitrin takip
  await pg.evaluate(() => { showPhotos(true); A.psort('follow'); }); await pg.waitForTimeout(300);
  out.feed = await pg.evaluate(() => document.getElementById('photos').innerText.slice(0, 200));
  await pg.screenshot({ path: outdir + '/s-feed.png' });
  // planla
  await pg.evaluate(() => { showPhotos(false); A.mplan(); }); await pg.waitForTimeout(300);
  out.plan = await pg.evaluate(() => [...document.querySelectorAll('#xbody .planit b')].map(x => x.textContent));
  await pg.screenshot({ path: outdir + '/s-plan.png', fullPage: true });
  for (const [a, f] of [['mcolls', 'colls'], ['mquiz', 'quiz'], ['mtrails', 'trails'], ['mbflag', 'bflag'], ['mpack', 'pack'], ['myear', 'year'], ['mshared', 'shared']]) {
    await pg.evaluate(a => { A.mplan(); A[a](); }, a); await pg.waitForTimeout(500);
    out[f] = await pg.evaluate(() => ({ kind: XV.kind, t: document.getElementById('xbody').innerText.slice(0, 160).replace(/\n+/g, ' | ') }));
    await pg.screenshot({ path: outdir + '/s-' + f + '.png' });
  }
  await pg.evaluate(() => { A.mplan(); A.mcolls(); A.collopen('unesco'); }); await pg.waitForTimeout(200);
  out.unesco = await pg.evaluate(() => document.getElementById('xbody').innerText.slice(0, 200).replace(/\n+/g, ' | '));
  await pg.evaluate(() => { A.mplan(); A.mquiz(); A.qzstart('daily'); }); await pg.waitForTimeout(300);
  out.q1 = await pg.evaluate(() => ({ n: QZ.qs.length, ids: QZ.qs.map(q => q.p.id).join(',') }));
  await pg.screenshot({ path: outdir + '/s-quiz.png' });
  for (let i = 0; i < 5; i++) { await pg.evaluate(() => { const q = QZ.qs[QZ.i]; A.qzans(q.opts[0].id); }); await pg.waitForTimeout(1250); }
  out.q2 = await pg.evaluate(() => ({ saved: localStorage.getItem('gezi-quiz'), ins: DB.quiz_scores.length, txt: document.getElementById('xbody').innerText.slice(0, 200).replace(/\n+/g, ' | ') }));
  await pg.evaluate(() => { A.mplan(); A.mtrails(); A.trailopen('likya'); }); await pg.waitForTimeout(800);
  out.trail = await pg.evaluate(() => ({ path: !!document.getElementById('routepath'), t: document.getElementById('xbody').innerText.slice(0, 200).replace(/\n+/g, ' | ') }));
  await pg.screenshot({ path: outdir + '/s-trail.png' });
  await pg.evaluate(() => A.xback()); await pg.waitForTimeout(200);
  out.trailBack = await pg.evaluate(() => ({ kind: XV.kind, prev: XV.prev, path: !!document.getElementById('routepath') }));
  await pg.evaluate(() => { A.mplan(); A.mpack(); A.pkact('deniz'); A.pkchk('Mayo'); }); await pg.waitForTimeout(200);
  out.pack = await pg.evaluate(() => localStorage.getItem('gezi-pack'));
  // dil: almanca
  await pg.evaluate(() => { setLang('de'); A.mplan(); }); await pg.waitForTimeout(300);
  out.planDe = await pg.evaluate(() => [...document.querySelectorAll('#xbody .planit b')].map(x => x.textContent).slice(-8));
  console.log(JSON.stringify(out, null, 1), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
