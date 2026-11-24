import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { C, R, shadow } from '../theme';
import { REGIONS, catName, fmt, rt, type Place, type Stats } from '../data/catalog';

type Props = {
  place: Place; stats: Stats; visited: boolean; faved: boolean; bottom: number;
  onToggle: (kind: 'visits' | 'favorites') => void; onClose: () => void;
};

function Stars({ value }: { value: number }) {
  return (
    <Text style={{ color: C.star, fontSize: 15, letterSpacing: 1 }} accessibilityLabel={`5 üzerinden ${rt(value)} puan`}>
      {[1, 2, 3, 4, 5].map((i) => (value >= i - 0.25 ? '★' : '☆')).join('')}
    </Text>
  );
}

/* Haritada seçilen yerin kartı: Google Haritalar'daki alttan açılan kart gibi */
export default function PlaceSheet({ place: p, stats: st, visited, faved, bottom, onToggle, onClose }: Props) {
  const { height } = useWindowDimensions();
  const directions = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`);
  return (
    <View style={[s.sheet, { maxHeight: height * 0.56, paddingBottom: bottom + 12 }]}>
      <View style={s.grip} />
      <Pressable onPress={onClose} style={s.close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Kapat">
        <Text style={{ fontSize: 18, color: C.muted }}>✕</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={s.kicker}>{`${p.il} · ${catName(p.c)}`.toLocaleUpperCase('tr')}</Text>
        <Text style={s.name} accessibilityRole="header">{p.n}</Text>
        <View style={s.statsRow}>
          {st.count > 0 ? (
            <><Stars value={st.rating} /><Text style={s.statStrong}>{rt(st.rating)}</Text><Text style={s.stat}>({fmt(st.count)} yorum)</Text></>
          ) : <Text style={s.stat}>Henüz puan yok</Text>}
        </View>
        <Text style={s.stat}>{`${fmt(st.visits)} kişi gitti · ${fmt(st.favs)} favori`}</Text>

        <View style={s.acts}>
          <Pressable onPress={() => onToggle('visits')} style={[s.btn, visited ? s.btnOn : s.btnOut]} accessibilityRole="button" accessibilityState={{ selected: visited }}>
            <Text style={[s.btnTxt, visited && { color: C.onAccent }]}>{visited ? '✓ Gittim' : 'Gittim'}</Text>
          </Pressable>
          <Pressable onPress={() => onToggle('favorites')} style={[s.btn, faved ? s.btnOn : s.btnOut]} accessibilityRole="button" accessibilityState={{ selected: faved }}>
            <Text style={[s.btnTxt, faved && { color: C.onAccent }]}>{faved ? '♥ Favori' : '♡ Favori'}</Text>
          </Pressable>
          <Pressable onPress={directions} style={[s.btn, { backgroundColor: C.accent }]} accessibilityRole="link">
            <Text style={[s.btnTxt, { color: C.onAccent }]}>Yol tarifi</Text>
          </Pressable>
        </View>

        {!!p.d && <Text style={s.desc}>{p.d}</Text>}
        <View style={s.box}>
          <Text style={s.boxH}>Konum</Text>
          <Text style={s.boxT}>{[p.il, p.semt, REGIONS[p.r] ? REGIONS[p.r] + ' Bölgesi' : ''].filter(Boolean).join(' · ')}</Text>
        </View>
        {!!p.h && (
          <View style={s.box}>
            <Text style={s.boxH}>Nasıl gidilir</Text>
            <Text style={s.boxT}>{p.h}</Text>
          </View>
        )}
        {!!p.added && <Text style={s.fine}>{`${p.added} tarafından önerildi, topluluk tarafından onaylandı.`}</Text>}
        <Text style={s.fine}>Açılış saatleri ve giriş ücretleri değişebilir; gitmeden önce resmi kaynaktan kontrol edin.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, ...shadow },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.chipLine, marginBottom: 8 },
  close: { position: 'absolute', right: 14, top: 12, zIndex: 2, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.line },
  kicker: { color: C.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginTop: 4, marginRight: 44 },
  name: { color: C.ink, fontSize: 26, fontWeight: '800', marginTop: 4, marginRight: 44 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statStrong: { color: C.ink, fontWeight: '800', fontSize: 15 },
  stat: { color: C.muted, fontSize: 14, marginTop: 2 },
  acts: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { flex: 1, borderRadius: R.pill, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnOut: { borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.surface },
  btnOn: { backgroundColor: C.ink },
  btnTxt: { fontSize: 15, fontWeight: '700', color: C.ink },
  desc: { color: C.ink, fontSize: 16, lineHeight: 23, marginTop: 18 },
  box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 14, marginTop: 12 },
  boxH: { color: C.muted, fontSize: 12.5, fontWeight: '700', marginBottom: 3 },
  boxT: { color: C.ink, fontSize: 15, lineHeight: 21 },
  fine: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 12 },
});
