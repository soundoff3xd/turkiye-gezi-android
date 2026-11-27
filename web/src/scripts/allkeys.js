const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const app = JSON.parse(fs.readFileSync('miss_app.json', 'utf8'));
  const drop = new Set(['FeatureCollection', 'Feature', 'MultiLineString', 'Point', ' günlük ', 'da "İstanbul', 'İstanbul', 'Nevşehir']);
  const extra = ['Emin misin? Onaylamak için tekrar dokun', 'Sonuç yok',
    'İlerlemen bu tarayıcıda saklanır; giriş yaparsan hesabına kaydedilir.', 'Skor tablosu için internet bağlantısı gerekir.', '{1} sn', '{1} km', 'En sevdiğin tür:', 'Görsel indirildi', '{1} yer', '{1} gün', 'Yerler', 'Seyir noktası', 'Yer', 'İl', 'Bölge', 'Yorum', 'Fotoğraf', 'Gezilen yer', 'Aldığın beğeni', 'Gezgin', 'Geri', 'Yer ara ve ekle', 'Oluştur', 'Google Haritalar’da aç', 'Rotayı göster', 'Yükleniyor…', 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.', 'Bir hata oluştu, lütfen tekrar dene.', 'Listeden çıkar'];
  const keys = [...new Set([...app.filter(k => !drop.has(k)), ...extra])];
  const A = '/home/claude/turkiye-gezi-android/src/i18n/';
  const D = { ...JSON.parse(fs.readFileSync(A + 'site.json')), ...JSON.parse(fs.readFileSync(A + 'app.json')) };
  const M = JSON.parse(fs.readFileSync(A + 'more20.json'));
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(600);
  const site = await pg.evaluate(ks => ks.map(k => !!I18N[k]), keys);
  const miss = keys.filter((k, i) => !site[i] || !D[k] || (!M[k] && !(D[k] && D[k].length > 19)));
  const enOf = await pg.evaluate(ks => ks.map(k => I18N[k] ? I18N[k][0] : null), miss);
  fs.writeFileSync('miss_all.json', JSON.stringify(miss.map((k, i) => [k, enOf[i] || (D[k] && D[k][0]) || null]), null, 0));
  console.log(keys.length, 'missing', miss.length); console.log(miss.map((k, i) => (enOf[i] || D[k] ? '* ' : '  ') + k).join('\n'));
  await b.close();
})();
