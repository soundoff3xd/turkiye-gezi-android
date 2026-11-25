import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGS, useT } from '../i18n';
import { INTERESTS, usePrefs } from '../lib/prefs';
import { useNav, useToast } from '../lib/ui';
import { Btn, Header } from '../components/common';
import { C, R } from '../theme';

/* İlgi alanı kutucukları: ilk açılışta ve Profil → İlgi alanlarım ekranında aynı */
export function InterestGrid({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useT();
  const flip = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <View style={s.grid}>
      {INTERESTS.map(([k, icon, label]) => {
        const on = value.includes(k);
        return (
          <Pressable key={k} onPress={() => flip(k)} style={[s.tile, on && s.tileOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
            <Text style={{ fontSize: 30 }}>{icon}</Text>
            <Text style={[s.tileTxt, on && { color: '#FFFFFF' }]} numberOfLines={2}>{t(label)}</Text>
            {on && <View style={s.tick}><Text style={{ color: C.ink, fontWeight: '900', fontSize: 13 }}>✓</Text></View>}
          </Pressable>
        );
      })}
    </View>
  );
}

/* Uygulama ilk açıldığında: 1) dil  2) nelerden hoşlanırsın. Her adımda "Atla" var. */
export default function OnboardingScreen() {
  const { t, lang, setLang } = useT();
  const insets = useSafeAreaInsets();
  const { finish } = usePrefs();
  const [step, setStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<string[]>([]);

  return (
    <View style={{ flex: 1, backgroundColor: C.screen, paddingTop: insets.top + 8 }}>
      <View style={s.top}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0, 1].map((i) => <View key={i} style={[s.dot, step === i && s.dotOn]} />)}
        </View>
        <Pressable onPress={() => (step === 0 ? setStep(1) : finish([]))} hitSlop={12} accessibilityRole="button">
          <Text style={s.skip}>{t('Atla')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        {step === 0 ? (
          <>
            <Text style={s.kicker}>{t('Türkiye Gezi Rehberi')}</Text>
            <Text style={s.h1}>{t('Hoş geldin!')}</Text>
            <Text style={s.lead}>{t('Uygulamayı hangi dilde kullanmak istersin?')}</Text>
            <View style={s.grid}>
              {Object.entries(LANGS).map(([k, name]) => (
                <Pressable key={k} onPress={() => setLang(k)} style={[s.lang, lang === k && s.tileOn]} accessibilityRole="radio" accessibilityState={{ checked: lang === k }}>
                  <Text style={[s.langTxt, lang === k && { color: '#FFFFFF' }]} numberOfLines={1}>{name}</Text>
                  {lang === k && <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={s.h1}>{t('Nelerden hoşlanırsın?')}</Text>
            <Text style={s.lead}>{t('Sana uygun yerleri öne çıkaralım. Birden fazla seçebilirsin.')}</Text>
            <InterestGrid value={picked} onChange={setPicked} />
            <Text style={s.fine}>{t('Bunu daha sonra hesap menüsündeki “İlgi alanlarım” bölümünden değiştirebilirsin.')}</Text>
          </>
        )}
      </ScrollView>

      <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
        {step === 1 && <Btn label={t('Geri')} onPress={() => setStep(0)} style={{ flex: 1 }} />}
        <Btn label={step === 0 ? t('Devam') : picked.length ? t('Başla') : t('Seçmeden devam et')} kind="pri"
          onPress={() => (step === 0 ? setStep(1) : finish(picked))} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

/* Profil → İlgi alanlarım */
export function InterestsScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { interests, setInterests } = usePrefs();
  const { pop } = useNav();
  const toast = useToast();
  const [picked, setPicked] = useState<string[]>(interests);
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('İlgi alanlarım')} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.lead}>{t('Sana uygun yerleri öne çıkaralım. Birden fazla seçebilirsin.')}</Text>
        <InterestGrid value={picked} onChange={setPicked} />
        <Text style={s.fine}>{t('Seçtiklerin “Senin için” kategorisinde listelenir.')}</Text>
      </ScrollView>
      <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
        <Btn label={t('Kaydet')} kind="pri" onPress={() => { setInterests(picked); toast('İlgi alanların kaydedildi'); pop(); }} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.chipLine },
  dotOn: { width: 22, backgroundColor: C.accent },
  skip: { color: C.muted, fontSize: 15.5, fontWeight: '700' },
  kicker: { color: C.accent, fontWeight: '800', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8 },
  h1: { fontSize: 30, fontWeight: '900', color: C.ink, marginTop: 6 },
  lead: { color: C.muted, fontSize: 16, lineHeight: 22, marginTop: 6, marginBottom: 18 },
  fine: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.4%', minHeight: 112, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
  tileOn: { backgroundColor: C.solid, borderColor: C.solid },
  tileTxt: { fontWeight: '800', fontSize: 15, color: C.ink, textAlign: 'center' },
  tick: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  lang: { width: '48.4%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, paddingVertical: 14, paddingHorizontal: 14 },
  langTxt: { fontSize: 15.5, fontWeight: '700', color: C.ink, flexShrink: 1 },
  foot: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: C.bg },
});
