import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { Btn, Header, b } from './common';
import { PlaceThumb } from './Extras';
import { supabase } from '../lib/supabase';
import { sunTimes, trClock } from '../lib/sun';
import { useStore } from '../lib/store';
import { useTrip } from '../lib/trip';
import { useNav, useToast } from '../lib/ui';
import { track } from '../lib/telemetry';
import type { Place } from '../data/catalog';
import ROUTES from '../data/routes.json';
import PHRASES from '../data/phrases.json';
import { C, R } from '../theme';

/* ---------- sesli anlatım: yerin açıklamasını seçili dilde okur ---------- */
export function SpeakButton({ text, lang }: { text: string; lang?: string }) {
  const { t, lang: ui } = useT();
  const [on, setOn] = useState(false);
  useEffect(() => () => { Speech.stop(); }, []);
  useEffect(() => { Speech.stop(); setOn(false); }, [text]);
  function toggle() {
    if (on) { Speech.stop(); setOn(false); return; }
    Speech.stop(); setOn(true); track('act:speak');
    Speech.speak(text, { language: lang || ui, rate: 0.95, onDone: () => setOn(false), onStopped: () => setOn(false), onError: () => setOn(false) });
  }
  if (!text) return null;
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ selected: on }} hitSlop={6}
      style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: R.pill, borderWidth: 1, borderColor: on ? C.accent : C.chipLine, backgroundColor: on ? C.soft : 'transparent' }}>
      <Text style={{ fontSize: 15 }}>{on ? '⏹' : '🔊'}</Text>
      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13.5 }}>{t(on ? 'Durdur' : 'Sesli dinle')}</Text>
    </Pressable>
  );
}

/* ---------- gün doğumu / batımı ---------- */
export function SunBox({ p }: { p: Place }) {
  const { t } = useT();
  const s = sunTimes(p.lat, p.lng);
  return (
    <View style={b.box}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Text style={b.boxH}>{`🌅 ${t('Gün doğumu')}`}</Text><Text style={{ color: C.ink, fontSize: 20, fontWeight: '800' }}>{trClock(s.rise)}</Text></View>
        <View style={{ flex: 1 }}><Text style={b.boxH}>{`🌇 ${t('Gün batımı')}`}</Text><Text style={{ color: C.ink, fontSize: 20, fontWeight: '800' }}>{trClock(s.set)}</Text></View>
      </View>
      <Text style={[b.fine, { marginTop: 4 }]}>{t('Bugün, Türkiye saati')}</Text>
    </View>
  );
}

/* ---------- yakındaki ihtiyaçlar (OpenStreetMap) ---------- */
type Need = { n: string; lat: number; lng: number; d: number; fee?: number; h?: number };
const NEEDS: [string, string, string][] = [['ecz', '💊', 'Eczane'], ['atm', '🏧', 'ATM'], ['fuel', '⛽', 'Benzinlik'], ['wc', '🚻', 'Tuvalet'], ['park', '🅿', 'Otopark']];
export function NeedsBox({ p }: { p: Place }) {
  const { t, num } = useT();
  const [by, setBy] = useState<Record<string, Need[]> | null>(null);
  const [err, setErr] = useState(false);
  const [k, setK] = useState('ecz');
  useEffect(() => {
    let live = true; setBy(null); setErr(false);
    supabase.functions.invoke('needs', { body: { place_id: p.id } })
      .then((r: any) => { if (!live) return; if (r.error || !r.data?.by) setErr(true); else setBy(r.data.by); })
      .catch(() => live && setErr(true));
    return () => { live = false; };
  }, [p.id]);
  if (err) return null;
  const list = by?.[k] || [];
  const open = (x: Need, label: string) => Linking.openURL(`geo:${x.lat},${x.lng}?q=${x.lat},${x.lng}(${encodeURIComponent(x.n || label)})`)
    .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`).catch(() => {}));
  const label = t(NEEDS.find((x) => x[0] === k)![2]);
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🧭 ${t('Yakındaki ihtiyaçlar')}`}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
        {NEEDS.map(([key, ic, l]) => {
          const n = by?.[key]?.length || 0;
          return (
            <Pressable key={key} onPress={() => setK(key)} accessibilityRole="button" accessibilityState={{ selected: k === key }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, borderWidth: 1, borderColor: k === key ? C.accent : C.chipLine, backgroundColor: k === key ? C.soft : 'transparent', opacity: by && !n ? 0.5 : 1 }}>
              <Text>{ic}</Text><Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{t(l)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!by ? <Text style={{ color: C.muted, marginTop: 6 }}>{t('Yükleniyor…')}</Text>
        : !list.length ? <Text style={{ color: C.muted, marginTop: 6 }}>{t('Yakında bulunamadı (2 km).')}</Text>
          : list.map((x, i) => (
            <Pressable key={i} onPress={() => open(x, label)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.ink, fontWeight: '700' }} numberOfLines={1}>{x.n || label}</Text>
                {(x.h === 1 || x.fee !== undefined) && <Text style={{ color: C.muted, fontSize: 12.5 }}>{[x.h === 1 ? t('7/24 açık') : '', x.fee === 1 ? t('Ücretli') : x.fee === 0 ? t('Ücretsiz') : ''].filter(Boolean).join(' · ')}</Text>}
              </View>
              <Text style={{ color: C.muted, fontSize: 12.5 }}>{x.d < 1000 ? `${num(x.d)} m` : `${num(x.d / 1000, 1)} km`}</Text>
            </Pressable>
          ))}
      {k === 'ecz' && <Text style={[b.fine, { marginTop: 6 }]}>{t('Gece ve tatil günlerinde nöbetçi eczaneye bak.')}</Text>}
      <Text style={[b.fine, { marginTop: 4 }]}>{t('Kaynak: OpenStreetMap katkıcıları. Açılış saatlerini gitmeden önce kontrol et.')}</Text>
    </View>
  );
}

