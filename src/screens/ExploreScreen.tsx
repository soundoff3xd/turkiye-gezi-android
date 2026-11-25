import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useNav, useToast } from '../lib/ui';
import { fmtDist, useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { Chip, PlaceRow, b } from '../components/common';
import { GROUPS, REGIONS, SORTS, SUBS, catName, fold, groupOf, type SortKey } from '../data/catalog';
import { C, R, shadow } from '../theme';
import { forYouGroups, usePrefs } from '../lib/prefs';
import AccountMenu from '../components/AccountMenu';
import { SkeletonRows, useDeferred } from '../components/Anim';
import { inSeason } from '../lib/season';
import { useTrip } from '../lib/trip';

type Sort = SortKey | 'near';
const SORT_ICON: Record<Sort, string> = { near: '📍', visits: '👣', favs: '♥', rating: '★', reviews: '💬' };
const ALL_SORTS: [Sort, string][] = [['near', 'Bana en yakın'], ...SORTS];
const GROUP_ICON: Record<string, string> = { foryou: '✨', all: '◎', kultur: '🏛', doga: '🌲', deniz: '🌊', sehir: '🏘', manzara: '🌄' };

/* Keşfet: arama, sıralama, kategori ve bölgeye göre tüm yerler */
export default function ExploreScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { places, stats, sugg, loading } = useStore();
  const ready = useDeferred(40);
  const { push } = useNav();
  const toast = useToast();
  const { pos, distTo, request } = useLocation();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('visits');
  const pickSort = (k: Sort) => {
    if (k === 'near' && !pos) { request().then(() => setSort('near')).catch((e) => toast(trError(e))); return; }
    setSort(k);
  };
  const { interests, start, clearStart } = usePrefs();
  const trip = useTrip();
  const mineG = useMemo(() => forYouGroups(interests), [interests]);
  // ilk açılışta ilgi alanı seçildiyse "Senin için" ile başla
  const [cat, setCat] = useState(() => (start === 'foryou' && interests.length ? 'foryou' : 'all'));
  useEffect(() => { if (start === 'foryou') clearStart(); }, [start, clearStart]);
  useEffect(() => { if (cat === 'foryou' && !mineG.size) setCat('all'); }, [cat, mineG]);
  const inCat = (c: string, g: string) => g === 'all' || (g === 'foryou' ? mineG.has(groupOf(c)) : groupOf(c) === g);
  const [sub, setSub] = useState('all');
  const [reg, setReg] = useState(-1);
  const [now, setNow] = useState(false);

  // her yerin arama metni bir kez hazırlanır (her tuşta 1340 yeri yeniden sadeleştirmemek için)
  const hay = useMemo(() => new Map(places.map((p) => [p.id, fold(`${p.n} ${p.il} ${p.semt || ''} ${catName(p.c)} ${t(catName(p.c))}`)])), [places, t]);
  const seasonOk = useMemo(() => new Set(places.filter((p) => inSeason(p)).map((p) => p.id)), [places]);
  const fq = fold(q.trim());
  const match = (p: typeof places[number], ignoreSub = false, ignoreCat = false) =>
    (reg < 0 || p.r === reg) && (!now || seasonOk.has(p.id)) && (ignoreCat || inCat(p.c, cat)) && (ignoreSub || sub === 'all' || p.c === sub)
      && (!fq || (hay.get(p.id) || '').includes(fq));
  const showDist = sort === 'near' || !!pos;
  const rows = useMemo(() => {
    const cmp: Record<Sort, (a: any, b: any) => number> = {
      near: (a, b) => (a.d ?? 1e12) - (b.d ?? 1e12),
      visits: (a, b) => b.s.visits - a.s.visits, favs: (a, b) => b.s.favs - a.s.favs,
      rating: (a, b) => (b.s.rating - a.s.rating) || (b.s.count - a.s.count), reviews: (a, b) => b.s.count - a.s.count,
    };
    return places.filter((p) => match(p)).map((p) => ({ p, s: stats(p.id), d: showDist ? distTo(p.lat, p.lng) : null })).sort(cmp[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, stats, fq, sort, cat, sub, reg, now, hay, showDist ? distTo : null, mineG]);
  // kategori ve alt kategori sayıları: yalnızca filtreler değişince hesaplanır
  const counts = useMemo(() => {
    const g: Record<string, number> = {}, c: Record<string, number> = {};
    places.forEach((p) => {
      if (!match(p, true, true)) return;
      const gr = groupOf(p.c); g[gr] = (g[gr] || 0) + 1; g.all = (g.all || 0) + 1;
      if (mineG.has(gr)) g.foryou = (g.foryou || 0) + 1;
      if (inCat(p.c, cat)) c[p.c] = (c[p.c] || 0) + 1;
    });
    return { g, c };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, fq, reg, now, hay, cat, mineG]);
  const groupCount = (g: string) => counts.g[g] || 0;
  const subs = cat === 'all' || cat === 'foryou' ? [] : Object.entries(SUBS).filter(([, v]) => v[0] === cat);
  const waiting = sugg.filter((g) => g.state === 'wait' || g.state === 'mod').length;

  const head = (
    <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[b.h2, { fontSize: 26 }]} accessibilityRole="header">{t('Keşfet')}</Text>
        <AccountMenu size={44} top={insets.top + 60} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 16, height: 48, marginTop: 12, borderWidth: 1, borderColor: C.chipLine }}>
        <Text style={{ fontSize: 20, color: C.muted, marginRight: 8 }}>⌕</Text>
        <TextInput value={q} onChangeText={setQ} placeholder={t('İl veya yer ara')} placeholderTextColor={C.muted} style={{ flex: 1, fontSize: 16, color: C.ink }} autoCorrect={false} returnKeyType="search" />
        {!!q && <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('Aramayı temizle')}><Text style={{ color: C.muted, fontSize: 16 }}>✕</Text></Pressable>}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Pressable onPress={() => push({ name: 'recommend' })} style={{ flex: 1.3, backgroundColor: C.solid, borderRadius: R.md, padding: 12 }} accessibilityRole="button">
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15.5 }}>{`🧭 ${t('Nereye gitmeliyim?')}`}</Text>
          <Text style={{ color: C.solidSub, fontSize: 12.5, marginTop: 2 }}>{t('İlgine göre şehir ve gezi planı öner')}</Text>
        </Pressable>
        <Pressable onPress={() => push({ name: 'trip' })} style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.line }} accessibilityRole="button">
          <Text style={{ color: C.ink, fontWeight: '800' }}>{`🧳 ${t('Gezi listem')}`}</Text>
          <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{t('{1} durak', num(trip.ids.length))}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable onPress={() => push({ name: 'suggest' })} style={{ flex: 1, backgroundColor: C.accent, borderRadius: R.md, padding: 12 }} accessibilityRole="button">
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{`＋ ${t('Yer öner')}`}</Text>
          <Text style={{ color: '#FBE3DD', fontSize: 12.5, marginTop: 2 }}>{t('Uygulamada olmayan bir yeri ekle')}</Text>
        </Pressable>
        <Pressable onPress={() => push({ name: 'pending' })} style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.line }} accessibilityRole="button">
          <Text style={{ color: C.ink, fontWeight: '800' }}>{t('Onay bekleyenler ({1})', num(waiting))}</Text>
          <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{t('Önerileri doğrula')}</Text>
        </Pressable>
      </View>

      <Text style={[b.boxH, { marginTop: 18 }]}>{t('Sırala')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {ALL_SORTS.map(([k, l]) => (
          <Pressable key={k} onPress={() => pickSort(k)} style={[{ width: '48.6%', borderRadius: R.md, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, sort === k ? { backgroundColor: C.solid, borderColor: C.solid } : { backgroundColor: C.surface, borderColor: C.line }]}
            accessibilityRole="button" accessibilityState={{ selected: sort === k }}>
            <Text style={{ fontSize: 17, color: sort === k ? '#FFFFFF' : C.accent }}>{SORT_ICON[k]}</Text>
            <Text style={{ fontWeight: '700', color: sort === k ? '#FFFFFF' : C.ink, flexShrink: 1 }}>{t(l)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[b.boxH, { marginTop: 16 }]}>{t('Kategori')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[...(mineG.size ? [['foryou', 'Senin için'] as [string, string]] : []), ['all', 'Tümü'] as [string, string], ...GROUPS].map(([k, l]) => (
          <Pressable key={k} onPress={() => { setCat(k); setSub('all'); }} style={[{ width: '31.6%', borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, alignItems: 'center' }, cat === k ? { backgroundColor: C.solid, borderColor: C.solid } : k === 'foryou' ? { backgroundColor: C.soft, borderColor: C.accent } : { backgroundColor: C.surface, borderColor: C.line },
            k === 'foryou' && { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 }]}
            accessibilityRole="button" accessibilityState={{ selected: cat === k }}>
            <Text style={{ fontSize: 20 }}>{GROUP_ICON[k]}</Text>
            <Text style={{ fontWeight: '700', fontSize: 13, color: cat === k ? '#FFFFFF' : C.ink, textAlign: 'center' }} numberOfLines={2}>{t(l)}</Text>
            <Text style={{ fontSize: 12, color: cat === k ? C.solidSub : C.muted }}>{num(groupCount(k))}</Text>
          </Pressable>
        ))}
      </View>
      {subs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          <Chip label={t('Tümü')} on={sub === 'all'} onPress={() => setSub('all')} />
          {subs.map(([k, v]) => <Chip key={k} label={t(v[1])} on={sub === k} onPress={() => setSub(k)} count={counts.c[k] || 0} />)}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
        <Chip label={`🗓 ${t('Bu mevsim')}`} on={now} onPress={() => setNow(!now)} />
        {[-1, ...REGIONS.map((_, i) => i)].map((i) => <Chip key={i} label={i < 0 ? t('Tüm Türkiye') : t(REGIONS[i])} on={reg === i} onPress={() => setReg(i)} />)}
      </ScrollView>
      <Text style={[b.boxH, { marginTop: 4, marginBottom: 6 }]}>{t('{1} yer', num(rows.length))}</Text>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      data={ready ? rows : []}
      initialNumToRender={14}
      windowSize={9}
      removeClippedSubviews
      keyExtractor={(r) => r.p.id}
      ListHeaderComponent={head}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <PlaceRow p={item.p} hot={sort} dist={item.d != null ? fmtDist(item.d, num) : undefined} onPress={() => push({ name: 'place', id: item.p.id })} />}
      ListEmptyComponent={!ready || (loading && !places.length) ? <SkeletonRows /> : <Text style={[b.fine, { textAlign: 'center', padding: 24 }]}>{t('Sonuç bulunamadı.')}</Text>}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
    />
  );
}
