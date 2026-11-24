import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGS, useT } from '../i18n';
import { useAuth, trError } from '../lib/auth';
import { useStore } from '../lib/store';
import { pickImage } from '../lib/images';
import { useNav, useToast } from '../lib/ui';
import { Avatar, Btn, Empty, PlaceRow, Stars, b } from '../components/common';
import { LEVELS, NEED, STATUS_TXT, level } from '../data/catalog';
import { C, R } from '../theme';

type PTab = 'visited' | 'faved' | 'posts' | 'sugg';

export default function ProfileScreen() {
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { me, signOut, setAvatar, deleteAccount } = useAuth();
  const { visited, faved, posts, sugg, byId } = useStore();
  const { push } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState<PTab>('visited');
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const mine = posts.filter((p) => p.uid === me.id), mySugg = sugg.filter((g) => g.uid === me.id);
  const points = visited.size + mine.length * 3 + mySugg.filter((g) => g.state === 'ok').length * 10;
  const lv = level(points);
  const pct = lv.next ? Math.round(((lv.p - LEVELS[lv.i][0]) / (lv.next[0] - LEVELS[lv.i][0])) * 100) : 100;

  async function changePhoto(src: 'library' | 'camera' | 'remove') {
    setBusy(true);
    try {
      if (src === 'remove') { await setAvatar(null); toast('Profil fotoğrafın kaldırıldı'); return; }
      const img = await pickImage(src, true);
      if (img) { await setAvatar(img); toast('Profil fotoğrafın güncellendi'); }
    } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  function photoMenu() {
    const opts: [string, () => void][] = [[t('Galeriden seç'), () => changePhoto('library')], [t('Fotoğraf çek'), () => changePhoto('camera')]];
    if (me!.av) opts.push([t('Kaldır'), () => changePhoto('remove')]);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...opts.map((o) => o[0]), t('Vazgeç')], cancelButtonIndex: opts.length }, (i) => { if (i < opts.length) opts[i][1](); });
    } else {
      Alert.alert(me!.av ? t('Profil fotoğrafını değiştir') : t('Profil fotoğrafı ekle'), undefined, [...opts.map(([text, onPress]) => ({ text, onPress })), { text: t('Vazgeç'), style: 'cancel' as const }]);
    }
  }
  function confirmDelete() {
    Alert.alert(t('Hesabın silinsin mi?'), t('Hesabın, yorumların, fotoğrafların ve önerilerin kalıcı olarak silinir. Bu işlem geri alınamaz.'), [
      { text: t('Vazgeç'), style: 'cancel' },
      { text: t('Evet, sil'), style: 'destructive', onPress: async () => { try { await deleteAccount(); toast('Hesabın silindi'); } catch (e) { toast(trError(e)); } } },
    ]);
  }

  const tabs: [PTab, string, number][] = [['visited', t('Gittiklerim ({1})', num(visited.size)), 0], ['faved', t('Favorilerim ({1})', num(faved.size)), 0], ['posts', t('Yorumlarım ({1})', num(mine.length)), 0], ['sugg', t('Önerilerim ({1})', num(mySugg.length)), 0]];
  const placeList = (ids: Set<string>, empty: string) => {
    const ps = [...ids].map((id) => byId(id)).filter(Boolean);
    return ps.length ? ps.map((p) => <PlaceRow key={p!.id} p={p!} onPress={() => push({ name: 'place', id: p!.id })} />) : <Text style={[b.fine, { textAlign: 'center' }]}>{t(empty)}</Text>;
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable onPress={photoMenu} disabled={busy} accessibilityRole="button" accessibilityLabel={me.av ? t('Profil fotoğrafını değiştir') : t('Profil fotoğrafı ekle')} style={{ opacity: busy ? 0.5 : 1 }}>
          <Avatar name={me.name} url={me.av} size={76} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13 }}>📷</Text>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[b.h2, { fontSize: 24 }]} numberOfLines={1}>{me.name}</Text>
          <Text style={{ color: C.muted }} numberOfLines={1}>{me.email}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{t('Üyelik: {1}', new Date(me.created).toLocaleDateString(lang))}</Text>
          {me.isMod && <Text style={{ color: C.accent, fontWeight: '800', fontSize: 13 }}>{t('Moderatör')}</Text>}
        </View>
      </View>

      <View style={b.box}>
        <Text style={b.boxH}>{t('Gezgin seviyesi')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{t(lv.name)}</Text>
          <Text style={{ color: C.muted }}>{t('{1} puan', num(lv.p))}</Text>
        </View>
        <View style={{ height: 8, backgroundColor: C.line, borderRadius: 4, marginTop: 8, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.accent }} /></View>
        <Text style={b.fine}>{lv.next ? `${t('Sonraki seviye:')} ${t(lv.next[1])} · ${t('{1} puan', num(lv.next[0]))}` : t('En üst seviyedesin.')}</Text>
        <Text style={b.fine}>{t('Puanlar: gidilen yer 1, yorum 3, onaylanan öneri 10. Güvenilir rehberlerin onayı 2 oy sayılır.')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 16 }} accessibilityRole="tablist">
        {tabs.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: tab === k ? C.ink : C.surface, borderWidth: 1, borderColor: tab === k ? C.ink : C.chipLine }}
            accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={{ fontWeight: '700', color: tab === k ? '#FFFFFF' : C.ink }}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ marginTop: 8, marginHorizontal: -16 }}>
        {tab === 'visited' && placeList(visited, 'Bir yerin kartındaki “Gittim mi?” düğmesiyle gittiğin yerleri işaretle.')}
        {tab === 'faved' && placeList(faved, 'Beğendiğin yerleri “Favori” düğmesiyle kaydet.')}
      </View>
      {tab === 'posts' && (mine.length ? mine.map((x) => (
        <Pressable key={x.id} onPress={() => push({ name: 'place', id: x.pid, tab: 'rev' })} style={b.card}>
          <Text style={{ fontWeight: '800', color: C.ink }}>{byId(x.pid)?.n}</Text>
          <Stars value={x.rating} />
          {!!x.text && <Text style={{ color: C.ink, marginTop: 4 }}>{x.text}</Text>}
        </Pressable>
      )) : <Text style={[b.fine, { textAlign: 'center' }]}>{t('Henüz yorum yazmadın.')}</Text>)}
      {tab === 'sugg' && (mySugg.length ? mySugg.map((g) => (
        <View key={g.id} style={b.card}>
          <Text style={{ fontWeight: '800', color: C.ink }}>{g.n}</Text>
          <Text style={{ color: C.muted }}>{g.il}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '700', color: g.state === 'ok' ? C.ok : g.state === 'wait' ? C.star : C.danger }}>{t(STATUS_TXT[g.state])}</Text>
            <Text style={{ color: C.muted }}>{t('{1}/{2} onay', num(g.ok), num(NEED))}</Text>
          </View>
        </View>
      )) : <Empty title={t('Henüz öneri yapmadın.')} note={t('Uygulamada olmayan bir yeri “Yer öner” ile ekleyebilirsin.')} action={t('Yer öner')} onAction={() => push({ name: 'suggest' })} />)}

      <Pressable onPress={() => push({ name: 'support' })} style={[b.card, { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: C.accent, backgroundColor: C.soft, marginTop: 24 }]} accessibilityRole="button">
        <Text style={{ fontSize: 26, color: C.accent }}>♥</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{t('Bize destek olun')}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{t('Kredi veya banka kartıyla öde')}</Text>
        </View>
        <Text style={{ color: C.accent, fontSize: 22 }}>›</Text>
      </Pressable>

      <Text style={[b.h2, { fontSize: 18, marginTop: 26 }]}>{t('Ayarlar')}</Text>
      <Pressable onPress={() => push({ name: 'lang' })} style={[b.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} accessibilityRole="button">
        <Text style={{ fontWeight: '700', color: C.ink }}>{t('Dil')}</Text>
        <Text style={{ color: C.muted }}>{`${LANGS[lang]}  ›`}</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Btn label={t('Çıkış yap')} onPress={() => signOut()} style={{ flex: 1 }} />
        <Btn label={t('Hesabı sil')} onPress={confirmDelete} style={{ flex: 1, borderColor: C.danger }} />
      </View>
      <Text style={b.fine}>{t('Hesabın web sitesinde de geçerlidir.')}</Text>
    </ScrollView>
  );
}
