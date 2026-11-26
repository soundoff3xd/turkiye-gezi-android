# Site kaynakları

Site tek bir HTML dosyasıdır; bu klasördeki parçalardan üretilir.

- `build/` — şablon (`template.html`), uygulama parçaları (`app*.js`), dil dosyaları (`lang/`), rota ve sözlük verisi (`data/`)
- `l20/`, `paint/`, `photos/` — 20 ek dilin çevirileri, il şekilleri ve yöresel lezzetler, Wikimedia fotoğraf listesi
- `scripts/build.py` — parçaları birleştirir: `cd web/src && python3 scripts/build.py build ../site.html`
- `scripts/test*.js` — Playwright testleri
- `sw/sw.js` — çevrimdışı kullanım için service worker
- `i18n/` — çeviri çalışma dosyaları

Yayın: üretilen dosyanın başına `<!doctype html>` + `<meta charset="utf-8">` eklenip `web/index.html` olarak kaydedilir;
`index.html` + `sw.js` zip'lenip Netlify'a yüklenir.
