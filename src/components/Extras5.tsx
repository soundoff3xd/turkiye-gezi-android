import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { supabase, SITE_URL } from '../lib/supabase';
import { useAuth, trError } from '../lib/auth';
import { useStore, type Review } from '../lib/store';
import { useNav, useToast } from '../lib/ui';
import { publicUrl } from '../lib/images';
import { fmtDist } from '../lib/location';
import { sunTimes, trClock } from '../lib/sun';
import { overpass } from '../lib/overpass';
import { catName, meters, type Place } from '../data/catalog';
import { photoOf, photoSrc } from '../data/photos';
import { COLLECTIONS, REGION_NAMES, progress } from '../data/collections';
import TRAILS from '../data/trails.json';
import { Avatar, Btn, Chip, Empty, Header, PlaceRow, b } from './common';
import { MAP_STYLE } from '../screens/MapScreen';
import { AddStop } from '../screens/RouteScreen';
import ReviewCard from './ReviewCard';
import { C, R } from '../theme';

const Screen = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={title} right={right} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  );
};
const Bar = ({ pct }: { pct: number }) => (
  <View style={{ height: 8, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden', marginTop: 6 }}>
    <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 8, backgroundColor: C.accent }} />
  </View>
);

/* =========================================================================
   Gezgin takip etme
   ========================================================================= */
type Trav = { id: string; name: string; avatar_path: string | null; since: string; visits: number; provinces: number; reviews: number; photos: number; followers: number; following: number; i_follow: boolean };
let followCache: Set<string> | null = null;
const followSubs = new Set<() => void>();
export async function loadFollowing(uid: string | undefined) {
  if (!uid) { followCache = new Set(); return followCache; }
  const { data } = await supabase.from('follows').select('followee').eq('follower', uid);
  followCache = new Set(((data as any[]) || []).map((r) => r.followee));
  followSubs.forEach((f) => f());
  return followCache;
}
export function useFollowing() {
  const { me } = useAuth();
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); followSubs.add(f); if (!followCache) loadFollowing(me?.id); return () => { followSubs.delete(f); }; }, [me?.id]);
  return followCache || new Set<string>();
}
export async function setFollow(me: string, uid: string, on: boolean) {
  if (on) { const { error } = await supabase.from('follows').insert({ follower: me, followee: uid }); if (error && error.code !== '23505') throw error; }
  else { const { error } = await supabase.from('follows').delete().eq('follower', me).eq('followee', uid); if (error) throw error; }
  await loadFollowing(me);
}

export function TravelerScreen({ id }: { id: string }) {
  const { t, num, lang } = useT();
  const { me } = useAuth();
  const { posts } = useStore();
  const toast = useToast();
  const { push } = useNav();
  const [p, setP] = useState<Trav | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => supabase.rpc('traveler', { p_uid: id }).then(({ data }) => setP((data as Trav) || null), () => setP(null)), [id]);
  useEffect(() => { load(); }, [load]);
  const theirs = useMemo(() => posts.filter((r) => r.uid === id && !r.hidden).slice(0, 20), [posts, id]);
  async function toggle() {
    if (!me) { toast('Takip etmek için giriş yap'); return; }
    setBusy(true);
    try { await setFollow(me.id, id, !p?.i_follow); await load(); } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  if (p === undefined) return <Screen title={t('Gezgin')}><ActivityIndicator color={C.accent} /></Screen>;
  if (!p) return <Screen title={t('Gezgin')}><Empty title={t('Bu gezgin bulunamadı.')} /></Screen>;
  const stats: [string, number][] = [['Yer', p.visits], ['İl', p.provinces], ['Yorum', p.reviews], ['Fotoğraf', p.photos], ['Takipçi', p.followers], ['Takip', p.following]];
  let since = '';
  try { since = new Date(p.since).toLocaleDateString(lang, { month: 'long', year: 'numeric' }); } catch { /* */ }
  return (
    <Screen title={p.name}>
      <View style={{ alignItems: 'center' }}>
        <Avatar name={p.name} url={publicUrl(p.avatar_path)} size={84} />
        <Text style={{ fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 8 }}>{p.name}</Text>
        {!!since && <Text style={{ color: C.muted }}>{t('{1} tarihinden beri gezgin', since)}</Text>}
        {me && me.id !== id && <Btn kind={p.i_follow ? 'out' : 'pri'} busy={busy} label={p.i_follow ? `✓ ${t('Takip ediliyor')}` : `＋ ${t('Takip et')}`} onPress={toggle} style={{ marginTop: 12, minWidth: 180 }} />}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        {stats.map(([l, v]) => (
          <View key={l} style={{ width: '30%', backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink }}>{num(v)}</Text>
            <Text style={{ color: C.muted, fontSize: 12.5 }}>{t(l)}</Text>
          </View>
        ))}
      </View>
      <Text style={b.fine}>{t('Gezginin hangi yerlere gittiği gizlidir; yalnızca sayılar görünür.')}</Text>
      <Text style={[b.h2, { fontSize: 18, marginTop: 18 }]}>{t('Son yorumları')}</Text>
      {theirs.length ? theirs.map((r) => <ReviewCard key={r.id} x={r} showPlace />) : <Text style={b.fine}>{t('Henüz yorum yok.')}</Text>}
      {me?.id === id && <Btn label={`📅 ${t('Yıllık gezi özetim')}`} onPress={() => push({ name: 'year' })} style={{ marginTop: 12 }} />}
    </Screen>
  );
}

/* Vitrin: takip ettiklerinin son yorumları ve fotoğrafları */
export function FollowFeed() {
  const { t } = useT();
  const { me } = useAuth();
  const { posts } = useStore();
  const following = useFollowing();
  const list = useMemo(() => posts.filter((r: Review) => following.has(r.uid) && !r.hidden).slice(0, 40), [posts, following]);
  if (!me) return <Empty title={t('Takip etmek için giriş yap')} />;
  if (!following.size) return <Empty title={t('Henüz kimseyi takip etmiyorsun.')} note={t('Bir yorumdaki gezgin adına dokunup profiline gidebilir, takip edebilirsin.')} />;
  if (!list.length) return <Empty title={t('Takip ettiklerin henüz bir şey paylaşmadı.')} />;
  return <View>{list.map((r) => <ReviewCard key={r.id} x={r} showPlace />)}</View>;
}

/* =========================================================================
   Ortak gezi listeleri
   ========================================================================= */
