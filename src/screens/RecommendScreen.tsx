import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { rankCities, planCity } from '../lib/recommend';
import { useTrip } from '../lib/trip';
import { Btn, Chip, Empty, Header, PlaceRow, b } from '../components/common';
import { GROUPS, SUBS, catName, meters } from '../data/catalog';
import { MARKER_IMAGES } from '../data/markers';
import { Dishes } from '../components/Extras';
import OfflineBox from '../components/OfflineBox';
import { CityExtras } from '../components/Extras3';
import { ilPack } from '../lib/offline';
import { C, R } from '../theme';

const img = (k: string) => (MARKER_IMAGES as Record<string, any>)[`cat_${k}`];

/* "Nereye gitmeliyim?": ne gezmek istediğini seç, sana en uygun şehirleri sıralasın */
export default function RecommendScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { places, stats } = useStore();
  const { pos, request } = useLocation();
  const { pop, push } = useNav();
  const toast = useToast();
  const [subs, setSubs] = useState<string[]>([]);
  const [near, setNear] = useState(false);
  const flip = (k: string) => setSubs((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const rows = useMemo(() => rankCities(places, stats, subs, near && pos ? pos : null).slice(0, 10), [places, stats, subs, near, pos]);

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Nereye gitmeliyim?')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={[b.h2, { fontSize: 20 }]}>{t('Ne gezmek istiyorsun?')}</Text>
        <Text style={{ color: C.muted, marginTop: 4 }}>{t('Birden fazla seçebilirsin. Seçtiğin türde en çok ve en iyi yere sahip şehirleri sıralarız.')}</Text>
        {GROUPS.map(([g, gl]) => (
          <View key={g} style={{ marginTop: 14 }}>
            <Text style={b.boxH}>{t(gl)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(SUBS).filter(([, v]) => v[0] === g).map(([k, v]) => {
                const on = subs.includes(k);
                return (
                  <Pressable key={k} onPress={() => flip(k)} style={[s.chip, on && s.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    {img(k) && <Image source={img(k)} style={{ width: 24, height: 24 }} />}
                    <Text style={[s.chipTxt, on && { color: '#FFFFFF' }]}>{t(v[1])}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Pressable onPress={() => { if (!near && !pos) { request().then(() => setNear(true)).catch((e) => toast(trError(e))); } else setNear(!near); }}
          style={[b.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} accessibilityRole="switch" accessibilityState={{ checked: near }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: C.ink }}>{`📍 ${t('Konumuma yakın olsun')}`}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{t('Yakındaki şehirler öne çıkar.')}</Text>
          </View>
          <View style={[s.sw, near && { backgroundColor: C.accent }]}><View style={[s.knob, near && { alignSelf: 'flex-end' }]} /></View>
        </Pressable>

        <Text style={[b.h2, { fontSize: 20, marginTop: 22 }]}>{t('Sana önerdiğimiz şehirler')}</Text>
        {!subs.length ? <Empty title={t('Önce yukarıdan en az bir tür seç')} />
          : !rows.length ? <Empty title={t('Bu türde yer bulunamadı.')} />
            : rows.map((r, i) => (
              <Pressable key={r.il} onPress={() => push({ name: 'city', il: r.il, subs })} style={({ pressed }) => [b.card, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={[s.rank, i === 0 && { backgroundColor: C.accent }]}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: C.ink }}>{r.il}</Text>
                    <Text style={{ color: C.muted, fontSize: 13.5 }}>
                      {[t('{1} uygun yer', num(r.matches.length)), r.avg ? `★ ${num(r.avg, 1)}` : '', r.km != null ? t('{1} km uzakta', num(Math.round(r.km))) : ''].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
                </View>
                <Text style={{ color: C.ink, marginTop: 8, lineHeight: 20 }} numberOfLines={2}>
                  {r.matches.slice(0, 4).map((p) => p.n).join(', ')}{r.matches.length > 4 ? ` ${t('ve {1} yer daha', num(r.matches.length - 4))}` : ''}
                </Text>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  );
}

/* Şehir sayfası: gün gün gezi planı ve ildeki yerler */
export function CityScreen({ il, subs }: { il: string; subs: string[] }) {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { places, stats } = useStore();
  const { pos } = useLocation();
  const { pop, push } = useNav();
  const trip = useTrip();
  const toast = useToast();
  const [days, setDays] = useState(2);
  const [day, setDay] = useState(0);
  const plan = useMemo(() => planCity(places, stats, il, subs, days, pos), [places, stats, il, subs, days, pos]);
  const cur = plan.days[Math.min(day, plan.days.length - 1)] || [];
  const all = useMemo(() => places.filter((p) => p.il === il).sort((a, b) => Number(subs.includes(b.c)) - Number(subs.includes(a.c))), [places, il, subs]);

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={il} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.muted }}>{subs.map((k) => t(catName(k))).join(' · ')}</Text>
        <Text style={[b.h2, { marginTop: 10 }]}>{t('Gezi planı')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[1, 2, 3].map((n) => <Chip key={n} label={t('{1} gün', num(n))} on={days === n} onPress={() => { setDays(n); setDay(0); }} />)}
        </View>
        {plan.days.length < days && <Text style={b.fine}>{t('Bu ilde şimdilik {1} yer var; plan buna göre kısaltıldı.', num(plan.total))}</Text>}
        {plan.days.length > 1 && (
          <View style={{ flexDirection: 'row', marginTop: 12, borderBottomWidth: 1, borderBottomColor: C.line }} accessibilityRole="tablist">
            {plan.days.map((_, i) => (
              <Pressable key={i} onPress={() => setDay(i)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 3, borderBottomColor: day === i ? C.accent : 'transparent', marginBottom: -1 }} accessibilityRole="tab" accessibilityState={{ selected: day === i }}>
                <Text style={{ fontWeight: '800', color: day === i ? C.ink : C.muted }}>{t('{1}. gün', num(i + 1))}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ marginTop: 8 }}>
          {cur.map((p, i) => (
            <Pressable key={p.id} onPress={() => push({ name: 'place', id: p.id })} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }} accessibilityRole="button">
              <View style={{ alignItems: 'center' }}>
                <Text style={s.rank}>{i + 1}</Text>
                {i < cur.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: C.chipLine, marginTop: 4 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 6 }}>
                <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{p.n}</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{`${t(catName(p.c))}${i > 0 ? ` · ${t('önceki duraktan ~{1} km', num(Math.max(1, Math.round(meters(cur[i - 1].lat, cur[i - 1].lng, p.lat, p.lng) / 1000))))}` : ''}`}</Text>
              </View>
            </Pressable>
          ))}
        </View>
        {cur.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Btn label={`＋ ${t('Gezi listeme ekle')}`} onPress={() => { const n = trip.addMany(cur.map((p) => p.id)); toast(n ? 'Gezi listene {1} yer eklendi' : 'Bu yerler zaten gezi listende', n); }} style={{ flex: 1 }} small />
            <Btn kind="pri" label={`🧭 ${t('Rotayı göster')}`} onPress={() => push({ name: 'route', ids: cur.map((p) => p.id) })} style={{ flex: 1 }} small />
          </View>
        )}
        <Text style={b.fine}>{t('Plan, yerleri birbirine en yakın sırayla dizer. Açılış saatlerini gitmeden önce kontrol et.')}</Text>
        <Dishes il={il} />
        <CityExtras il={il} />
        <OfflineBox pts={all} name={ilPack(il)} doneText="Bu ilin haritası telefonuna indirildi. İnternet olmadan da açılır." introText="Bu ilin tamamının haritasını telefonuna indir; dağda, köyde, internetin çekmediği yerde de harita açılır." />

        <Text style={[b.h2, { marginTop: 22, marginBottom: 6 }]}>{t('{1} içindeki tüm yerler ({2})', il, num(all.length))}</Text>
        <View style={{ marginHorizontal: -16 }}>
          {all.slice(0, 40).map((p) => <PlaceRow key={p.id} p={p} onPress={() => push({ name: 'place', id: p.id })} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: R.pill, paddingLeft: 6, paddingRight: 13, paddingVertical: 6, borderWidth: 1, borderColor: C.chipLine },
  chipOn: { backgroundColor: C.solid, borderColor: C.solid },
  chipTxt: { color: C.ink, fontSize: 14, fontWeight: '600' },
  rank: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.solid, color: '#FFFFFF', textAlign: 'center', lineHeight: 28, fontWeight: '800', overflow: 'hidden' },
  sw: { width: 42, height: 24, borderRadius: 12, backgroundColor: C.chipLine, padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
});
