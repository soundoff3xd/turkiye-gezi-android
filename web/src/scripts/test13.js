const { chromium } = require('playwright');
const MOCK = `
window.__db = { profiles: [], places: [], visits: [], favorites: [], reviews: [], review_likes: [], photo_likes: [], replies: [], suggestions: [], suggestion_votes: [], users: [] };
let user = null; const cbs = [];
function prof(uid) { const p = __db.profiles.find(p => p.id === uid); return p ? { name: p.name } : null; }
function enrich(t, r) {
  if (t === 'reviews') return { ...r, profiles: prof(r.user_id), replies: __db.replies.filter(x => x.review_id === r.id).map(x => ({ ...x, profiles: prof(x.user_id) })), review_likes: __db.review_likes.filter(x => x.review_id === r.id), photo_likes: __db.photo_likes.filter(x => x.review_id === r.id) };
  if (t === 'suggestions') return { ...r, profiles: prof(r.user_id), suggestion_votes: __db.suggestion_votes.filter(v => v.suggestion_id === r.id) };
  if (t === 'places') return { ...r, profiles: prof(r.added_by) };
  return r;
}
function run(st) {
  const T = __db[st.table];
  if (st.op === 'insert') {
    const r = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...st.row };
    if (st.table === 'suggestion_votes') {
      const s = __db.suggestions.find(x => x.id === r.suggestion_id);
      if (s.user_id === r.user_id) return { error: { message: 'Kendi önerini onaylayamazsın.' } };
      T.push(r);
      if (T.filter(v => v.suggestion_id === s.id && v.vote > 0).length >= 3) { s.status = 'ok'; s.place_id = 'u_' + s.id.slice(0, 8); __db.places.push({ id: s.place_id, name: s.name, province: s.province, region: s.region, category: s.category, lat: s.lat, lng: s.lng, description: s.description, added_by: s.user_id }); }
      return { error: null };
    }
    if (st.table === 'suggestions') r.status = 'wait';
    T.push(r); return { error: null };
  }
  if (window.__failPlaces && st.table === "places") return { data: null, error: { message: "PGRST201 ambiguous", code: "PGRST201" } };
  if (st.op === "delete") { __db[st.table] = T.filter(r => !st.filters.every(([k, v]) => r[k] === v)); return { error: null }; }
  let rows = T.filter(r => st.filters.every(([k, v]) => r[k] === v));
  if (st.notnull) rows = rows.filter(r => r[st.notnull] != null);
  if (['visits', 'favorites'].includes(st.table)) rows = rows.filter(r => user && r.user_id === user.id);
  rows = rows.map(r => enrich(st.table, r));
  return { data: st.single ? rows[0] || null : rows, error: null };
}
function q(table) {
  const st = { table, filters: [], op: 'select', row: null, notnull: null, single: false };
  const b = { select() { return b; }, order() { return b; }, limit() { return b; }, single() { st.single = true; return b; },
    eq(k, v) { st.filters.push([k, v]); return b; }, not(k) { st.notnull = k; return b; },
    insert(row) { st.op = 'insert'; st.row = row; return b; }, delete() { st.op = 'delete'; return b; },
    then(res, rej) { try { res(run(st)); } catch (e) { rej(e); } } };
  return b;
}
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
window.supabase = { createClient() { return {
  from: q,
  rpc(name) {
    if (name === 'get_place_stats') { const ids = new Set(['efes', 'ayasofya', ...__db.places.map(p => p.id)]);
      return Promise.resolve({ data: [...ids].map(id => { const rs = __db.reviews.filter(r => r.place_id === id); return { place_id: id, visits: __db.visits.filter(v => v.place_id === id).length, favs: __db.favorites.filter(v => v.place_id === id).length, reviews: rs.length, rating: rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : null }; }), error: null }); }
    if (name === 'delete_my_account') { __db.profiles = __db.profiles.filter(p => p.id !== user.id); __db.users = __db.users.filter(u => u.id !== user.id); }
    return Promise.resolve({ error: null });
  },
  storage: { from() { return { upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: PNG } }), list: async () => ({ data: [] }), remove: async () => ({ error: null }) }; } },
  auth: {
    async signUp({ email, password, options }) { const u = { id: crypto.randomUUID(), email, created_at: new Date().toISOString(), identities: [{}] }; __db.profiles.push({ id: u.id, name: options.data.name, created_at: u.created_at, is_moderator: false }); __db.users.push({ ...u, password }); user = u; setTimeout(() => cbs.forEach(c => c('SIGNED_IN', { user })), 0); return { data: { user: u, session: { user: u } }, error: null }; },
    async signInWithPassword({ email, password }) { const u = __db.users.find(x => x.email === email && x.password === password); if (!u) return { error: { message: 'Invalid login credentials' } }; user = u; setTimeout(() => cbs.forEach(c => c('SIGNED_IN', { user })), 0); return { data: { user }, error: null }; },
    async signOut() { user = null; setTimeout(() => cbs.forEach(c => c('SIGNED_OUT', null)), 0); return { error: null }; },
    async getSession() { return { data: { session: user ? { user } : null } }; },
    onAuthStateChange(cb) { cbs.push(cb); return { data: { subscription: { unsubscribe() { } } } }; }
  } }; } };`;
