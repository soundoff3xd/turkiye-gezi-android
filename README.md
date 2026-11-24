# Türkiye Gezi Rehberi — Android uygulaması

Web sitesiyle (turkiye-gezi-rehberi-yeb7.netlify.app) aynı veritabanını kullanan React Native (Expo) uygulaması.

## Telefona kurmak
1. Telefondan şu bağlantıyı aç: `https://github.com/soundoff3xd/turkiye-gezi-android/releases/latest/download/turkiye-gezi-rehberi.apk`
2. İndirme bitince dosyaya dokun. Android izin isterse tarayıcına (Chrome) "bilinmeyen uygulamaları yükleme" izni ver.
3. **Yükle**'ye bas. Yeni sürümler eskisinin üzerine kurulur; hesabın ve verilerin kaybolmaz.

## Özellikler
- Hesap: üye ol / giriş (web sitesiyle ortak hesap), profil fotoğrafı, gezgin seviyesi, hesabı silme
- Harita: gerçek sokak haritası (OpenFreeMap), kümeler, bölgeler, arama, 3 harita stili
- Keşfet: 4 sıralama, kategori ve alt kategoriler, bölge filtresi
- Yer kartı: Gittim / Favori / Yol tarifi, genel bakış, yorumlar, fotoğraflar
- Yorumlar: yıldız puanı, metin, fotoğraf (galeri veya kamera), faydalı bulma, yanıtlar
- Fotoğraf vitrini: en çok beğenilen / en yeni, fotoğraf beğenme, en çok beğeni alan fotoğrafçılar
- Yer önerme: otomatik kontroller, kanıt fotoğrafı, haritada konum işaretleme, topluluk onayı, moderatör
- 20 dil

## Nasıl derleniyor
`main` dalına her gönderimde `.github/workflows/apk.yml` çalışır: Expo projesini hazırlar, Android projesini üretir,
APK'yı derler ve Releases sayfasına koyar (yaklaşık 15–25 dakika).
