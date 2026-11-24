import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { Avatar, Empty, Header } from '../components/common';
import { C, R } from '../theme';
import ReportSheet, { type ReportReq } from '../components/ReportSheet';
import { useAuth } from '../lib/auth';

/* Fotoğrafı tam ekran göster: beğen, yer kartına git */
export default function PhotoScreen({ id }: { id: string }) {
  const { t, num, ago } = useT();
  const insets = useSafeAreaInsets();
  const { photos, plikes, photoLike, byId } = useStore();
  const { pop, push } = useNav();
  const toast = useToast();
  const { me } = useAuth();
  const [rep, setRep] = useState<ReportReq>(null);
  const ph = photos.find((x) => x.id === id);
  if (!ph) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header onBack={pop} />
        <Empty title={t('Bu fotoğraf artık yok.')} />
      </View>
    );
  }
  const p = byId(ph.pid), on = plikes.has(ph.rid);
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1316' }}>
      <Pressable onPress={pop} style={{ position: 'absolute', top: insets.top + 8, right: 12, zIndex: 2, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        accessibilityRole="button" accessibilityLabel={t('Kapat')}>
        <Text style={{ color: '#FFFFFF', fontSize: 20 }}>✕</Text>
      </Pressable>
      <Image source={{ uri: ph.url }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel={ph.cap || p?.n} />
      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={ph.by} url={ph.av} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{ph.by}</Text>
            <Text style={{ color: '#B8C4C8', fontSize: 13 }}>{`${p?.n || ''} · ${ago(ph.at)}`}</Text>
          </View>
          <Pressable onPress={() => photoLike(ph.rid).then((x) => x && toast('Fotoğrafı beğendin')).catch((e) => toast(trError(e)))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? C.accent : 'rgba(255,255,255,0.15)', borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9 }}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? t('Beğenmekten vazgeç') : t('Fotoğrafı beğen')}>
            <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{on ? '♥' : '♡'}</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{num(ph.likes)}</Text>
          </Pressable>
        </View>
        {!!ph.cap && <Text style={{ color: '#E6ECEE', fontSize: 15 }}>{ph.cap}</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {p ? (
            <Pressable onPress={() => { pop(); push({ name: 'place', id: p.id }); }} accessibilityRole="link">
              <Text style={{ color: '#F3B5A9', fontWeight: '800' }}>{`${t('Yeri gör')} ›`}</Text>
            </Pressable>
          ) : <View />}
          {me?.id !== ph.uid && (
            <Pressable onPress={() => setRep({ type: 'photo', id: ph.rid })} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: '#B8C4C8', fontWeight: '700' }}>{`⚑ ${t('Şikâyet et')}`}</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ReportSheet req={rep} onClose={() => setRep(null)} />
    </View>
  );
}
