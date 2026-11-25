import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { Avatar, Chip, Empty, b, Btn } from '../components/common';
import AccountMenu from '../components/AccountMenu';
import { SkeletonGrid, useDeferred } from '../components/Anim';
import { C, R } from '../theme';

/* Fotoğraf vitrini: en çok beğenilen ve en yeni fotoğraflar, en çok beğeni alan fotoğrafçılar */
export default function ShowcaseScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { photos, plikes, photoLike, byId } = useStore();
  const { push, setTab } = useNav();
  const toast = useToast();
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [limit, setLimit] = useState(24);   // fotoğraflar 24'er 24'er yüklenir

  const list = useMemo(() => photos.slice().sort((a, b) => (sort === 'top' ? (b.likes - a.likes) || b.at.localeCompare(a.at) : b.at.localeCompare(a.at))), [photos, sort]);
  const people = useMemo(() => {
    const m = new Map<string, { n: string; av: string | null; likes: number; count: number }>();
    photos.forEach((p) => { const e = m.get(p.uid) || { n: p.by, av: p.av, likes: 0, count: 0 }; e.likes += p.likes; e.count++; m.set(p.uid, e); });
    return [...m.values()].sort((a, b) => b.likes - a.likes).slice(0, 5);
  }, [photos]);

  const ready = useDeferred(40);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={[b.h2, { fontSize: 26, flexShrink: 1 }]} accessibilityRole="header">{t('Fotoğraf vitrini')}</Text>
        <AccountMenu size={44} top={insets.top + 60} />
      </View>
      <Text style={{ color: C.muted, marginTop: 4, lineHeight: 20 }}>{t('Gezginlerin çektiği en güzel kareler. Beğendiğin fotoğrafa kalp bırak.')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <Chip label={t('En çok beğenilen')} on={sort === 'top'} onPress={() => { setSort('top'); setLimit(24); }} />
        <Chip label={t('En yeni')} on={sort === 'new'} onPress={() => { setSort('new'); setLimit(24); }} />
      </View>

      {!ready ? <View style={{ marginHorizontal: -16 }}><SkeletonGrid /></View> : list.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          {list.slice(0, limit).map((ph, i) => {
            const p = byId(ph.pid), on = plikes.has(ph.rid);
            return (
              <View key={ph.id} style={{ width: '48.4%', backgroundColor: C.surface, borderRadius: R.md, overflow: 'hidden', borderWidth: 1, borderColor: C.line }}>
                <Pressable onPress={() => push({ name: 'photo', id: ph.id })} accessibilityRole="imagebutton" accessibilityLabel={t('Fotoğrafı büyüt')}>
                  <Image source={{ uri: ph.url }} style={{ width: '100%', aspectRatio: 1, backgroundColor: C.line }} />
                  {sort === 'top' && i < 3 && (
                    <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{`#${i + 1}`}</Text>
                    </View>
                  )}
                </Pressable>
                <View style={{ padding: 10 }}>
                  <Text style={{ fontWeight: '800', color: C.ink }} numberOfLines={1}>{p?.n}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: C.muted, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{ph.by}</Text>
                    <Pressable onPress={() => photoLike(ph.rid).then((x) => x && toast('Fotoğrafı beğendin')).catch((e) => toast(trError(e)))} hitSlop={8}
                      accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? t('Beğenmekten vazgeç') : t('Fotoğrafı beğen')}>
                      <Text style={{ color: on ? C.accent : C.muted, fontWeight: '800' }}>{`${on ? '♥' : '♡'} ${num(ph.likes)}`}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          {list.length > limit && <Btn label={t('Daha fazla göster')} onPress={() => setLimit(limit + 24)} style={{ width: '100%' }} />}
        </View>
      ) : (
        <Empty title={t('Henüz fotoğraf yok')} note={t('Bir yerin kartından yorum yazarken fotoğraf ekle; en çok beğenilenler burada öne çıkar.')} action={t('Yerlere göz at')} onAction={() => setTab('explore')} />
      )}

      {people.length > 0 && (
        <>
          <Text style={[b.h2, { fontSize: 19, marginTop: 24 }]}>{t('En çok beğeni alan fotoğrafçılar')}</Text>
          {people.map((u, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <Text style={{ width: 22, fontWeight: '800', color: C.muted }}>{i + 1}</Text>
              <Avatar name={u.n} url={u.av} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.ink }}>{u.n}</Text>
                <Text style={{ color: C.muted, fontSize: 13 }}>{t('{1} fotoğraf', num(u.count))}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: C.accent }}>{`♥ ${num(u.likes)}`}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
