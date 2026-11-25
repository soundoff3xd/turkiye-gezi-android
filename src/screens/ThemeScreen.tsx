import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useT } from '../i18n';
import { useNav, useToast } from '../lib/ui';
import { Header } from '../components/common';
import { THEME_KEY } from '../Boot';
import { C, type ThemeMode } from '../theme';

/* Görünüm: telefonun ayarı / açık / koyu. Renkler açılışta ayarlandığı için değişiklik yeniden açınca uygulanır. */
const OPTS: [ThemeMode, string, string][] = [['system', '📱', 'Telefonun ayarı'], ['light', '☀️', 'Açık'], ['dark', '🌙', 'Koyu']];
export default function ThemeScreen() {
  const { t } = useT();
  const { pop } = useNav();
  const toast = useToast();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [start, setStart] = useState<ThemeMode | null>(null);
  useEffect(() => { AsyncStorage.getItem(THEME_KEY).then((v) => { const m = (v as ThemeMode) || 'system'; setMode(m); setStart(m); }).catch(() => setStart('system')); }, []);
  const pick = (m: ThemeMode) => {
    setMode(m); AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
    if (m !== start) toast('Tema, uygulamayı kapatıp açtığında değişir.');
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header onBack={pop} title={t('Görünüm')} />
      {OPTS.map(([k, icon, label]) => (
        <Pressable key={k} onPress={() => pick(k)} accessibilityRole="radio" accessibilityState={{ checked: mode === k }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: pressed ? C.line : C.bg })}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <Text style={{ flex: 1, fontSize: 16.5, color: C.ink, fontWeight: mode === k ? '800' : '500' }}>{t(label)}</Text>
          {mode === k && <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>✓</Text>}
        </Pressable>
      ))}
      <Text style={{ color: C.muted, padding: 20, lineHeight: 20 }}>{t('Tema, uygulamayı kapatıp açtığında değişir.')}</Text>
    </View>
  );
}
