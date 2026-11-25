import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useNav, useToast } from '../lib/ui';
import { track } from '../lib/telemetry';
import { Btn, Header, b } from '../components/common';
import { PROVINCES } from '../data/catalog';
import shapes from '../data/prov_shapes.json';
import { C, R } from '../theme';

/* il sınırları (OpenStreetMap verisinden sadeleştirildi) → SVG yolları; enlem 39°'de eşit alanlı görünüm */
const W = 1000, LNG0 = 25.6, LAT1 = 42.2, K = W / ((44.9 - LNG0) * Math.cos((39 * Math.PI) / 180));
const H = Math.round((LAT1 - 35.8) * K);
const SH = shapes as unknown as Record<string, number[][]>;
export const PATHS: [string, string][] = Object.entries(SH).map(([il, rings]) => [il, rings.map((r) => {
  let d = '';
  for (let i = 0; i < r.length; i += 2) d += `${i ? 'L' : 'M'}${(((r[i] - LNG0) * K * Math.cos((39 * Math.PI) / 180))).toFixed(1)} ${((LAT1 - r[i + 1]) * K).toFixed(1)}`;
  return d + 'Z';
}).join('')]);

/* "Türkiye haritamı boya": gittiğin yerlerin illeri renklenir, görsel olarak paylaşılır */
export default function PaintScreen() {
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { visited, byId } = useStore();
  const { pop, push } = useNav();
  const toast = useToast();
  const card = useRef<any>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const per = useMemo(() => {
    const m: Record<string, number> = {};
    visited.forEach((id) => { const p = byId(id); if (p) m[p.il] = (m[p.il] || 0) + 1; });
    return m;
  }, [visited, byId]);
  const done = Object.keys(per).length, total = PROVINCES.length;
  const max = Math.max(1, ...Object.values(per));
  const fill = (il: string) => {
    const n = per[il]; if (!n) return C.line;
    return `rgba(${C.accentRgb},${(0.45 + 0.55 * Math.min(1, n / Math.max(3, max))).toFixed(2)})`;
  };
  const mapW = Math.min(width, 640) - 32;

  async function share() {
    setBusy(true); track('act:paint_share');
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('Türkiye haritam') });
      else throw new Error('no-share');
    } catch {
      try { await Share.share({ message: `${t('Türkiye haritam')}: ${t('{1} / {2} il', num(done), num(total))} 🇹🇷` }); } catch { toast('Bir hata oluştu, lütfen tekrar dene.'); }
    } finally { setBusy(false); }
  }

  const visitedIl = Object.entries(per).sort((a, b2) => b2[1] - a[1]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header onBack={pop} title={t('Türkiye haritam')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <View ref={card} collapsable={false} style={{ backgroundColor: C.surface, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line }}>
          <Text style={{ color: C.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 }}>{t('Türkiye haritam').toLocaleUpperCase(lang)}</Text>
          <Text style={{ color: C.ink, fontWeight: '900', fontSize: 30, marginTop: 2 }}>{t('{1} / {2} il', num(done), num(total))}</Text>
          <Text style={{ color: C.muted, marginTop: 2 }}>{`${t('{1} yer gezildi', num(visited.size))} · ${t('Türkiye’nin %{1} kadarı', num(Math.round((done / total) * 100)))}`}</Text>
          <Svg width={mapW} height={(mapW * H) / W} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 12 }}>
            {PATHS.map(([il, d]) => (
              <Path key={il} d={d} fill={pick === il ? C.solid : fill(il)} stroke={C.surface} strokeWidth={1.6} strokeLinejoin="round" onPress={() => setPick(pick === il ? null : il)} />
            ))}
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: C.muted, fontSize: 11 }}>{t('Türkiye Gezi Rehberi')}</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>© OpenStreetMap</Text>
          </View>
        </View>
        {pick ? (
          <View style={b.box}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{pick}</Text>
            <Text style={{ color: C.muted, marginTop: 2 }}>{per[pick] ? t('{1} yer gezildi', num(per[pick])) : t('Henüz bu ilde bir yere gitmedin.')}</Text>
            <Btn small label={t('İldeki yerleri gör')} onPress={() => push({ name: 'city', il: pick, subs: [] })} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
          </View>
        ) : <Text style={b.fine}>{t('Bir ile dokunarak ayrıntısını gör.')}</Text>}
        <Btn kind="pri" label={`↗ ${t('Haritamı paylaş')}`} onPress={share} busy={busy} style={{ marginTop: 14 }} />
        {visitedIl.length > 0 ? (
          <View style={b.box}>
            <Text style={b.boxH}>{t('Gezdiğin iller')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {visitedIl.map(([il, n]) => (
                <Pressable key={il} onPress={() => setPick(il)} style={{ backgroundColor: C.soft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 }} accessibilityRole="button">
                  <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{`${il} · ${num(n)}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : <Text style={[b.fine, { textAlign: 'center' }]}>{t('Bir yerin sayfasında “Gittim mi?” düğmesine bastıkça iller burada renklenir.')}</Text>}
      </ScrollView>
    </View>
  );
}
