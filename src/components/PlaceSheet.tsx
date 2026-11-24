import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { fmtDist, useLocation } from '../lib/location';
import { useNav } from '../lib/ui';
import { Btn, Stars } from './common';
import { C, shadow } from '../theme';
import { catName, type Place } from '../data/catalog';
import { useTrip } from '../lib/trip';
import { sharePlace } from '../lib/share';
import { useToast } from '../lib/ui';

type Props = { place: Place; bottom: number; onToggle: (kind: 'visits' | 'favorites') => void; onClose: () => void; onMore: () => void };

/* Haritada seçilen yerin kısa kartı (Google Haritalar'daki gibi); "Ayrıntılar" tam kartı açar */
export default function PlaceSheet({ place: p, bottom, onToggle, onClose, onMore }: Props) {
  const { t, num } = useT();
  const { stats, visited, faved, posts } = useStore();
  const { height } = useWindowDimensions();
  const { distTo } = useLocation();
  const { push } = useNav();
  const trip = useTrip(), toast = useToast(), inTrip = trip.has(p.id);
  const far = distTo(p.lat, p.lng);
  const st = stats(p.id), v = visited.has(p.id), f = faved.has(p.id);
  const photos = posts.filter((x) => x.pid === p.id && x.photo).length;
  return (
    <View style={[s.sheet, { maxHeight: height * 0.55, paddingBottom: bottom + 12 }]}>
      <View style={s.grip} />
      <Pressable onPress={onClose} style={s.close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Kapat')}>
        <Text style={{ fontSize: 18, color: C.muted }}>✕</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>{`${p.il} · ${t(catName(p.c))}`.toLocaleUpperCase()}</Text>
        <Pressable onPress={onMore} accessibilityRole="button"><Text style={s.name}>{p.n}</Text></Pressable>
        <View style={s.statsRow}>
          {st.count > 0 ? (<><Stars value={st.rating} /><Text style={s.strong}>{num(st.rating, 1)}</Text><Text style={s.stat}>{t('({1} yorum)', num(st.count))}</Text></>)
            : <Text style={s.stat}>{t('Henüz puan yok')}</Text>}
        </View>
        <Text style={s.stat}>{`${t('{1} kişi gitti', num(st.visits))} · ${t('{1} favori', num(st.favs))}`}</Text>
        {far != null && <Text style={[s.stat, { color: C.ink, fontWeight: '700' }]}>{`📍 ${t('Senden {1} uzakta', fmtDist(far, num))}`}</Text>}
        <View style={s.acts}>
          <Btn label={v ? `✓ ${t('Gittim')}` : t('Gittim mi?')} kind={v ? 'on' : 'out'} onPress={() => onToggle('visits')} style={{ flex: 1 }} small />
          <Btn label={f ? `♥ ${t('Favoride')}` : `♡ ${t('Favori')}`} kind={f ? 'on' : 'out'} onPress={() => onToggle('favorites')} style={{ flex: 1 }} small />
          <Btn label={t('Yol tarifi')} kind="pri" onPress={() => push({ name: 'route', id: p.id })} style={{ flex: 1 }} small />
        </View>
        <View style={[s.acts, { marginTop: 8 }]}>
          <Btn small label={inTrip ? `✓ ${t('Gezi listende')}` : `＋ ${t('Gezi listeme ekle')}`} kind={inTrip ? 'on' : 'out'} style={{ flex: 2 }}
            onPress={() => { if (inTrip) { trip.remove(p.id); toast('Gezi listenden çıkarıldı'); } else if (trip.add(p.id)) toast('Gezi listene eklendi'); else toast('Gezi listen dolu (en fazla {1} yer).', 24); }} />
          <Btn small label={`↗ ${t('Paylaş')}`} onPress={() => sharePlace(p, t)} style={{ flex: 1 }} />
        </View>
        {!!p.d && <Text style={s.desc} numberOfLines={4}>{t(p.d)}</Text>}
        <Btn label={`${t('Yorumlar')} (${num(st.count)}) · ${t('Fotoğraflar')} (${num(photos)})  ›`} onPress={onMore} style={{ marginTop: 14 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, ...shadow },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.chipLine, marginBottom: 8 },
  close: { position: 'absolute', right: 14, top: 12, zIndex: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.line },
  kicker: { color: C.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 4, marginRight: 44 },
  name: { color: C.ink, fontSize: 25, fontWeight: '800', marginTop: 4, marginRight: 44 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strong: { color: C.ink, fontWeight: '800', fontSize: 15 },
  stat: { color: C.muted, fontSize: 14, marginTop: 2 },
  acts: { flexDirection: 'row', gap: 8, marginTop: 14 },
  desc: { color: C.ink, fontSize: 15.5, lineHeight: 22, marginTop: 14 },
});
