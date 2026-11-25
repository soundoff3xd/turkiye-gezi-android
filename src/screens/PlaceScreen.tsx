import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { fmtDist, useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { Btn, Empty, Header, Stars, b } from '../components/common';
import ReviewCard from '../components/ReviewCard';
import Weather from '../components/Weather';
import CorrectionSheet from '../components/CorrectionSheet';
import { Dishes, SeasonBox } from '../components/Extras';
import { SkeletonPage, useDeferred } from '../components/Anim';
import { useTrip } from '../lib/trip';
import { sharePlace } from '../lib/share';
import { REGIONS, catName } from '../data/catalog';
import { C, R } from '../theme';

/* Yer kartının tamamı: genel bakış, yorumlar, fotoğraflar */
export default function PlaceScreen({ id, initialTab = 'ov' }: { id: string; initialTab?: 'ov' | 'rev' | 'pho' }) {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { byId, stats, visited, faved, toggle, posts } = useStore();
  const { pop, push, showOnMap } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const [fix, setFix] = useState(false);
  const { distTo } = useLocation();
  const trip = useTrip();
  const ready = useDeferred(0);
  const p = byId(id);
  if (!p) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header onBack={pop} /><Empty title={t('Bu yer bulunamadı.')} /></View>;
  const s = stats(p.id), mine = posts.filter((x) => x.pid === p.id), media = mine.filter((x) => x.photo);
  const v = visited.has(p.id), f = faved.has(p.id);

  async function onToggle(kind: 'visits' | 'favorites') {
    try { const on = await toggle(kind, p!.id); if (on) toast(kind === 'visits' ? 'Gittiğin yerlere eklendi' : 'Favorilere eklendi'); }
    catch (e) { toast(trError(e)); }
  }
  const tabs: [typeof tab, string][] = [['ov', t('Genel bakış')], ['rev', t('Yorumlar')], ['pho', media.length ? t('Fotoğraflar ({1})', num(media.length)) : t('Fotoğraflar')]];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header onBack={pop} title={p.n} right={
        <Pressable onPress={() => showOnMap({ id: p.id })} hitSlop={8} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '800' }}>{t('Haritada gör')}</Text></Pressable>
      } />
      {!ready ? <SkeletonPage /> : <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
        <Text style={{ color: C.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>{`${p.il} · ${t(catName(p.c))}`.toLocaleUpperCase(undefined)}</Text>
        <Text style={{ color: C.ink, fontSize: 28, fontWeight: '800', marginTop: 4 }} accessibilityRole="header">{p.n}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {s.count ? (<><Stars value={s.rating} /><Text style={{ fontWeight: '800', color: C.ink }}>{num(s.rating, 1)}</Text><Text style={{ color: C.muted }}>{t('({1} yorum)', num(s.count))}</Text></>)
            : <Text style={{ color: C.muted }}>{t('Henüz puan yok')}</Text>}
        </View>
        <Text style={{ color: C.muted, marginTop: 4 }}>{`${t('{1} kişi gitti', num(s.visits))} · ${t('{1} favori', num(s.favs))}`}</Text>
        {!!p.closed && <Text style={{ color: C.danger, fontWeight: '800', marginTop: 6 }}>{`🚫 ${t('Bu yerin kapandığı bildirildi.')}`}</Text>}
        {!!p.added && <Text style={{ color: C.muted, marginTop: 4 }}>{t('{1} önerdi, topluluk onayladı', p.added)}</Text>}
        {distTo(p.lat, p.lng) != null && <Text style={{ color: C.ink, fontWeight: '700', marginTop: 4 }}>{`📍 ${t('Senden {1} uzakta', fmtDist(distTo(p.lat, p.lng) as number, num))}`}</Text>}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Btn label={v ? `✓ ${t('Gittim')}` : t('Gittim mi?')} kind={v ? 'on' : 'out'} onPress={() => onToggle('visits')} style={{ flex: 1 }} />
          <Btn label={f ? `♥ ${t('Favoride')}` : `♡ ${t('Favori')}`} kind={f ? 'on' : 'out'} onPress={() => onToggle('favorites')} style={{ flex: 1 }} />
          <Btn label={t('Yol tarifi')} kind="pri" onPress={() => push({ name: 'route', id: p.id })} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Btn label={t('Yorum yaz')} onPress={() => push({ name: 'compose', id: p.id })} style={{ flex: 1 }} />
          <Btn label={t('Fotoğraf ekle')} onPress={() => push({ name: 'compose', id: p.id })} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Btn label={trip.has(p.id) ? `✓ ${t('Gezi listende')}` : `＋ ${t('Gezi listeme ekle')}`} kind={trip.has(p.id) ? 'on' : 'out'} style={{ flex: 1 }}
            onPress={() => { if (trip.has(p.id)) { trip.remove(p.id); toast('Gezi listenden çıkarıldı'); } else if (trip.add(p.id)) toast('Gezi listene eklendi'); else toast('Gezi listen dolu (en fazla {1} yer).', 24); }} />
          <Btn label={`↗ ${t('Paylaş')}`} onPress={() => sharePlace(p, t)} style={{ flex: 1 }} />
        </View>

        <View style={{ flexDirection: 'row', marginTop: 18, borderBottomWidth: 1, borderBottomColor: C.line }} accessibilityRole="tablist">
          {tabs.map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: tab === k ? C.accent : 'transparent', marginBottom: -1 }}
              accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Text style={{ fontWeight: '800', color: tab === k ? C.ink : C.muted }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'ov' && (
          <View>
            {!!p.d && <Text style={{ color: C.ink, fontSize: 16, lineHeight: 24, marginTop: 14 }}>{t(p.d)}</Text>}
            <View style={b.box}><Text style={b.boxH}>{t('Konum')}</Text>
              <Text style={b.boxT}>{[p.il, p.semt, REGIONS[p.r] ? t(REGIONS[p.r] + ' Bölgesi') : ''].filter(Boolean).join(' · ')}</Text></View>
            {!!p.h && <View style={b.box}><Text style={b.boxH}>{t('Nasıl gidilir')}</Text><Text style={b.boxT}>{t(p.h)}</Text></View>}
            <SeasonBox p={p} />
            <Dishes il={p.il} />
            <Weather lat={p.lat} lng={p.lng} />
            <Text style={b.fine}>{t('Açılış saatleri ve giriş ücretleri değişebilir; gitmeden önce resmi kaynaktan kontrol edin.')}</Text>
            <Pressable onPress={() => setFix(true)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6 }}>
              <Text style={{ color: C.link, fontWeight: '700' }}>{`⚑ ${t('Bilgi yanlış mı? Düzeltme öner')}`}</Text>
            </Pressable>
          </View>
        )}
        {tab === 'rev' && (
          <View>
            {s.count > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 }}>
                <Text style={{ fontSize: 40, fontWeight: '800', color: C.ink }}>{num(s.rating, 1)}</Text>
                <View><Stars value={s.rating} size={18} /><Text style={{ color: C.muted }}>{t('{1} yorum', num(s.count))}</Text></View>
              </View>
            )}
            {mine.length ? mine.map((x) => <ReviewCard key={x.id} x={x} />)
              : <Empty title={t('Bu yer için gösterilecek yorum yok')} note={t('Gezdiysen ilk deneyimi sen paylaş.')} action={t('Yorum yaz')} onAction={() => push({ name: 'compose', id: p.id })} />}
          </View>
        )}
        {tab === 'pho' && (
          media.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {media.map((x) => (
                <Pressable key={x.id} onPress={() => push({ name: 'photo', id: 'pp' + x.id })} style={{ width: '49%' }} accessibilityRole="imagebutton" accessibilityLabel={t('Fotoğrafı büyüt')}>
                  <Image source={{ uri: x.photo as string }} style={{ width: '100%', aspectRatio: 1, borderRadius: R.sm, backgroundColor: C.line }} />
                </Pressable>
              ))}
            </View>
          ) : <Empty title={t('Henüz fotoğraf yok')} note={t('Çektiğin kareleri paylaş, gelecek gezginler ne bekleyeceğini görsün.')} action={t('Fotoğraf ekle')} onAction={() => push({ name: 'compose', id: p.id })} />
        )}
      </ScrollView>}
      <CorrectionSheet placeId={p.id} open={fix} onClose={() => setFix(false)} />
    </View>
  );
}
