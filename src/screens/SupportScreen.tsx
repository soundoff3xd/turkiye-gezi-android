import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { supabase, SITE_URL } from '../lib/supabase';
import { track } from '../lib/telemetry';
import { useNav, useToast } from '../lib/ui';
import { Header, b } from '../components/common';
import { C, R } from '../theme';

/* Bize destek olun: kart bilgisi uygulamada ALINMAZ; ödeme, ödeme kuruluşunun (Shopier) güvenli sayfasında yapılır.
   Paketler veritabanındaki app_settings tablosundan gelir (support_packages JSON); bağlantı değişince uygulamayı güncellemek gerekmez.
   support_app = '0' yapılırsa uygulamada ödeme bağlantısı gösterilmez (Google Play ödeme kuralları için). */
type Pkg = { icon: string; name: string; amount: number; note: string; url: string };
const DEF: Pkg[] = [
  { icon: '☕', name: 'Çay ısmarla', amount: 50, note: 'Küçük ama çok değerli bir teşekkür', url: '' },
  { icon: '🎒', name: 'Destekçi paketi', amount: 150, note: 'Sunucu ve harita masraflarına katkı', url: '' },
  { icon: '🌟', name: 'Büyük destek', amount: 500, note: 'Yeni özelliklerin geliştirilmesine katkı', url: '' },
];
const legal = (k: string) => `${SITE_URL.replace(/\/$/, '')}/?sayfa=${k}`;

export default function SupportScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const toast = useToast();
  const [pkgs, setPkgs] = useState<Pkg[]>(DEF);
  const [cur, setCur] = useState('₺');
  const [inApp, setInApp] = useState(true);

  useEffect(() => {
    supabase.from('app_settings').select('key,value').then(({ data }) => {
      const m = Object.fromEntries(((data as any[]) || []).map((r) => [r.key, r.value]));
      if (m.support_currency) setCur(String(m.support_currency));
      if (m.support_app === '0') setInApp(false);
      try {
        const raw = m.support_packages ? JSON.parse(m.support_packages) : null;
        if (Array.isArray(raw) && raw.length) setPkgs(raw.slice(0, 6).map((p: any, i: number) => ({
          icon: String(p.icon || (DEF[i] || DEF[0]).icon).slice(0, 4), name: String(p.name || '').slice(0, 40), amount: +p.amount || 0,
          note: String(p.note || DEF.find((d) => d.name === p.name)?.note || '').slice(0, 120), url: /^https:\/\//.test(String(p.url || '')) ? String(p.url) : '',
        })).filter((p: Pkg) => p.name && p.amount > 0));
      } catch { /* bozuk ayar: varsayılanlar */ }
    }, () => {});
  }, []);
  const ready = inApp && pkgs.some((p) => p.url);
  function go(p: Pkg) {
    if (!p.url || !inApp) return;
    track('act:support_pkg');
    Linking.openURL(p.url).then(() => toast('Ödeme sayfası açılıyor')).catch(() => toast('Bir hata oluştu, lütfen tekrar dene.'));
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Bize destek olun')} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 28, color: C.accent }}>♥</Text>
        </View>
        <Text style={[b.h2, { fontSize: 26, marginTop: 12 }]} accessibilityRole="header">{t('Bize destek olun')}</Text>
        <Text style={{ color: C.ink, fontSize: 15.5, lineHeight: 23, marginTop: 8 }}>
          {t('Türkiye Gezi Rehberi bağımsız ve ücretsiz bir proje. Desteğin sunucu, harita servisi ve yeni özelliklerin masraflarını karşılamaya yardımcı olur.')}
        </Text>

        {inApp && (
          <>
            <Text style={[b.boxH, { marginTop: 18 }]}>{t('Destek paketini seç')}</Text>
            {pkgs.map((p, i) => (
              <Pressable key={i} onPress={() => go(p)} disabled={!p.url} accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, opacity: p.url ? 1 : 0.6 }}>
                <Text style={{ fontSize: 24 }}>{p.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{t(p.name)}</Text>
                  {!!p.note && <Text style={{ color: C.muted, fontSize: 13 }}>{t(p.note)}</Text>}
                </View>
                <Text style={{ fontWeight: '800', color: C.accent }}>{`${num(p.amount)} ${cur}`}</Text>
              </Pressable>
            ))}
            {!ready && <Text style={[b.fine, { color: C.accent, textAlign: 'center' }]}>{t('Kartla ödeme sayfası çok yakında burada açılacak.')}</Text>}
            <Text style={[b.fine, { textAlign: 'center' }]}>{`🔒 ${t('Ödeme güvenli ödeme sayfasında tamamlanır; bu uygulama kart bilgisi almaz.')}`}</Text>
          </>
        )}

        <View style={b.box}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>{t('Desteğin nereye gidiyor?')}</Text>
          {['Sunucu ve veritabanı', 'Harita ve uydu servisi', 'Yeni özellikler ve geliştirme'].map((x) => <Text key={x} style={b.boxT}>{`• ${t(x)}`}</Text>)}
        </View>
        <Text style={[b.fine, { textAlign: 'center', marginTop: 14 }]}>{t('Destek gönüllüdür; karşılığında ürün gönderilmez.')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 8 }}>
          {([['mesafeli', 'Mesafeli satış sözleşmesi'], ['iade', 'İptal ve iade'], ['iletisim', 'İletişim']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => Linking.openURL(legal(k)).catch(() => {})} accessibilityRole="link" hitSlop={6}>
              <Text style={{ color: C.link, fontWeight: '700', fontSize: 13 }}>{t(l)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
