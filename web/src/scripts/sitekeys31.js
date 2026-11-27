const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const src = fs.readFileSync(process.argv[3], 'utf8');
  const cands = new Set();
  // >metin< parçaları (${...} çıkarılmış)
  for (const m of src.matchAll(/>([^<>`]*?)</g)) {
    let t = m[1].replace(/\$\{[^}]*\}/g, '\u0001').trim();
    if (!t || !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(t)) continue;
    if (t.includes('\u0001')) { t = t.replace(/\u0001/g, '{1}'); if ((t.match(/\{1\}/g) || []).length > 1) continue; }
    cands.add(t.replace(/^· |^ +| +$/g, ''));
  }
  for (const m of src.matchAll(/(?:toast|tx|navSay)\('((?:[^'\\]|\\.)+)'/g)) cands.add(m[1]);
  for (const m of src.matchAll(/\['[a-z]+', '[^']*', '([^']+)'\]/g)) cands.add(m[1]);
  for (const m of src.matchAll(/'((?:Öğle|İkindi|Akşam|Cuma) namazı|İmsak|Güneş|Öğle|İkindi|Akşam|Yatsı|Paralı yol yok|Otoyol yok|Feribot yok)'/g)) cands.add(m[1]);
  for (const m of src.matchAll(/aria-label="([^"$]+)"/g)) cands.add(m[1]);
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.goto('file://' + process.argv[2]); await pg.waitForTimeout(800);
  const have = await pg.evaluate(ks => ks.map(k => !!I18N[k]), [...cands]);
  const miss = [...cands].filter((k, i) => !have[i]);
  fs.writeFileSync('miss_site.json', JSON.stringify(miss, null, 0));
  console.log(cands.size, 'missing', miss.length); console.log(miss.join('\n'));
  await b.close();
})();
