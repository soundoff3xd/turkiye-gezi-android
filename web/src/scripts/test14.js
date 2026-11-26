const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(`window.supabase={createClient(){const q=()=>{const b={select:()=>b,eq:()=>b,not:()=>b,order:()=>b,limit:()=>b,single:()=>b,then:r=>r({data:null,error:null})};return b};
   return {from:q,rpc:async()=>({data:[],error:null}),storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})},
   auth:{getSession:async()=>({data:{session:{user:{id:'x',email:'eski@ornek.com',created_at:new Date().toISOString()}}}}),getUser:async()=>({error:{message:'User not found'}}),signOut:async()=>{window.__out=1;return{error:null}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}}`);
  await pg.route(/fonts\.|jsdelivr/, r => r.abort()); await pg.route(/supabase\.co/, r => r.fulfill({ status: 200, body: '{}' }));
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(1200);
  console.log('silinmiş hesap → çıkış yapıldı:', await pg.evaluate(() => !!window.__out), '| hesap ekranı açık:', await pg.evaluate(() => document.getElementById('auth').open), '| hatalar:', errs.length ? errs : 'yok');
  await b.close();
})();
