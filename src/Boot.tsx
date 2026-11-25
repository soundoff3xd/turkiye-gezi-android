import React, { useEffect, useState } from 'react';
import { Appearance, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, type ThemeMode } from './theme';

/* Önce kayıtlı tema tercihini okur, renkleri ayarlar, sonra uygulamayı yükler.
   Böylece tüm ekranlar doğru renklerle (açık/koyu) oluşturulur. */
export const THEME_KEY = 'gezi-theme';
export default function Boot() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    let live = true;
    const go = (mode: ThemeMode) => {
      const dark = mode === 'dark' || (mode === 'system' && Appearance.getColorScheme() === 'dark');
      applyTheme(dark);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../App');
      if (live) setApp(() => mod.default);
    };
    AsyncStorage.getItem(THEME_KEY).then((v) => go((v as ThemeMode) || 'system')).catch(() => go('system'));
    return () => { live = false; };
  }, []);
  if (!App) return <View style={{ flex: 1, backgroundColor: Appearance.getColorScheme() === 'dark' ? '#11191C' : '#FBF8F1' }} />;
  return <App />;
}