/* ---------- hazır rotalar ---------- */
type Route = { id: string; t: string; icon: string; days: string[][] };
export function RoutesScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { byId } = useStore();
  const trip = useTrip();
  const { pop, push } = useNav();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  function addAll(r: Route) {
    const ids = r.days.flat().filter((id) => byId(id));
    const n = trip.addMany(ids);
    track('act:route_add');
    if (n) toast('{1} yer gezi listene eklendi', num(n)); else toast('Bu yerler zaten gezi listende');
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Hazır rotalar')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Gün gün planlanmış rotalar. Beğendiğini tek dokunuşla gezi listene ekle, sonra en kısa sırayla gez.')}</Text>
        {(ROUTES as Route[]).map((r) => {
          const n = r.days.flat().length, isOpen = open === r.id;
          return (
            <View key={r.id} style={[b.card, { marginTop: 12 }]}>
              <Pressable onPress={() => setOpen(isOpen ? null : r.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 28 }}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{t(r.t)}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{`${t('{1} gün', num(r.days.length))} · ${t('{1} yer', num(n))}`}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 18 }}>{isOpen ? '▴' : '▾'}</Text>
              </Pressable>
              {isOpen && r.days.map((d, i) => (
                <View key={i} style={{ marginTop: 10 }}>
                  <Text style={{ color: C.accent, fontWeight: '800' }}>{t('{1}. gün', num(i + 1))}</Text>
                  {d.map((id) => { const p = byId(id); return p ? (
                    <Pressable key={id} onPress={() => push({ name: 'place', id })} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
                      <PlaceThumb p={p} size={36} />
                      <Text style={{ flex: 1, color: C.ink, fontWeight: '600' }} numberOfLines={1}>{p.n}</Text>
                    </Pressable>
                  ) : null; })}
                </View>
              ))}
              <Btn small kind="pri" label={`＋ ${t('Gezi listeme ekle')}`} onPress={() => addAll(r)} style={{ marginTop: 10 }} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ---------- Türkçe cep sözlüğü: ifade, okunuşu, anlamı (seçili dilde) ve sesli okuma ---------- */
export function PhrasesScreen() {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const [say, setSay] = useState<string | null>(null);
  useEffect(() => () => { Speech.stop(); }, []);
  function speak(tr: string) {
    Speech.stop(); setSay(tr); track('act:phrase');
    Speech.speak(tr, { language: 'tr-TR', rate: 0.85, onDone: () => setSay(null), onStopped: () => setSay(null), onError: () => setSay(null) });
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Türkçe cep sözlüğü')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Gezerken işine yarayacak temel Türkçe ifadeler. Dokun, telefon Türkçe okusun.')}</Text>
        {(PHRASES as [string, [string, string][]][]).map(([sec, list]) => (
          <View key={sec} style={{ marginTop: 18 }}>
            <Text style={{ color: C.accent, fontWeight: '800', letterSpacing: 0.3 }}>{t(sec)}</Text>
            {list.map(([tr, pr]) => (
              <Pressable key={tr} onPress={() => speak(tr)} accessibilityRole="button" accessibilityHint={t('Sesli dinle')}
                style={[b.card, { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }, say === tr && { borderColor: C.accent }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontWeight: '800', fontSize: 17 }}>{tr}</Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>{pr}</Text>
                  {lang !== 'tr' && <Text style={{ color: C.ink, fontSize: 14, marginTop: 2 }}>{t(tr)}</Text>}
                </View>
                <Text style={{ fontSize: 20 }}>{say === tr ? '🔉' : '🔊'}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
