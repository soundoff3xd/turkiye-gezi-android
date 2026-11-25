import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { catName, type Place } from '../data/catalog';
import { C, R } from '../theme';

export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  const { t, num } = useT();
  return (
    <Text style={{ color: C.star, fontSize: size, letterSpacing: 1 }} accessibilityLabel={t('5 üzerinden {1} puan', num(value, 1))}>
      {[1, 2, 3, 4, 5].map((i) => (value >= i - 0.25 ? '★' : '☆')).join('')}
    </Text>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const st = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={{ uri: url }} style={[st, { backgroundColor: C.line }]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[st, { backgroundColor: C.solid, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.42 }}>{(name || '?').charAt(0).toLocaleUpperCase('tr')}</Text>
    </View>
  );
}

type BtnProps = { label: string; onPress: () => void; kind?: 'pri' | 'out' | 'on' | 'ghost'; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>; small?: boolean };
export function Btn({ label, onPress, kind = 'out', disabled, busy, style, small }: BtnProps) {
  const bg = kind === 'pri' ? C.accent : kind === 'on' ? C.solid : kind === 'ghost' ? 'transparent' : C.surface;
  const fg = kind === 'pri' || kind === 'on' ? '#FFFFFF' : C.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || busy), selected: kind === 'on' }}
      style={({ pressed }) => [b.btn, small && b.small, { backgroundColor: bg }, kind === 'out' && b.out, (pressed || disabled) && { opacity: disabled ? 0.45 : 0.8 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[b.txt, small && { fontSize: 14 }, { color: fg }]} numberOfLines={1}>{label}</Text>}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, count }: { label: string; on?: boolean; onPress: () => void; count?: number }) {
  return (
    <Pressable onPress={onPress} style={[b.chip, on && b.chipOn]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text style={[b.chipTxt, on && { color: '#FFFFFF' }]}>{label}{count != null ? `  ${count}` : ''}</Text>
    </Pressable>
  );
}

/* üst başlık: geri düğmesi + başlık */
export function Header({ title, onBack, right }: { title?: string; onBack?: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <View style={[b.header, { paddingTop: insets.top + 6 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={b.back} accessibilityRole="button" accessibilityLabel={t('Geri')}>
          <Text style={{ fontSize: 24, color: C.ink, marginTop: -2 }}>‹</Text>
        </Pressable>
      ) : <View style={{ width: 8 }} />}
      <Text style={b.htitle} numberOfLines={1} accessibilityRole="header">{title || ''}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Empty({ title, note, action, onAction }: { title: string; note?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={b.empty}>
      <Text style={b.emptyT}>{title}</Text>
      {!!note && <Text style={b.note}>{note}</Text>}
      {!!action && onAction && <Btn label={action} kind="pri" onPress={onAction} style={{ marginTop: 12, alignSelf: 'stretch' }} />}
    </View>
  );
}

/* liste satırı: ad, il · kategori, puan ve sayılar */
export function PlaceRow({ p, onPress, hot, dist }: { p: Place; onPress: () => void; hot?: string; dist?: string }) {
  const { t, num } = useT();
  const { stats } = useStore();
  const s = stats(p.id);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [b.row, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <Text style={b.rowN}>{p.n}</Text>
        <Text style={b.rowM}>{`${p.il} · ${t(catName(p.c))}`}{dist ? <Text style={[b.rowM, hot === 'near' && b.hot]}>{`  ·  📍 ${dist}`}</Text> : null}</Text>
        <View style={b.rowS}>
          {s.count ? (<><Text style={{ color: C.star }}>★</Text><Text style={[b.rowSt, hot === 'rating' && b.hot]}>{num(s.rating, 1)}</Text><Text style={[b.rowSt, hot === 'reviews' && b.hot]}>{t('({1} yorum)', num(s.count))}</Text></>)
            : <Text style={b.rowSt}>{t('Henüz puan yok')}</Text>}
          <Text style={[b.rowSt, hot === 'visits' && b.hot]}>{`· ${t('{1} kişi gitti', num(s.visits))}`}</Text>
          {hot === 'favs' && <Text style={[b.rowSt, b.hot]}>{`· ${t('{1} favori', num(s.favs))}`}</Text>}
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}

export const b = StyleSheet.create({
  btn: { borderRadius: R.pill, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  small: { paddingVertical: 8, minHeight: 38 },
  out: { borderWidth: 1.5, borderColor: C.ink },
  txt: { fontSize: 15, fontWeight: '700' },
  chip: { backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 15, paddingVertical: 9, borderWidth: 1, borderColor: C.chipLine },
  chipOn: { backgroundColor: C.solid, borderColor: C.solid },
  chipTxt: { color: C.ink, fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8, backgroundColor: C.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 6 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  htitle: { flex: 1, fontSize: 18, fontWeight: '800', color: C.ink },
  empty: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 18, alignItems: 'center', marginTop: 12 },
  emptyT: { fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center' },
  note: { color: C.muted, fontSize: 13.5, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, backgroundColor: C.bg },
  rowN: { fontSize: 16.5, fontWeight: '800', color: C.ink },
  rowM: { fontSize: 13.5, color: C.muted, marginTop: 2 },
  rowS: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 4 },
  rowSt: { fontSize: 13, color: C.muted },
  hot: { color: C.accent, fontWeight: '800' },
  box: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 14, marginTop: 12 },
  boxH: { color: C.muted, fontSize: 12.5, fontWeight: '800', marginBottom: 4 },
  boxT: { color: C.ink, fontSize: 15, lineHeight: 21 },
  h2: { fontSize: 22, fontWeight: '800', color: C.ink },
  fine: { color: C.muted, fontSize: 12.5, lineHeight: 18, marginTop: 10 },
  card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: R.md, padding: 14, marginTop: 12 },
});
