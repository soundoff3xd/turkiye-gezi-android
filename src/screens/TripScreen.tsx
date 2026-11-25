import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useTrip } from '../lib/trip';
import { fmtDist, useLocation } from '../lib/location';
import { useNav, useToast } from '../lib/ui';
import { nearestOrder } from '../lib/routing';
import { shareTrip } from '../lib/share';
import OfflineBox from '../components/OfflineBox';
import { track } from '../lib/telemetry';
import { Btn, Empty, Header, b } from '../components/common';
import { catName, meters } from '../data/catalog';
import { C, R } from '../theme';

/* Gezi listem: gezmek istediğin yerleri sırala, tek rotada birleştir */
export default function TripScreen({ shared }: { shared?: string[] }) {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { byId } = useStore();
  const trip = useTrip();
  const { pos } = useLocation();
  const { pop, push } = useNav();
  const toast = useToast();
  const items = trip.ids.map((id) => byId(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId>>[];
  const inc = (shared || []).map((id) => byId(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId>>[];
  const total = items.reduce((a, p, i) => a + (i ? meters(items[i - 1].lat, items[i - 1].lng, p.lat, p.lng) : 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Gezi listem')} right={items.length ? (
        <Pressable onPress={() => { trip.clear(); toast('Gezi listen temizlendi'); }} hitSlop={8} accessibilityRole="button"><Text style={{ color: C.muted, fontWeight: '700' }}>{t('Temizle')}</Text></Pressable>
      ) : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {inc.length > 0 && (
          <View style={[b.card, { borderColor: C.accent, backgroundColor: C.soft, marginTop: 0, marginBottom: 14 }]}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{`📬 ${t('Seninle bir gezi listesi paylaşıldı')}`}</Text>
            <Text style={{ color: C.muted, marginTop: 2 }}>{t('{1} durak', num(inc.length))}</Text>
            {inc.slice(0, 8).map((p, i) => <Text key={p.id} style={{ color: C.ink, marginTop: 4 }} numberOfLines={1}>{`${i + 1}. ${p.n} · ${p.il}`}</Text>)}
            {inc.length > 8 && <Text style={{ color: C.muted, marginTop: 4 }}>{`+${num(inc.length - 8)}`}</Text>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Btn small kind="pri" label={`＋ ${t('Listeme ekle')}`} style={{ flex: 1 }} onPress={() => { const n = trip.addMany(inc.map((p) => p.id)); toast(n ? 'Gezi listene {1} yer eklendi' : 'Bu yerler zaten gezi listende', n); pop(); push({ name: 'trip' }); }} />
              <Btn small label={`🧭 ${t('Rotayı göster')}`} style={{ flex: 1 }} onPress={() => push({ name: 'route', ids: inc.map((p) => p.id) })} />
            </View>
          </View>
        )}
        {!items.length ? (
          <Empty title={t('Gezi listen boş')} note={t('Yer kartlarındaki “Gezi listeme ekle” düğmesiyle gezmek istediğin yerleri buraya topla; uygulama hepsini tek rotada birleştirsin.')}
            action={t('Nereye gitmeliyim?')} onAction={() => push({ name: 'recommend' })} />
        ) : (
          <>
            <Text style={{ color: C.muted }}>{`${t('{1} durak', num(items.length))} · ${t('Kuş uçuşu toplam {1}', fmtDist(total, num))}`}</Text>
            <View style={{ marginTop: 10 }}>
              {items.map((p, i) => (
                <View key={p.id} style={[b.card, { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, padding: 10 }]}>
                  <Text style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, color: '#FFFFFF', textAlign: 'center', lineHeight: 28, fontWeight: '800' }}>{i + 1}</Text>
                  <Pressable style={{ flex: 1 }} onPress={() => push({ name: 'place', id: p.id })} accessibilityRole="button">
                    <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15.5 }} numberOfLines={1}>{p.n}</Text>
                    <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>{`${p.il} · ${t(catName(p.c))}`}{i > 0 ? ` · ${fmtDist(meters(items[i - 1].lat, items[i - 1].lng, p.lat, p.lng), num)}` : ''}</Text>
                  </Pressable>
                  <Pressable onPress={() => trip.move(p.id, -1)} disabled={i === 0} hitSlop={6} style={{ padding: 6, opacity: i === 0 ? 0.3 : 1 }} accessibilityRole="button" accessibilityLabel={t('Yukarı taşı')}><Text style={{ fontSize: 18, color: C.ink }}>↑</Text></Pressable>
                  <Pressable onPress={() => trip.move(p.id, 1)} disabled={i === items.length - 1} hitSlop={6} style={{ padding: 6, opacity: i === items.length - 1 ? 0.3 : 1 }} accessibilityRole="button" accessibilityLabel={t('Aşağı taşı')}><Text style={{ fontSize: 18, color: C.ink }}>↓</Text></Pressable>
                  <Pressable onPress={() => trip.remove(p.id)} hitSlop={6} style={{ padding: 6 }} accessibilityRole="button" accessibilityLabel={t('Listeden çıkar')}><Text style={{ fontSize: 16, color: C.muted }}>✕</Text></Pressable>
                </View>
              ))}
            </View>
            {items.length > 2 && (
              <Btn label={`⇅ ${t('Sırayı en kısa yap')}`} onPress={() => { trip.setAll(nearestOrder(items, pos).map((p) => p.id)); toast('Duraklar en kısa sıraya dizildi'); }} style={{ marginTop: 14 }} />
            )}
            <Btn kind="pri" label={`🧭 ${t('Rotayı göster')}`} onPress={() => push({ name: 'route', ids: items.map((p) => p.id) })} style={{ marginTop: 10 }} />
            <Btn label={`↗ ${t('Listeyi paylaş')}`} onPress={() => shareTrip(items.map((p) => p.id), t, num)} style={{ marginTop: 8 }} />
            <OfflineBox pts={items} doneText="Bu gezinin haritası telefonuna indirildi. İnternet olmadan da açılır." introText="İnternetin zayıf olduğu yerler için gezi listendeki yerlerin çevresini telefonuna indir." />
            <Text style={b.fine}>{t('Rota konumundan başlar ve durakları bu sırayla dolaşır. Rota ekranından sesli navigasyonu başlatabilirsin.')}</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
