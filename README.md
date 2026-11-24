# Türkiye Gezi Rehberi — Android uygulaması

Web sitesiyle (turkiye-gezi-rehberi-yeb7.netlify.app) aynı veritabanını kullanan React Native (Expo) uygulaması.

## Telefona kurmak
1. Telefondan **Releases** sayfasını aç ve en üstteki sürümde **turkiye-gezi-rehberi.apk** dosyasına dokun.
   Sabit bağlantı: `https://github.com/<kullanıcı-adı>/turkiye-gezi-android/releases/latest/download/turkiye-gezi-rehberi.apk`
2. İndirme bitince dosyaya dokun. Android "bilinmeyen kaynaklardan yükleme" izni isterse tarayıcına (Chrome) bu izni ver.
3. **Yükle**'ye bas. Yeni sürümler eskisinin üzerine kurulur, hesabın ve verilerin kaybolmaz.

## Nasıl derleniyor
`main` dalına her gönderimde `.github/workflows/apk.yml` çalışır: Expo projesini hazırlar, Android projesini üretir,
APK'yı derler ve Releases sayfasına koyar (yaklaşık 15–25 dakika). Actions sekmesinden ilerlemeyi izleyebilirsin.

## Klasörler
- `App.tsx` — giriş kapısı: hesap yoksa giriş ekranı, varsa harita
- `src/screens` — ekranlar (giriş, harita)
- `src/components` — yer kartı
- `src/lib` — Supabase bağlantısı, oturum, veri
- `src/data` — 140 yer ve kategoriler (web sitesiyle aynı)
