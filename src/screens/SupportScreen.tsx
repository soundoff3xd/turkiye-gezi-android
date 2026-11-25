import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { supabase } from '../lib/supabase';
import { useNav, useToast } from '../lib/ui';
import { Btn, Chip, Header, b } from '../components/common';
import { C, R } from '../theme';

/* Bize destek olun: kart bilgisi uygulamada ALINMAZ; ödeme, lisanslı ödeme kuruluşunun güvenli sayfasında yapılır.
   Ödeme bağlantısı veritabanındaki app_settings tablosundan gelir (support_url, support_monthly_url);
   bağlantı değişince uygulamayı güncellemek gerekmez. Adreste {amount} geçerse seçilen tutarla değiştirilir. */
type Cfg = { url: string; monthlyUrl: string; currency: string; amounts: number[] };
const DEFAULT: Cfg = { url: '', monthlyUrl: '', currency: '₺', amounts: [50, 100, 250, 500] };

export default function SupportScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const toast = useToast();
  const [cfg, setCfg] = useState<Cfg>(DEFAULT);
  const [freq, setFreq] = useState<'once' | 'monthly'>('once');
  const [amount, setAmount] = useState<number | 'custom'>(100);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    supabase.from('app_settings').select('key,value').then(({ data }) => {
      const m = Object.fromEntries(((data as any[]) || []).map((r) => [r.key, r.value]));
      const amounts = String(m.support_amounts || '').split(',').map(Number).filter((n) => n > 0);
      setCfg({ url: m.support_url || '', monthlyUrl: m.support_monthly_url || '', currency: m.support_currency || '₺', amounts: amounts.length ? amounts : DEFAULT.amounts });
    }, () => {});
  }, []);

  const value = amount === 'custom' ? Math.max(0, Math.round(+custom || 0)) : amount;
  const base = freq === 'monthly' && cfg.monthlyUrl ? cfg.monthlyUrl : cfg.url;

  function go() {
    if (!value || !base) return;
    Linking.openURL(base.replace('{amount}', String(value))).then(() => toast('Ödeme sayfası açılıyor')).catch(() => toast('Bir hata oluştu, lütfen tekrar dene.'));
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Bize destek olun')} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 28, color: C.accent }}>♥</Text>
        </View>
        <Text style={[b.h2, { fontSize: 26, marginTop: 12 }]} accessibilityRole="header">{t('Bize destek olun')}</Text>
        <Text style={{ color: C.ink, fontSize: 15.5, lineHeight: 23, marginTop: 8 }}>
          {t('Türkiye Gezi Rehberi bağımsız ve ücretsiz bir proje. Desteğin sunucu, harita servisi ve yeni özelliklerin masraflarını karşılamaya yardımcı olur.')}
        </Text>

        <View style={{ flexDirection: 'row', backgroundColor: C.line, borderRadius: R.md, padding: 4, marginTop: 18 }} accessibilityRole="tablist">
          {(['once', 'monthly'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFreq(f)} style={{ flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center', backgroundColor: freq === f ? C.surface : 'transparent' }}
              accessibilityRole="tab" accessibilityState={{ selected: freq === f }}>
              <Text style={{ fontWeight: '700', color: freq === f ? C.ink : C.muted }}>{f === 'once' ? t('Tek seferlik') : t('Aylık')}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[b.boxH, { marginTop: 16 }]}>{t('Tutar')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cfg.amounts.map((v) => <Chip key={v} label={`${num(v)} ${cfg.currency}`} on={amount === v} onPress={() => setAmount(v)} />)}
          <Chip label={t('Diğer tutar')} on={amount === 'custom'} onPress={() => setAmount('custom')} />
        </View>
        {amount === 'custom' && (
          <TextInput value={custom} onChangeText={(v) => setCustom(v.replace(/[^\d]/g, '').slice(0, 6))} keyboardType="number-pad" placeholder={t('Tutar gir')} placeholderTextColor={C.muted}
            accessibilityLabel={t('Diğer tutar')} autoFocus
            style={{ marginTop: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: C.ink }} />
        )}

        <View style={[b.box, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
          <Text style={{ fontSize: 24 }}>💳</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: C.ink }}>{t('Kredi veya banka kartıyla öde')}</Text>
            <Text style={{ color: C.muted, fontSize: 13.5 }}>{t('Ödeme sayfasında kart bilgilerini girersin')}</Text>
          </View>
        </View>

        <Btn kind="pri" style={{ marginTop: 16 }} disabled={!value || !base} onPress={go}
          label={value ? t('{1} ₺ ile destek ol', num(value)).replace('₺', cfg.currency) : t('Bir tutar seç')} />
        {!base && <Text style={[b.fine, { color: C.accent, textAlign: 'center' }]}>{t('Kartla ödeme sayfası çok yakında burada açılacak.')}</Text>}
        <Text style={[b.fine, { textAlign: 'center' }]}>{`🔒 ${t('Ödeme güvenli ödeme sayfasında tamamlanır; bu uygulama kart bilgisi almaz.')}`}</Text>

        <View style={b.box}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>{t('Desteğin nereye gidiyor?')}</Text>
          {['Sunucu ve veritabanı', 'Harita ve uydu servisi', 'Yeni özellikler ve geliştirme'].map((x) => <Text key={x} style={b.boxT}>{`• ${t(x)}`}</Text>)}
        </View>
      </ScrollView>
    </View>
  );
}