type STrip = { id: string; owner: string; title: string; invite: string; created_at: string };
type SItem = { place_id: string; added_by: string; created_at: string; profiles?: { name: string } | null };
type SMember = { user_id: string; profiles?: { name: string; avatar_path: string | null } | null };
export const sharedLink = (tr: STrip) => `${SITE_URL.replace(/\/$/, '')}/?ortak=${tr.id}&k=${tr.invite}`;
export async function joinShared(id: string, code: string): Promise<{ id: string; title: string; already: boolean }> {
  const { data, error } = await supabase.rpc('join_trip', { p_trip: id, p_code: code });
  if (error) throw error;
  return data as any;
}
async function myTrips(): Promise<STrip[]> {
  const { data, error } = await supabase.from('shared_trips').select('id,owner,title,invite,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as STrip[]) || [];
}
export function SharedTripsScreen() {
  const { t, num } = useT();
  const { me } = useAuth();
  const { push } = useNav();
  const toast = useToast();
  const [list, setList] = useState<STrip[] | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { myTrips().then(setList, () => setList([])); }, []);
  useEffect(() => { load(); }, [load]);
  async function create() {
    if (!me || !title.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('shared_trips').insert({ title: title.trim().slice(0, 80), owner: me.id }).select('id').single();
      if (error) throw error;
      setTitle(''); load(); push({ name: 'sharedTrip', id: (data as any).id });
    } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  if (!me) return <Screen title={t('Ortak listeler')}><Empty title={t('Ortak liste için giriş yap')} /></Screen>;
  return (
    <Screen title={t('Ortak listeler')}>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Arkadaşlarınla ya da ailenle birlikte gezi listesi hazırla. Bağlantıyı paylaş, katılan herkes yer ekleyip çıkarabilir.')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TextInput value={title} onChangeText={setTitle} placeholder={t('Liste adı (ör. Kapadokya hafta sonu)')} placeholderTextColor={C.muted} maxLength={80}
          style={{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 10, color: C.ink }} />
        <Btn kind="pri" small busy={busy} disabled={!title.trim()} label={t('Oluştur')} onPress={create} />
      </View>
      {list === null ? <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} /> : !list.length ? <Text style={[b.fine, { marginTop: 14 }]}>{t('Henüz ortak listen yok.')}</Text> : list.map((x) => (
        <Pressable key={x.id} onPress={() => push({ name: 'sharedTrip', id: x.id })} style={({ pressed }) => [b.row, pressed && { backgroundColor: C.line }]}>
          <Text style={{ fontSize: 22 }}>👥</Text>
          <View style={{ flex: 1 }}>
            <Text style={b.rowN} numberOfLines={1}>{x.title}</Text>
            <Text style={b.rowM}>{x.owner === me.id ? t('Sen oluşturdun') : t('Katıldığın liste')}</Text>
          </View>
          <Text style={{ color: C.muted }}>›</Text>
        </Pressable>
      ))}
      <Text style={[b.fine, { marginTop: 10 }]}>{t('En fazla {1} yer ve {2} kişi.', num(50), num(20))}</Text>
    </Screen>
  );
}
export function SharedTripScreen({ id }: { id: string }) {
  const { t, num, ago } = useT();
  const { me } = useAuth();
  const { byId } = useStore();
  const { push, pop } = useNav();
  const toast = useToast();
  const [trip, setTrip] = useState<STrip | null | undefined>(undefined);
  const [items, setItems] = useState<SItem[]>([]);
  const [members, setMembers] = useState<SMember[]>([]);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const [a, b2, c] = await Promise.all([
      supabase.from('shared_trips').select('id,owner,title,invite,created_at').eq('id', id).maybeSingle(),
      supabase.from('shared_trip_items').select('place_id,added_by,created_at,profiles!shared_trip_items_added_by_fkey(name)').eq('trip_id', id).order('created_at'),
      supabase.from('shared_trip_members').select('user_id,profiles!shared_trip_members_user_id_fkey(name,avatar_path)').eq('trip_id', id),
    ]);
    setTrip((a.data as STrip) || null); setItems((b2.data as any[]) || []); setMembers((c.data as any[]) || []);
  }, [id]);
  useEffect(() => { load().catch(() => setTrip(null)); }, [load]);
  if (trip === undefined) return <Screen title={t('Ortak liste')}><ActivityIndicator color={C.accent} /></Screen>;
  if (!trip) return <Screen title={t('Ortak liste')}><Empty title={t('Bu listeyi göremiyorsun.')} note={t('Listeye katılmak için sana gönderilen bağlantıyı aç.')} /></Screen>;
  const owner = trip.owner === me?.id;
  async function add(pid: string) {
    if (items.some((x) => x.place_id === pid)) { toast('Bu yer zaten listede'); return; }
    const { error } = await supabase.from('shared_trip_items').insert({ trip_id: id, place_id: pid, added_by: me!.id });
    if (error) toast(/trip_full/.test(error.message) ? 'Liste dolu (en fazla 50 yer).' : trError(error)); else { toast('Listeye eklendi'); load(); }
  }
  async function remove(pid: string) {
    const { error } = await supabase.from('shared_trip_items').delete().eq('trip_id', id).eq('place_id', pid);
    if (error) toast(trError(error)); else load();
  }
  async function leave() {
    const q = owner ? supabase.from('shared_trips').delete().eq('id', id) : supabase.from('shared_trip_members').delete().eq('trip_id', id).eq('user_id', me!.id);
    const { error } = await q;
    if (error) toast(trError(error)); else { toast(owner ? 'Liste silindi' : 'Listeden ayrıldın'); pop(); }
  }
  async function invite() {
    try { await Share.share({ message: `${t('Ortak gezi listeme katıl')}: ${trip!.title}\n${sharedLink(trip!)}` }); } catch { /* vazgeçti */ }
  }
  const ids = items.map((x) => x.place_id).filter((pid) => byId(pid));
  return (
    <Screen title={trip.title}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn kind="pri" small label={`↗ ${t('Davet et')}`} onPress={invite} style={{ flex: 1 }} />
        <Btn small label={`🧭 ${t('Rotayı göster')}`} disabled={!ids.length} onPress={() => push({ name: 'route', ids: ids.slice(0, 23) })} style={{ flex: 1 }} />
      </View>
      <Text style={[b.h2, { fontSize: 18, marginTop: 16 }]}>{`${t('Yerler')} (${num(ids.length)})`}</Text>
      {ids.length === 0 && <Text style={b.fine}>{t('Henüz yer eklenmedi.')}</Text>}
      {items.filter((x) => byId(x.place_id)).map((x) => {
        const p = byId(x.place_id)!;
        return (
          <View key={x.place_id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}><PlaceRow p={p} onPress={() => push({ name: 'place', id: p.id })} hot={x.profiles?.name ? t('{1} ekledi', x.profiles.name) : undefined} /></View>
            <Pressable onPress={() => remove(x.place_id)} hitSlop={8} style={{ padding: 8 }} accessibilityLabel={t('Listeden çıkar')}><Text style={{ color: C.danger, fontWeight: '900' }}>✕</Text></Pressable>
          </View>
        );
      })}
      <Btn label={`＋ ${t('Yer ekle')}`} onPress={() => setAdding(true)} style={{ marginTop: 10 }} />
      <Text style={[b.h2, { fontSize: 18, marginTop: 18 }]}>{t('Katılanlar')}</Text>
      <Text style={{ color: C.muted, marginBottom: 6 }}>{owner ? t('Sen (liste sahibi)') : t('Liste sahibi ve davetliler')}</Text>
      {members.map((m) => (
        <Pressable key={m.user_id} onPress={() => push({ name: 'traveler', id: m.user_id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
          <Avatar name={m.profiles?.name || '?'} url={publicUrl(m.profiles?.avatar_path)} size={30} />
          <Text style={{ color: C.ink, fontWeight: '700' }}>{m.profiles?.name || '?'}</Text>
        </Pressable>
      ))}
      {!members.length && <Text style={b.fine}>{t('Henüz kimse katılmadı. Davet bağlantısını paylaş.')}</Text>}
      <Text style={[b.fine, { marginTop: 10 }]}>{t('Oluşturuldu: {1}', ago(trip.created_at))}</Text>
      <Btn kind="ghost" label={owner ? t('Listeyi sil') : t('Listeden ayrıl')} onPress={leave} style={{ marginTop: 14 }} />
      <AddStop open={adding} onClose={() => setAdding(false)} onPick={(s) => { setAdding(false); if (s.id) add(s.id); }} skip={new Set(ids)} />
    </Screen>
  );
}
/* yer sayfasından ortak listeye ekle */
export function AddToShared({ placeId, open, onClose }: { placeId: string; open: boolean; onClose: () => void }) {
  const { t } = useT();
  const { me } = useAuth();
  const { push } = useNav();
  const toast = useToast();
  const [list, setList] = useState<STrip[] | null>(null);
  useEffect(() => { if (open) myTrips().then(setList, () => setList([])); }, [open]);
  async function pick(tr: STrip) {
    const { error } = await supabase.from('shared_trip_items').insert({ trip_id: tr.id, place_id: placeId, added_by: me!.id });
    if (error && error.code !== '23505') toast(/trip_full/.test(error.message) ? 'Liste dolu (en fazla 50 yer).' : trError(error));
    else toast('{1} listesine eklendi', tr.title);
    onClose();
  }
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={{ backgroundColor: C.surface, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 16, paddingBottom: 30 }}>
          <Text style={[b.h2, { fontSize: 18 }]}>{t('Ortak listeye ekle')}</Text>
          {!me ? <Text style={b.fine}>{t('Ortak liste için giriş yap')}</Text> : list === null ? <ActivityIndicator color={C.accent} /> : (
            <>
              {list.map((tr) => <Pressable key={tr.id} onPress={() => pick(tr)} style={b.row}><Text style={{ fontSize: 18 }}>👥</Text><Text style={[b.rowN, { flex: 1 }]}>{tr.title}</Text><Text style={{ color: C.accent, fontWeight: '900' }}>＋</Text></Pressable>)}
              {!list.length && <Text style={b.fine}>{t('Henüz ortak listen yok.')}</Text>}
              <Btn label={`＋ ${t('Yeni ortak liste')}`} onPress={() => { onClose(); push({ name: 'sharedTrips' }); }} style={{ marginTop: 10 }} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* =========================================================================
   Yıllık gezi özeti (paylaşılabilir kart)
   ========================================================================= */
export function YearScreen() {
  const { t, num } = useT();
  const { me } = useAuth();
  const { byId } = useStore();
  const toast = useToast();
  const card = useRef<any>(null);
  const year = new Date().getFullYear();
  const [d, setD] = useState<null | { visits: Place[]; reviews: number; photos: number; likes: number; journals: number; top?: { url: string; likes: number; n: string } }>(null);
  useEffect(() => {
    if (!me) return;
    const from = `${year}-01-01`, to = `${year + 1}-01-01`;
    Promise.all([
      supabase.from('visits').select('place_id,created_at').eq('user_id', me.id).gte('created_at', from).lt('created_at', to),
      supabase.from('reviews').select('id,place_id,photo_path,photo_hidden,photo_pending,created_at,photo_likes(user_id),review_likes(user_id)').eq('user_id', me.id).gte('created_at', from).lt('created_at', to),
      supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', me.id).gte('created_at', from).lt('created_at', to),
    ]).then(([v, r, j]) => {
      const visits = ((v.data as any[]) || []).map((x) => byId(x.place_id)).filter(Boolean) as Place[];
      const revs = (r.data as any[]) || [];
      const photos = revs.filter((x) => x.photo_path && !x.photo_hidden && !x.photo_pending);
      const likes = revs.reduce((a, x) => a + (x.photo_likes?.length || 0) + (x.review_likes?.length || 0), 0);
      const best = photos.sort((a, c) => (c.photo_likes?.length || 0) - (a.photo_likes?.length || 0))[0];
      setD({ visits, reviews: revs.length, photos: photos.length, likes, journals: j.count || 0, top: best ? { url: publicUrl(best.photo_path) || '', likes: best.photo_likes?.length || 0, n: byId(best.place_id)?.n || '' } : undefined });
    }, () => setD({ visits: [], reviews: 0, photos: 0, likes: 0, journals: 0 }));
  }, [me?.id, year]); // eslint-disable-line
  if (!me) return <Screen title={t('Yıllık gezi özeti')}><Empty title={t('Özetini görmek için giriş yap')} /></Screen>;
  if (!d) return <Screen title={t('Yıllık gezi özeti')}><ActivityIndicator color={C.accent} /></Screen>;
  const prov = new Set(d.visits.map((p) => p.il)), regs = new Set(d.visits.map((p) => p.r));
  const cats: Record<string, number> = {}; d.visits.forEach((p) => { cats[p.c] = (cats[p.c] || 0) + 1; });
  const topCat = Object.entries(cats).sort((a, c) => c[1] - a[1])[0];
  const topIl = Object.entries(d.visits.reduce((a: Record<string, number>, p) => { a[p.il] = (a[p.il] || 0) + 1; return a; }, {})).sort((a, c) => c[1] - a[1])[0];
  async function share() {
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('{1} gezi özetim', String(year)) });
      else throw new Error('no-share');
    } catch {
      try { await Share.share({ message: `${t('{1} gezi özetim', String(year))}: ${t('{1} yer', num(d!.visits.length))}, ${t('{1} il', num(prov.size))} 🇹🇷` }); } catch { toast('Bir hata oluştu, lütfen tekrar dene.'); }
    }
  }
  const Stat = ({ v, l }: { v: number; l: string }) => (
    <View style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: R.md, padding: 12 }}>
      <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900' }}>{num(v)}</Text>
      <Text style={{ color: '#FFE8DC', fontWeight: '700' }}>{t(l)}</Text>
    </View>
  );
  return (
    <Screen title={t('Yıllık gezi özeti')}>
      <View ref={card} collapsable={false} style={{ backgroundColor: '#B23A1E', borderRadius: R.lg, padding: 18 }}>
        <Text style={{ color: '#FFE8DC', fontWeight: '800', letterSpacing: 1 }}>{t('Türkiye Gezi Rehberi')}</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 2 }}>{t('{1} gezi özetim', String(year))}</Text>
        <Text style={{ color: '#FFE8DC', marginTop: 2 }}>{me.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'space-between' }}>
          <Stat v={d.visits.length} l="Gezilen yer" /><Stat v={prov.size} l="İl" /><Stat v={regs.size} l="Bölge" /><Stat v={d.reviews} l="Yorum" /><Stat v={d.photos} l="Fotoğraf" /><Stat v={d.likes} l="Aldığın beğeni" />
        </View>
        {!!topIl && <Text style={{ color: '#FFFFFF', marginTop: 12, fontWeight: '700' }}>{`📍 ${t('En çok gezdiğin il: {1}', topIl[0])}`}</Text>}
        {!!topCat && <Text style={{ color: '#FFFFFF', marginTop: 4, fontWeight: '700' }}>{`⭐ ${t('En sevdiğin tür: {1}', t(catName(topCat[0])))}`}</Text>}
        {!!d.journals && <Text style={{ color: '#FFFFFF', marginTop: 4, fontWeight: '700' }}>{`📔 ${t('{1} günlük notu', num(d.journals))}`}</Text>}
        {d.top && !!d.top.url && (
          <View style={{ marginTop: 12 }}>
            <Image source={{ uri: d.top.url }} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Text style={{ color: '#FFE8DC', marginTop: 4 }}>{`${t('En beğenilen fotoğrafın')} · ${d.top.n} · ♥ ${num(d.top.likes)}`}</Text>
          </View>
        )}
      </View>
      {d.visits.length === 0 && <Text style={b.fine}>{t('Bu yıl henüz “Gittim” işaretlediğin yer yok. Gezdikçe özetin dolacak.')}</Text>}
      <Btn kind="pri" label={`↗ ${t('Özetimi paylaş')}`} onPress={share} style={{ marginTop: 14 }} />
    </Screen>
  );
}

