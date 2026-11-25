import React, { useEffect, useMemo, useState } from 'react';
import { Appearance, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useNav, useToast } from '../lib/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { track } from '../lib/telemetry';
import { Btn, Header, b } from '../components/common';
import { readThemeCfg, saveThemeCfg } from '../Boot';
import { FONT_NAMES, loadPreviewFonts } from '../lib/fonts';
import { C, PRESETS, R, SWATCHES, TINTS, buildPalette, isHex, lum, safeAccent, type FontKey, type ThemeCfg } from '../theme';

const SIZES: [number, string][] = [[0.9, 'Küçük'], [1, 'Normal'], [1.12, 'Büyük'], [1.25, 'Çok büyük']];

/* küçük renk/degrade karesi */
function Swatch({ a, b2, size = 44, radius = 12 }: { a: string; b2?: string; size?: number; radius?: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs><LinearGradient id={`s${a}${b2}`} x1="0" y1="0" x2="0.4" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b2 || a} /></LinearGradient></Defs>
      <Rect x="0" y="0" width={size} height={size} rx={radius} fill={`url(#s${a}${b2})`} />
    </Svg>
  );
}

/* Görünüm: hazır temalar (düz ve degrade), kendi rengin, yazı tipi ve boyutu. Seçim hesaba da kaydedilir. */
export default function ThemeScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const toast = useToast();
  const { me } = useAuth();
  const [cfg, setCfg] = useState<ThemeCfg | null>(null);
  const [start, setStart] = useState('');
  const [hexIn, setHexIn] = useState('');
  useEffect(() => { readThemeCfg().then((c) => { setCfg(c); setStart(JSON.stringify(c)); setHexIn(c.accent || ''); }); loadPreviewFonts(); }, []);
  const sysDark = Appearance.getColorScheme() === 'dark';
  const prev = useMemo(() => (cfg ? buildPalette(cfg, sysDark).palette : null), [cfg, sysDark]);
  if (!cfg || !prev) return <View style={{ flex: 1, backgroundColor: C.screen }}><Header onBack={pop} title={t('Görünüm')} /></View>;
  const set = (p: Partial<ThemeCfg>) => setCfg({ ...cfg, ...p });
  const custom = cfg.preset === 'custom';
  const toCustom = (p: Partial<ThemeCfg>) => set({ preset: 'custom', base: cfg.base || (buildPalette(cfg, sysDark).dark ? 'dark' : 'light'), accent: cfg.accent || prev.accent, tint: cfg.tint, grad: cfg.grad, ...p });
  const changed = JSON.stringify(cfg) !== start;

  async function save() {
    if (!cfg) return;
    await saveThemeCfg(cfg);
    track('act:theme_' + cfg.preset);
    if (me) supabase.from('profiles').update({ theme: cfg }).eq('id', me.id).then(() => {}, () => {});
    setStart(JSON.stringify(cfg));
    toast('Tema kaydedildi. Uygulamayı kapatıp açınca uygulanır.');
  }
  const grad = prev.grad ? prev.grad.split(',') : null;
  const fam = (k: FontKey) => FONT_NAMES.find((f) => f[0] === k)?.[2] || undefined;
  const sz = cfg.size || 1;

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Görünüm')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* önizleme: seçilen renklerle örnek bir yer kartı */}
        <Text style={b.boxH}>{t('Önizleme')}</Text>
        <View style={{ borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
          <View style={{ backgroundColor: prev.bg, padding: 14 }}>
            {grad && <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}><Swatch a={grad[0]} b2={grad[1]} size={1000} radius={0} /></View>}
            <View style={{ backgroundColor: prev.surface, borderRadius: R.md, padding: 14, borderWidth: 1, borderColor: prev.line }}>
              <Text style={{ color: prev.accent, fontSize: 11 * sz, fontWeight: '800', letterSpacing: 0.6, fontFamily: fam(cfg.font || 'system') }}>NEVŞEHİR · {t('Kanyon ve vadi').toLocaleUpperCase()}</Text>
              <Text style={{ color: prev.ink, fontSize: 22 * sz, fontWeight: '800', marginTop: 2, fontFamily: fam(cfg.font || 'system') }}>Göreme</Text>
              <Text style={{ color: prev.muted, fontSize: 13.5 * sz, marginTop: 4 }}>★ 4,8 · {t('{1} kişi gitti', '1.204')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1, backgroundColor: prev.solid, borderRadius: R.pill, paddingVertical: 9, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 * sz }}>✓ {t('Gittim')}</Text></View>
                <View style={{ flex: 1, backgroundColor: prev.accent, borderRadius: R.pill, paddingVertical: 9, alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 * sz }}>{t('Yol tarifi')}</Text></View>
              </View>
            </View>
          </View>
        </View>

        <Text style={[b.h2, { fontSize: 18, marginTop: 22 }]}>{t('Hazır temalar')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {PRESETS.map((p) => {
            const pal = buildPalette({ preset: p.id }, sysDark).palette, g = pal.grad ? pal.grad.split(',') : [pal.bg, pal.bg];
            const on = cfg.preset === p.id;
            return (
              <Pressable key={p.id} onPress={() => set({ preset: p.id, accent: undefined, tint: undefined, grad: undefined, base: undefined })} style={{ width: '30.8%', alignItems: 'center', padding: 8, borderRadius: R.md, borderWidth: 2, borderColor: on ? C.accent : 'transparent', backgroundColor: on ? C.soft : 'transparent' }}
                accessibilityRole="radio" accessibilityState={{ checked: on }}>
                <View><Swatch a={g[0]} b2={g[1]} size={54} /><View style={{ position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: pal.accent, borderWidth: 2, borderColor: C.surface }} /></View>
                <Text style={{ color: C.ink, fontSize: 12.5, fontWeight: on ? '800' : '600', marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{t(p.name)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[b.h2, { fontSize: 18, marginTop: 24 }]}>{t('Kendi temanı oluştur')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {(['light', 'dark'] as const).map((k) => (
            <Btn key={k} small label={k === 'light' ? `☀️ ${t('Açık tema')}` : `🌙 ${t('Koyu tema')}`} kind={custom && cfg.base === k ? 'on' : 'out'} onPress={() => toCustom({ base: k })} style={{ flex: 1 }} />
          ))}
        </View>
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Vurgu rengi')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SWATCHES.map((c) => (
            <Pressable key={c} onPress={() => { toCustom({ accent: c }); setHexIn(c); }} accessibilityRole="radio" accessibilityState={{ checked: custom && cfg.accent === c }} accessibilityLabel={c}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c, borderWidth: 3, borderColor: custom && cfg.accent === c ? C.ink : 'transparent' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <TextInput value={hexIn} onChangeText={setHexIn} placeholder="#3B82F6" placeholderTextColor={C.muted} autoCapitalize="characters" maxLength={7}
            style={{ flex: 1, height: 44, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, color: C.ink, backgroundColor: C.surface }} />
          <Btn small label={t('Uygula')} disabled={!isHex(hexIn)} onPress={() => {
            const c = (hexIn.startsWith('#') ? hexIn : '#' + hexIn).toUpperCase(), safe = safeAccent(c, (cfg.base || 'light') === 'dark');
            toCustom({ accent: c }); if (safe !== c) toast('Yazılar okunsun diye renk biraz koyulaştırıldı.');
          }} />
        </View>
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Arka plan tonu')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TINTS.map((c) => (
            <Pressable key={c} onPress={() => toCustom({ tint: c, base: lum(c) < 0.2 ? 'dark' : 'light' })} accessibilityRole="radio" accessibilityState={{ checked: custom && cfg.tint === c }} accessibilityLabel={c}
              style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c, borderWidth: 3, borderColor: custom && cfg.tint === c ? C.accent : C.chipLine }} />
          ))}
        </View>
        <View style={[b.box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700' }}>{t('Degrade arka plan')}</Text><Text style={{ color: C.muted, fontSize: 12.5 }}>{t('Arka plan tonundan vurgu rengine geçiş')}</Text></View>
          <Switch value={!!(custom && cfg.grad)} onValueChange={(v) => toCustom({ grad: v, tint: cfg.tint || ((cfg.base || 'light') === 'dark' ? TINTS[8] : TINTS[3]) })} trackColor={{ true: C.accent }} />
        </View>

        <Text style={[b.h2, { fontSize: 18, marginTop: 24 }]}>{t('Yazı tipi')}</Text>
        <View style={{ marginTop: 6 }}>
          {FONT_NAMES.map(([k, name, f]) => {
            const on = (cfg.font || 'system') === k;
            return (
              <Pressable key={k} onPress={() => set({ font: k })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Text style={{ flex: 1, color: C.ink, fontSize: 17, fontFamily: f || undefined, fontWeight: f ? 'normal' : '700' }}>{`${t(name)} · Aa Çç Ğğ`}</Text>
                {on && <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>✓</Text>}
              </Pressable>
            );
          })}
        </View>
        <Text style={[b.h2, { fontSize: 18, marginTop: 24 }]}>{t('Yazı boyutu')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {SIZES.map(([v, l]) => <Btn key={v} small label={t(l)} kind={sz === v ? 'on' : 'out'} onPress={() => set({ size: v })} style={{ flexGrow: 1 }} />)}
        </View>

        <Btn kind="pri" label={t('Kaydet')} disabled={!changed} onPress={save} style={{ marginTop: 24 }} />
        <Text style={b.fine}>{t('Tema, uygulamayı kapatıp açtığında değişir.')} {me ? t('Seçimin hesabına da kaydedilir; sitede ve diğer telefonlarında da aynı görünür.') : ''}</Text>
      </ScrollView>
    </View>
  );
}