(async () => {
  const [file, out] = [process.argv[2], process.argv[3]];
  const b = await chromium.launch(); const errs = [], log = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', deviceScaleFactor: 1 });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') { const t = m.text(); if (!/ERR_FAILED|Failed to load/.test(t)) errs.push('konsol: ' + t); } });
  await pg.addInitScript(MOCK); await pg.addInitScript('window.__failPlaces=true');
  await pg.route(/fonts\.|jsdelivr/, r => r.abort());
  await pg.route(/supabase\.co/, r => r.fulfill({ status: 200, body: '{}' }));
  await pg.goto('file://' + file); await pg.waitForTimeout(1200);
  const gate = () => pg.evaluate(() => document.getElementById('auth').open);
  log.push('çevrimiçi mod: ' + await pg.evaluate(() => document.body.classList.contains('online')) + ' | hesap ekranı: ' + await gate() + ' | demo düğmesi gizli: ' + !(await pg.isVisible('[data-a="demo"]')) + ' | örnek veri notu kalktı: ' + !(await pg.isVisible('#listv .demo')));
  const signup = async (n, e) => { await pg.click('[data-a="amode"][data-v="up"]'); await pg.fill('#aname', n); await pg.fill('#aemail', e); await pg.fill('#apass', 'sifre-12345'); await pg.click('#ago'); await pg.waitForTimeout(400); };
  await signup('Mert', 'mert@ornek.com');
  log.push('üye olunca: ekran kapandı ' + !(await gate()) + ' | kullanıcı ' + await pg.evaluate(() => CUR && CUR.name) + ' | yorum sayısı (örneksiz) ' + await pg.evaluate(() => S.posts.length));
  await pg.evaluate(() => select('efes')); await pg.waitForTimeout(500);
  await pg.click('[data-a="visit"]'); await pg.waitForTimeout(200);
  log.push('Gittim → veritabanında: ' + await pg.evaluate(() => __db.visits.length) + ' | kartta: ' + (await pg.$eval('#detail .stats', e => e.innerText)).replace(/\n/g, ' '));
  await pg.click('.acts [data-a="compose"]'); await pg.click('[data-a="star"][data-v="5"]'); await pg.fill('#ctext', 'Harika bir antik kent');
  await pg.setInputFiles('#cfile', { name: 'k.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
  await pg.click('#cgo'); await pg.waitForTimeout(600);
  log.push('yorum → veritabanı: ' + await pg.evaluate(() => __db.reviews.length + ' (fotoğraf: ' + (__db.reviews[0] && __db.reviews[0].photo_path ? 'var' : 'yok') + ')') + ' | yazar: ' + await pg.$eval('#detail .card .who b', e => e.textContent) + ' | puan: ' + await pg.$eval('.sum .big', e => e.textContent));
  await pg.click('#detail [data-a="like"]'); await pg.waitForTimeout(150);
  await pg.click('#detail [data-a="replies"]'); await pg.fill('#detail .rf input', 'Teşekkürler'); await pg.click('#detail [data-a="send"]'); await pg.waitForTimeout(200);
  log.push('beğeni: ' + await pg.evaluate(() => __db.review_likes.length) + ' | yanıt: ' + await pg.evaluate(() => __db.replies.length));
  await pg.click('[data-a="back"]'); await pg.click('#segmount [data-v="photos"]'); await pg.waitForTimeout(150);
  log.push('vitrin fotoğraf: ' + await pg.$$eval('#photos .pcard', e => e.length) + ' | örnek notu kalktı: ' + !(await pg.$$eval('#photos .note', e => e.some(x => /örnek|sample/i.test(x.textContent)))));
  await pg.click('#photos .plike'); await pg.waitForTimeout(150);
  log.push('foto beğeni → veritabanı: ' + await pg.evaluate(() => __db.photo_likes.length));
  await pg.click('#segmount [data-v="places"]').catch(() => pg.click('#photos [data-v="places"]'));
  await pg.click('[data-a="sugg"]'); await pg.fill('#sname', 'Tortum Şelalesi'); await pg.click('[data-a="spick"]'); await pg.waitForTimeout(200);
  log.push('işaretleme: picking=' + await pg.evaluate(() => S.picking) + ' dialog=' + await pg.evaluate(() => document.getElementById('suggest').open) + ' noktadaki: ' + await pg.evaluate(() => { const e = document.elementFromPoint(195, 300); return e.tagName + '#' + e.id + '.' + e.className; }));
  await pg.screenshot({ path: out + '/db-pick.png' });
  await pg.mouse.click(195, 300); await pg.waitForTimeout(200);
  log.push('nokta: ' + await pg.evaluate(() => JSON.stringify(S.pickPt)));
  await pg.fill('#sdesc', 'Tortum Gölü ayağında ilkbaharda en gür akan yüksek şelale.');
  await pg.setInputFiles('#sfile', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') });
  await pg.check('#sbeen');
  log.push('gönder öncesi: ' + await pg.evaluate(() => JSON.stringify({ f: !!S.sFile, m: !!S.sMedia, pt: !!S.pickPt, open: document.getElementById('suggest').open, errs: checks({ n: $('sname').value, d: $('sdesc').value, il: $('sil').value, c: $('scat').value, been: $('sbeen').checked }) })));
  await pg.click('#sform .go'); await pg.waitForTimeout(1500);
  log.push('öneri → veritabanı: ' + await pg.evaluate(() => __db.suggestions.length + ' / ' + (__db.suggestions[0] || {}).status) + ' | hata: ' + await pg.textContent('#serr'));
  const sid = await pg.evaluate(() => __db.suggestions[0] && __db.suggestions[0].id);
  if (sid) { await pg.click(`[data-a="vok"][data-v="${sid}"]`).catch(() => {}); }
  log.push('kendi önerisinde oy düğmesi yok: ' + (sid ? !(await pg.$(`[data-a="vok"][data-v="${sid}"]`)) : 'öneri yok'));
  if (!sid) { console.log(log.join('\n')); console.log('serr:', await pg.textContent('#serr'), 'suggest open:', await pg.evaluate(()=>document.getElementById('suggest').open), 'lat:', await pg.evaluate(()=>JSON.stringify({pick:S.pick||null}))); console.log('hatalar:', errs); await b.close(); return; }
  for (const [n, e] of [['Ayşe', 'ayse@ornek.com'], ['Can', 'can@ornek.com'], ['Elif', 'elif@ornek.com']]) {
    await pg.click('#acct'); await pg.click('[data-a="mlogout"]'); await pg.waitForTimeout(400);
    await signup(n, e);
    await pg.click('[data-a="pend"]'); await pg.waitForTimeout(150);
    await pg.click(`[data-a="vok"][data-v="${sid}"]`); await pg.waitForTimeout(400);
  }
  log.push('3 onay sonrası: durum ' + await pg.evaluate(() => (__db.suggestions[0] || {}).status) + ' | haritada: ' + await pg.evaluate(() => PLACES.some(p => p.n === 'Tortum Şelalesi')));
  await pg.click('#acct'); await pg.click('[data-a="mlogout"]'); await pg.waitForTimeout(400);
  await pg.click('[data-a="amode"][data-v="in"]'); await pg.fill('#aemail', 'mert@ornek.com'); await pg.fill('#apass', 'yanlis-sifre'); await pg.click('#ago'); await pg.waitForTimeout(300);
  log.push('yanlış şifre: ' + await pg.textContent('#aerr'));
  await pg.fill('#apass', 'sifre-12345'); await pg.click('#ago'); await pg.waitForTimeout(600);
  log.push('tekrar giriş: ' + await pg.evaluate(() => CUR && CUR.name) + ' | ziyaret geri geldi: ' + await pg.evaluate(() => S.visited.has('efes')) + ' | profilde yorum: ' + await pg.evaluate(() => S.posts.filter(p => p.uid === CUR.email).length));
  await pg.click('#acct'); await pg.click('[data-a="mprofile"]'); await pg.click('[data-a="delacct"]'); await pg.click('[data-a="delyes"]'); await pg.waitForTimeout(500);
  log.push('hesap silindi → hesap ekranı: ' + await gate() + ' | kullanıcı kaldı mı: ' + await pg.evaluate(() => __db.users.some(u => u.email === 'mert@ornek.com')));
  await pg.screenshot({ path: out + '/db-son.png' });
  console.log(log.join('\n')); console.log('hatalar:', errs.length ? errs : 'yok'); await b.close();
})();
