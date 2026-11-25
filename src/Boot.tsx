import React, { useEffect, useState } from 'react';
import { Appearance, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyThemeCfg, buildPalette, type ThemeCfg, type ThemeMode } from './theme';
import { setupFonts } from './lib/fonts';

/* Önce kayıtlı tema tercihini okur, renkleri ve yazı tipini ayarlar, sonra uygulamayı yükler.
   Böylece tüm ekranlar doğru renklerle oluşturulur. */
export const THEME_KEY = 'gezi-theme';        // eski: yalnızca system/light/dark
export const THEME_CFG_KEY = 'gezi-theme2';   // yeni: hazır tema / kendi rengin / yazı tipi / boyut
export async function readThemeCfg(): Promise<ThemeCfg> {
  try {
    const v = await AsyncStorage.getItem(THEME_CFG_KEY);
    if (v) { const c = JSON.parse(v); if (c && typeof c.preset === 'string') return c; }
    const old = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
    return { preset: old || 'system' };
  } catch { return { preset: 'system' }; }
}
export async function saveThemeCfg(c: ThemeCfg) {
  try { await AsyncStorage.setItem(THEME_CFG_KEY, JSON.stringify(c)); } catch { /* */ }
}
export default function Boot() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  const [bg, setBg] = useState(Appearance.getColorScheme() === 'dark' ? '#11191C' : '#FBF8F1');
  useEffect(() => {
    let live = true;
    readThemeCfg().then(async (cfg) => {
      const sysDark = Appearance.getColorScheme() === 'dark';
      applyThemeCfg(cfg, sysDark);
      if (live) setBg(buildPalette(cfg, sysDark).palette.bg);
      await setupFonts(cfg.font || 'system', cfg.size || 1);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../App');
      if (live) setApp(() => mod.default);
    });
    return () => { live = false; };
  }, []);
  if (!App) return <View style={{ flex: 1, backgroundColor: bg }} />;
  return <App />;
}