/* =========================================================================
   Koleksiyonlar
   ========================================================================= */
export function CollectionsScreen() {
  const { t, num } = useT();
  const { places, visited, byId } = useStore();
  const { push } = useNav();
  const rows = useMemo(() => COLLECTIONS.map((c) => ({ c, pr: progress(c, places, visited, byId) })), [places, visited, byId]);
  const done = rows.filter((r) => r.pr.total && r.pr.done === r.pr.total);
  return (
    <Screen title={t('Koleksiyonlar')}>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Listeleri tamamla, rozetini al. “Gittim” işaretledikçe ilerler.')}</Text>
      {done.length > 0 && <Text style={[b.boxH, { marginTop: 12 }]}>{`🏅 ${t('Tamamladıkların')}: ${done.map((r) => t(r.c.name)).join(', ')}`}</Text>}
      {rows.map(({ c, pr }) => (
        <Pressable key={c.id} onPress={() => push({ name: 'collection', id: c.id })} style={({ pressed }) => [b.card, pressed && { opacity: 0.85 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>{c.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{`${t(c.name)}${pr.total && pr.done === pr.total ? ' 🏅' : ''}`}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{t(c.desc)}</Text>
            </View>
            <Text style={{ color: C.ink, fontWeight: '900' }}>{`${num(pr.done)}/${num(pr.total)}`}</Text>
          </View>
          <Bar pct={pr.total ? (pr.done / pr.total) * 100 : 0} />
        </Pressable>
      ))}
    </Screen>
  );
}
export function CollectionScreen({ id }: { id: string }) {
  const { t, num } = useT();
  const { places, visited, byId } = useStore();
  const { push } = useNav();
  const c = COLLECTIONS.find((x) => x.id === id);
  if (!c) return <Screen title={t('Koleksiyonlar')}><Empty title={t('Bulunamadı.')} /></Screen>;
  const pr = progress(c, places, visited, byId);
  return (
    <Screen title={t(c.name)}>
      <Text style={{ fontSize: 40, textAlign: 'center' }}>{c.icon}</Text>
      <Text style={{ textAlign: 'center', color: C.ink, fontWeight: '900', fontSize: 18 }}>{`${num(pr.done)} / ${num(pr.total)}`}</Text>
      <Bar pct={pr.total ? (pr.done / pr.total) * 100 : 0} />
      {pr.done === pr.total && pr.total > 0 && <Text style={{ textAlign: 'center', marginTop: 8, color: C.accent, fontWeight: '800' }}>{`🏅 ${t('Tebrikler, bu koleksiyonu tamamladın!')}`}</Text>}
      {pr.items.map((it) => {
        const first = byId(it.ids.find((x) => visited.has(x)) || it.ids[0]);
        return (
          <Pressable key={it.label} onPress={() => first && push({ name: 'place', id: first.id })} style={b.row}>
            <Text style={{ fontSize: 18, width: 24 }}>{it.ok ? '✅' : '⬜'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={b.rowN} numberOfLines={1}>{c.regions ? t(it.label) : it.label}</Text>
              {(c.groups || c.regions) && first && <Text style={b.rowM} numberOfLines={1}>{c.regions ? `${num(it.ids.length)} ${t('yer')}` : `${first.n} · ${first.il}`}</Text>}
            </View>
            <Text style={{ color: C.muted }}>›</Text>
          </Pressable>
        );
      })}
      {c.id === 'unesco' && <Text style={b.fine}>{t('Liste UNESCO’nun 2023 itibarıyla Türkiye’deki 21 Dünya Mirası alanına göredir.')}</Text>}
    </Screen>
  );
}

/* =========================================================================
   "Neresi bu?" oyunu: fotoğraftan yeri bil. Günlük 5 soru herkes için aynı; skor tablosu.
   ========================================================================= */
const trDay = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hash = (s: string) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
type QQ = { p: Place; opts: Place[] };
function makeQuiz(all: Place[], n: number, seed?: string): QQ[] {
  const pool = all.filter((p) => !p.closed && photoOf(p.id));
  const r = seed ? rng(hash(seed)) : Math.random;
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const qs: QQ[] = []; const used = new Set<string>();
  let guard = 0;
  while (qs.length < n && guard++ < 500) {
    const p = pick(pool); if (!p || used.has(p.id)) continue; used.add(p.id);
    const others = all.filter((x) => x.id !== p.id && x.il !== p.il && !x.closed);
    const same = others.filter((x) => x.c === p.c);
    const opts = [p];
    let g2 = 0;
    while (opts.length < 4 && g2++ < 200) { const o = pick(same.length >= 6 ? same : others); if (o && !opts.some((x) => x.id === o.id || x.n === o.n)) opts.push(o); }
    if (opts.length < 4) continue;
    opts.sort(() => r() - 0.5);
    qs.push({ p, opts });
  }
  return qs;
}
export function QuizScreen() {
  const { t, num } = useT();
  const { places } = useStore();
  const { me } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'daily' | 'free'>('daily');
  const [qs, setQs] = useState<QQ[]>([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [ans, setAns] = useState<string | null>(null);
  const [t0, setT0] = useState(Date.now());
  const [doneDaily, setDoneDaily] = useState<number | null>(null);
  const [top, setTop] = useState<{ score: number; ms: number; profiles: { name: string } | null }[] | null>(null);
  const [best, setBest] = useState(0);
  const day = trDay();
  const loadTop = useCallback(() => {
    supabase.from('quiz_scores').select('score,ms,profiles(name)').eq('day', day).order('score', { ascending: false }).order('ms', { ascending: true }).limit(20)
      .then(({ data }) => setTop((data as any[]) || []), () => setTop([]));
  }, [day]);
  useEffect(() => {
    AsyncStorage.getItem('gezi-quiz').then((raw) => { try { const j = JSON.parse(raw || '{}'); if (j.day === day) setDoneDaily(j.score); setBest(j.best || 0); } catch { /* */ } }).catch(() => {});
    loadTop();
  }, [day, loadTop]);
  function start(m: 'daily' | 'free') {
    setMode(m); setQs(makeQuiz(places, m === 'daily' ? 5 : 10, m === 'daily' ? day : undefined)); setI(0); setScore(0); setAns(null); setT0(Date.now());
  }
  async function finish(final: number) {
    const ms = Date.now() - t0;
    if (mode === 'daily') {
      setDoneDaily(final);
      AsyncStorage.setItem('gezi-quiz', JSON.stringify({ day, score: final, best: Math.max(best, final) })).catch(() => {});
      if (me) { const { error } = await supabase.from('quiz_scores').insert({ user_id: me.id, day, score: final, ms: Math.min(ms, 3600000) }); if (error && error.code !== '23505') toast(trError(error)); loadTop(); }
    } else if (final > best) { setBest(final); AsyncStorage.setItem('gezi-quiz', JSON.stringify({ day: doneDaily !== null ? day : '', score: doneDaily, best: final })).catch(() => {}); }
  }
  function choose(p: Place) {
    if (ans) return;
    const ok = p.id === qs[i].p.id, s = score + (ok ? 1 : 0);
    setAns(p.id); setScore(s);
    setTimeout(() => { if (i + 1 >= qs.length) { finish(s); setQs([]); } else { setI(i + 1); setAns(null); } }, 1100);
  }
  const q = qs[i];
  if (q) {
    const ph = photoOf(q.p.id)!;
    return (
      <Screen title={t('Neresi bu?')}>
        <Text style={{ color: C.muted, fontWeight: '700' }}>{`${t('Soru {1}/{2}', num(i + 1), num(qs.length))} · ${t('Puan {1}', num(score))}`}</Text>
        <Image source={photoSrc(ph.url(960))} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.md, marginTop: 8, backgroundColor: C.line }} resizeMode="cover" />
        <Text style={[b.fine, { marginTop: 4 }]}>{`© ${ph.author} · ${ph.license}`}</Text>
        {q.opts.map((o) => {
          const right = ans && o.id === q.p.id, wrong = ans === o.id && o.id !== q.p.id;
          return (
            <Pressable key={o.id} onPress={() => choose(o)} style={[b.card, { paddingVertical: 12 }, right && { borderColor: '#1E8E3E', backgroundColor: '#E6F4EA' }, wrong && { borderColor: C.danger, backgroundColor: '#FDECEA' }]}>
              <Text style={{ color: right || wrong ? '#111111' : C.ink, fontWeight: '800', fontSize: 16 }}>{`${right ? '✓ ' : wrong ? '✗ ' : ''}${o.n}`}</Text>
              <Text style={{ color: right || wrong ? '#444444' : C.muted, fontSize: 13 }}>{o.il}</Text>
            </Pressable>
          );
        })}
      </Screen>
    );
  }
  return (
    <Screen title={t('Neresi bu?')}>
      <Text style={{ fontSize: 44, textAlign: 'center' }}>📸</Text>
      <Text style={{ color: C.muted, textAlign: 'center', lineHeight: 20 }}>{t('Fotoğrafa bak, Türkiye’nin neresi olduğunu bil.')}</Text>
      <View style={[b.card, { marginTop: 14 }]}>
        <Text style={[b.boxH]}>{t('Günün sorusu')}</Text>
        <Text style={{ color: C.muted }}>{t('Herkes için aynı 5 fotoğraf; günde bir kez oynanır.')}</Text>
        {doneDaily !== null ? <Text style={{ color: C.ink, fontWeight: '900', fontSize: 18, marginTop: 8 }}>{t('Bugünkü puanın: {1}/5', num(doneDaily))}</Text>
          : <Btn kind="pri" label={t('Günün sorusunu oyna')} onPress={() => start('daily')} style={{ marginTop: 10 }} />}
        {!me && <Text style={b.fine}>{t('Skor tablosuna girmek için giriş yap.')}</Text>}
      </View>
      <View style={b.card}>
        <Text style={b.boxH}>{t('Serbest oyun')}</Text>
        <Text style={{ color: C.muted }}>{t('Rastgele 10 fotoğraf. En iyi skorun: {1}/10', num(best))}</Text>
        <Btn label={t('Oyna')} onPress={() => start('free')} style={{ marginTop: 10 }} />
      </View>
      <Text style={[b.h2, { fontSize: 18, marginTop: 16 }]}>{t('Bugünün skor tablosu')}</Text>
      {top === null ? <ActivityIndicator color={C.accent} /> : !top.length ? <Text style={b.fine}>{t('Bugün henüz kimse oynamadı.')}</Text> : top.map((r, k) => (
        <View key={k} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={{ width: 30, color: C.muted, fontWeight: '800' }}>{k + 1}</Text>
          <Text style={{ flex: 1, color: C.ink, fontWeight: '700' }} numberOfLines={1}>{r.profiles?.name || '?'}</Text>
          <Text style={{ color: C.ink, fontWeight: '900' }}>{`${num(r.score)}/5`}</Text>
          <Text style={{ color: C.muted, width: 64, textAlign: 'right' }}>{`${num(Math.round(r.ms / 1000))} sn`}</Text>
        </View>
      ))}
      <Text style={b.fine}>{t('Fotoğraflar: Wikimedia Commons')}</Text>
    </Screen>
  );
}

/* =========================================================================
   Yürüyüş parkurları (iz OpenStreetMap'ten, telefondan istenir)
   ========================================================================= */
type Trail = { id: string; n: string; km: number | null; days: string; season: string; lvl: number; from: string; to: string; a: [number, number] | null; b: [number, number] | null; osm: string; bbox: string; d: string };
const TR_LIST = (TRAILS as unknown as { list: Trail[] }).list;
const SEASON: Record<string, string> = { ilkbahar: 'İlkbahar', yaz: 'Yaz', sonbahar: 'Sonbahar', kis: 'Kış' };
const LVL = ['', 'Kolay', 'Orta', 'Zor'];
export function TrailsScreen() {
  const { t, num } = useT();
  const { push } = useNav();
  return (
    <Screen title={t('Yürüyüş parkurları')}>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Türkiye’nin işaretli uzun yürüyüş yolları ve vadileri.')}</Text>
      {TR_LIST.map((x) => (
        <Pressable key={x.id} onPress={() => push({ name: 'trail', id: x.id })} style={({ pressed }) => [b.card, pressed && { opacity: 0.85 }]}>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>{`🥾 ${x.n}`}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }}>{[x.km ? `${num(x.km)} km` : '', x.days ? t('{1} gün', x.days) : '', t(LVL[x.lvl]), x.season.split(',').map((s) => t(SEASON[s])).join(', ')].filter(Boolean).join(' · ')}</Text>
          <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>{`${x.from} → ${x.to}`}</Text>
        </Pressable>
      ))}
      <Text style={b.fine}>{(TRAILS as { src: string }).src}</Text>
    </Screen>
  );
}
export function TrailScreen({ id }: { id: string }) {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const cam = useRef<CameraRef>(null);
  const x = TR_LIST.find((y) => y.id === id);
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'none'>('idle');
  useEffect(() => {
    if (!x || !x.osm) return;
    setState('loading');
    overpass(`[out:json][timeout:25];relation["route"="hiking"]["name"~"${x.osm}",i](${x.bbox});out geom;`, 25000).then((els) => {
      const lines: number[][][] = [];
      for (const e of els) for (const m of e.members || []) if (m.type === 'way' && m.geometry) lines.push(m.geometry.map((g: any) => [g.lon, g.lat]));
      if (!lines.length) { setState('none'); return; }
      setGeo({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } }] });
      const xs = lines.flat().map((p) => p[0]), ys = lines.flat().map((p) => p[1]);
      cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 30, right: 30, bottom: 30, left: 30 }, duration: 600 });
      setState('idle');
    }, () => setState('none'));
  }, [x]);
  if (!x) return <Screen title={t('Yürüyüş parkurları')}><Empty title={t('Bulunamadı.')} /></Screen>;
  const pts = [x.a, x.b].filter(Boolean) as [number, number][];
  const center = pts[0] || pts[1];
  const ends: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: pts.map((p, k) => ({ type: 'Feature', properties: { k }, geometry: { type: 'Point', coordinates: [p[1], p[0]] } })) as any };
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={x.n} />
      <View style={{ height: '40%' }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} logo={false} compass={false} touchPitch={false}>
          <Camera ref={cam} initialViewState={pts.length > 1 ? { bounds: [Math.min(pts[0][1], pts[1][1]), Math.min(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0])], padding: { top: 40, right: 40, bottom: 40, left: 40 } } : { center: [center[1], center[0]], zoom: 9 }} />
          {geo && <GeoJSONSource id="trail" data={geo}><Layer type="line" id="trail-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#C0392B', 'line-width': 3.5 }} /></GeoJSONSource>}
          <GeoJSONSource id="trail-ends" data={ends}><Layer type="circle" id="trail-dot" paint={{ 'circle-radius': 7, 'circle-color': ['match', ['get', 'k'], 0, '#1E8E3E', '#C0392B'], 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' }} /></GeoJSONSource>
        </Map>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.ink, fontWeight: '900', fontSize: 20 }}>{x.n}</Text>
        <Text style={{ color: C.muted, marginTop: 2 }}>{[x.km ? `${num(x.km)} km` : '', x.days ? t('{1} gün', x.days) : '', t(LVL[x.lvl])].filter(Boolean).join(' · ')}</Text>
        <Text style={{ color: C.ink, marginTop: 10, lineHeight: 21 }}>{t(x.d)}</Text>
        <View style={b.box}>
          <Text style={b.boxT}>{`🟢 ${t('Başlangıç')}: ${x.from}`}</Text>
          <Text style={b.boxT}>{`🔴 ${t('Bitiş')}: ${x.to}`}</Text>
          <Text style={b.boxT}>{`🗓 ${t('En iyi mevsim')}: ${x.season.split(',').map((s) => t(SEASON[s])).join(', ')}`}</Text>
        </View>
        {state === 'loading' && <Text style={b.fine}>{t('Parkur izi OpenStreetMap’ten yükleniyor…')}</Text>}
        {state === 'none' && x.osm && <Text style={b.fine}>{t('Parkur izi şu an yüklenemedi; haritada başlangıç ve bitiş noktaları gösteriliyor.')}</Text>}
        {geo && <Text style={b.fine}>{t('Parkur izi: © OpenStreetMap katkıcıları. Yürümeden önce güncel işaretleri ve hava durumunu kontrol et.')}</Text>}
        {center && <Btn label={t('Google Haritalar’da aç')} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center[0]},${center[1]}`)} style={{ marginTop: 12 }} />}
        <Btn kind="ghost" label={t('Culture Routes in Turkey sitesinde aç')} onPress={() => Linking.openURL('https://cultureroutesinturkey.com/')} style={{ marginTop: 4 }} />
        <Text style={[b.fine, { marginTop: 10 }]}>{t('Uzun parkurlarda yanında yeterli su taşı, birine güzergâhını haber ver ve yaz sıcağında öğle saatlerinde yürüme.')}</Text>
      </ScrollView>
    </View>
  );
}

/* =========================================================================
   Mavi Bayrak (app_settings.blue_flag)
   ========================================================================= */
type BF = { [year: string]: string[] } & { area?: string[] };
let bfCache: BF | null = null;
async function loadBF(): Promise<BF> {
  if (bfCache) return bfCache;
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'blue_flag').maybeSingle();
    bfCache = JSON.parse((data as any)?.value || '{}'); AsyncStorage.setItem('gezi-bf', JSON.stringify(bfCache)).catch(() => {});
  } catch { try { bfCache = JSON.parse((await AsyncStorage.getItem('gezi-bf')) || '{}'); } catch { bfCache = {}; } }
  return bfCache!;
}
function bfYear(bf: BF | null, id: string): string | null {
  if (!bf) return null;
  const ys = Object.keys(bf).filter((k) => /^\d{4}$/.test(k)).sort().reverse();
  return ys.find((y) => bf[y].includes(id)) || null;
}
export function useBlueFlag() {
  const [bf, setBf] = useState<BF | null>(bfCache);
  useEffect(() => { loadBF().then(setBf); }, []);
  return bf;
}
export function BlueFlagBox({ p }: { p: Place }) {
  const { t } = useT();
  const bf = useBlueFlag();
  const y = bfYear(bf, p.id);
  if (!y) return null;
  const area = bf?.area?.includes(p.id);
  return (
    <View style={[b.box, { borderColor: '#1F6FEB' }]}>
      <Text style={b.boxH}>{`🏳️ ${t('Mavi Bayrak')}`}</Text>
      <Text style={b.boxT}>{area ? t('Bu bölgede {1} listesinde Mavi Bayrak almış plaj var.', y) : t('{1} listesinde Mavi Bayrak almış.', y)}</Text>
      <Text style={b.fine}>{t('Mavi Bayrak her yıl yeniden verilir; güncel durum için mavibayrak.org.tr adresine bak.')}</Text>
    </View>
  );
}
export function BlueFlagScreen() {
  const { t } = useT();
  const { byId } = useStore();
  const { push } = useNav();
  const bf = useBlueFlag();
  const ids = bf ? [...new Set(Object.keys(bf).filter((k) => /^\d{4}$/.test(k)).sort().reverse().flatMap((y) => bf[y]))] : [];
  return (
    <Screen title={t('Mavi Bayraklı plajlar')}>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Rehberdeki plajlardan Mavi Bayrak listelerinde yer alanlar. Mavi Bayrak; temiz su, güvenlik ve çevre yönetimi ölçütlerine göre her yıl verilir.')}</Text>
      {!bf ? <ActivityIndicator color={C.accent} /> : ids.map((id) => byId(id)).filter(Boolean).map((p) => <PlaceRow key={p!.id} p={p!} hot={`🏳️ ${bfYear(bf, p!.id)}`} onPress={() => push({ name: 'place', id: p!.id })} />)}
      <Btn kind="ghost" label="mavibayrak.org.tr" onPress={() => Linking.openURL('https://www.mavibayrak.org.tr/')} style={{ marginTop: 10 }} />
    </Screen>
  );
}

/* =========================================================================
   Fotoğraf noktaları: altın saat + yakındaki seyir noktaları (OpenStreetMap)
   ========================================================================= */
const NATURE = new Set(['gol', 'dag', 'plaj', 'sahil', 'kanyon', 'selale', 'ada', 'olusum', 'seyir', 'park', 'kasaba', 'kale', 'antik', 'kule', 'mahalle']);
export function PhotoSpotBox({ p }: { p: Place }) {
  const { t, num } = useT();
  const [spots, setSpots] = useState<{ n: string; lat: number; lng: number; d: number }[] | null>(null);
  const [open, setOpen] = useState(false);
  const s = sunTimes(p.lat, p.lng);
  if (!s.rise || !s.set) return null;
  const H = 3600e3;
  async function find() {
    setOpen(true); if (spots) return;
    try {
      const els = await overpass(`[out:json][timeout:15];nwr(around:3000,${p.lat},${p.lng})[tourism=viewpoint];out center 40;`, 15000);
      const list = els.map((e: any) => ({ n: e.tags?.name || '', lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon })).filter((x: any) => x.lat != null)
        .map((x: any) => ({ ...x, d: meters(p.lat, p.lng, x.lat, x.lng) })).sort((a: any, c: any) => a.d - c.d).slice(0, 6);
      setSpots(list);
    } catch { setSpots([]); }
  }
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`📷 ${t('Fotoğraf için en iyi saatler')}`}</Text>
      <Text style={b.boxT}>{`🌅 ${t('Sabah altın saati')}: ${trClock(s.rise)}–${trClock(s.rise + H)}`}</Text>
      <Text style={b.boxT}>{`🌇 ${t('Akşam altın saati')}: ${trClock(s.set - H)}–${trClock(s.set)}`}</Text>
      <Text style={b.boxT}>{`🌆 ${t('Mavi saat')}: ${trClock(s.set)}–${trClock(s.set + 0.5 * H)}`}</Text>
      {NATURE.has(p.c) && (!open ? <Pressable onPress={find} hitSlop={6} style={{ marginTop: 8 }}><Text style={{ color: C.link, fontWeight: '700' }}>{`🔭 ${t('Yakındaki seyir noktaları')}`}</Text></Pressable> : (
        <View style={{ marginTop: 8 }}>
          {spots === null ? <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start' }} /> : !spots.length ? <Text style={b.fine}>{t('3 km içinde işaretli seyir noktası bulunamadı.')}</Text> : spots.map((x, k) => (
            <Pressable key={k} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lng}`)} style={{ paddingVertical: 5 }}>
              <Text style={{ color: C.ink, fontWeight: '700' }}>{`🔭 ${x.n || t('Seyir noktası')} · ${fmtDist(x.d, num)}`}</Text>
            </Pressable>
          ))}
          {!!spots?.length && <Text style={b.fine}>© OpenStreetMap</Text>}
        </View>
      ))}
      <Text style={b.fine}>{t('Saatler bugüne göre, Türkiye saatiyle.')}</Text>
    </View>
  );
}

