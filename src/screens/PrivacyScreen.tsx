import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useNav } from '../lib/ui';
import { Header, b } from '../components/common';
import { PRIVACY, PRIVACY_DATE } from '../data/privacy';
import { C } from '../theme';

/* Gizlilik ve KVKK */
export default function PrivacyScreen({ onClose }: { onClose?: () => void }) {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  let date = PRIVACY_DATE;
  try { date = new Date(PRIVACY_DATE + 'T12:00:00').toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }); } catch { /* */ }
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={onClose || (() => nav?.pop())} title={t('Gizlilik ve KVKK')} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.ink, fontSize: 16, lineHeight: 23 }}>{t('Türkiye Gezi Rehberi’ni kullanırken bilgilerinin nasıl işlendiğini burada sade bir dille anlatıyoruz.')}</Text>
        {PRIVACY.map(([h, p]) => (
          <View key={h} style={{ marginTop: 18 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }} accessibilityRole="header">{t(h)}</Text>
            <Text style={{ color: C.ink, fontSize: 15, lineHeight: 22, marginTop: 6 }}>{t(p)}</Text>
          </View>
        ))}
        <Text style={b.fine}>{t('Son güncelleme: {1}', date)}</Text>
      </ScrollView>
    </View>
  );
}