/* =========================================================================
   Valiz listesi: bölge ve mevsime göre; işaretler telefonda saklanır
   ========================================================================= */
type PackOpts = { region: number; month: number; days: number; acts: string[] };
const ACTS: [string, string, string][] = [['deniz', '🏖', 'Deniz ve plaj'], ['yuruyus', '🥾', 'Doğa yürüyüşü'], ['cami', '🕌', 'Cami ziyareti'], ['kar', '⛷', 'Kar ve kayak'], ['balon', '🎈', 'Balon turu']];
function packItems(o: PackOpts): [string, string[]][] {
  const winter = [11, 0, 1, 2].includes(o.month), summer = [5, 6, 7, 8].includes(o.month), cold = winter || [3, 9, 10].includes(o.month);
  const east = o.region === 5 || o.region === 3, bs = o.region === 4;
  const g: [string, string[]][] = [
    ['Belgeler', ['Kimlik ya da pasaport', 'Ehliyet (araç kullanacaksan)', 'Kredi kartı ve biraz nakit TL', 'Konaklama ve bilet bilgileri', 'Seyahat sağlık sigortası (yabancıysan)']],
    ['Giyim', [`${o.days} günlük iç çamaşırı ve çorap`, 'Rahat yürüyüş ayakkabısı', 'Gece için hafif bir üst',
      ...(cold ? ['Mont ya da kalın ceket', 'Kazak', 'Bere ve eldiven'] : []), ...(summer ? ['Şapka', 'İnce ve açık renkli giysiler'] : []),
      ...(bs ? ['Yağmurluk ve su geçirmez ayakkabı'] : []), ...(east && winter ? ['Termal iç giyim', 'Kar botu'] : [])]],
    ['Sağlık ve bakım', ['Kişisel ilaçların', 'Ağrı kesici ve yara bandı', 'Diş fırçası ve macun', 'Islak mendil ve el dezenfektanı', ...(summer || o.acts.includes('deniz') ? ['Güneş kremi (SPF 30+)', 'Sinek kovucu'] : [])]],
    ['Elektronik', ['Telefon ve şarj aleti', 'Taşınabilir şarj cihazı', 'Çevrimdışı harita (uygulamadan indir)']],
  ];
  if (o.acts.includes('deniz')) g.push(['Deniz', ['Mayo', 'Plaj havlusu', 'Deniz ayakkabısı', 'Güneş gözlüğü']]);
  if (o.acts.includes('yuruyus')) g.push(['Yürüyüş', ['Su matarası', 'Küçük sırt çantası', 'Kuru yiyecek', 'Yürüyüş sopası', 'El feneri']]);
  if (o.acts.includes('cami')) g.push(['Cami ziyareti', ['Başörtüsü ya da şal', 'Diz altına inen giysi', 'Kolay çıkarılan ayakkabı']]);
  if (o.acts.includes('kar')) g.push(['Kar ve kayak', ['Kayak montu ve pantolonu', 'Kayak gözlüğü', 'Su geçirmez eldiven', 'Yüz için güneş kremi']]);
  if (o.acts.includes('balon')) g.push(['Balon turu', ['Sabah ayazı için kalın üst', 'Kapalı ayakkabı']]);
  return g;
}
export function PackingScreen() {
  const { t, num } = useT();
  const [o, setO] = useState<PackOpts>({ region: 1, month: new Date().getMonth(), days: 3, acts: [] });
  const [chk, setChk] = useState<Record<string, boolean>>({});
  useEffect(() => { AsyncStorage.getItem('gezi-pack').then((raw) => { try { const j = JSON.parse(raw || '{}'); if (j.o) setO(j.o); if (j.chk) setChk(j.chk); } catch { /* */ } }).catch(() => {}); }, []);
  const save = (no: PackOpts, nc: Record<string, boolean>) => AsyncStorage.setItem('gezi-pack', JSON.stringify({ o: no, chk: nc })).catch(() => {});
  const set = (p: Partial<PackOpts>) => { const no = { ...o, ...p }; setO(no); save(no, chk); };
  const toggle = (k: string) => { const nc = { ...chk, [k]: !chk[k] }; setChk(nc); save(o, nc); };
  const groups = packItems(o);
  const all = groups.flatMap(([, xs]) => xs), done = all.filter((x) => chk[x]).length;
  const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return (
    <Screen title={t('Valiz listesi')}>
      <Text style={b.boxH}>{t('Nereye?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{REGION_NAMES.map((n, r) => <Chip key={n} label={t(n)} on={o.region === r} onPress={() => set({ region: r })} />)}</View>
      <Text style={[b.boxH, { marginTop: 12 }]}>{t('Ne zaman?')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{MONTHS.map((m, i) => <Chip key={m} label={t(m)} on={o.month === i} onPress={() => set({ month: i })} />)}</ScrollView>
      <Text style={[b.boxH, { marginTop: 12 }]}>{t('Kaç gün?')}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[2, 3, 5, 7, 10, 14].map((d) => <Chip key={d} label={num(d)} on={o.days === d} onPress={() => set({ days: d })} />)}</View>
      <Text style={[b.boxH, { marginTop: 12 }]}>{t('Neler yapacaksın?')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ACTS.map(([k, ic, l]) => <Chip key={k} label={`${ic} ${t(l)}`} on={o.acts.includes(k)} onPress={() => set({ acts: o.acts.includes(k) ? o.acts.filter((x) => x !== k) : [...o.acts, k] })} />)}</View>
      <Text style={{ color: C.ink, fontWeight: '900', marginTop: 16 }}>{t('{1}/{2} hazır', num(done), num(all.length))}</Text>
      <Bar pct={all.length ? (done / all.length) * 100 : 0} />
      {groups.map(([g, xs]) => (
        <View key={g} style={{ marginTop: 14 }}>
          <Text style={[b.h2, { fontSize: 16 }]}>{t(g)}</Text>
          {xs.map((x) => (
            <Pressable key={x} onPress={() => toggle(x)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }} accessibilityRole="checkbox" accessibilityState={{ checked: !!chk[x] }}>
              <Text style={{ fontSize: 18 }}>{chk[x] ? '☑️' : '⬜'}</Text>
              <Text style={{ color: chk[x] ? C.muted : C.ink, textDecorationLine: chk[x] ? 'line-through' : 'none', flex: 1 }}>{x.includes(' günlük ') ? t('{1} günlük iç çamaşırı ve çorap', num(o.days)) : t(x)}</Text>
            </Pressable>
          ))}
        </View>
      ))}
      <Btn kind="ghost" label={t('İşaretleri temizle')} onPress={() => { setChk({}); save(o, {}); }} style={{ marginTop: 12 }} />
    </Screen>
  );
}
