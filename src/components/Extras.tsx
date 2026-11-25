import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { useT } from '../i18n';
import { b } from './common';
import { bestMonths, inSeason, monthsText } from '../lib/season';
import { dishesOf } from '../data/dishes';
import { fold, type Place } from '../data/catalog';
import { photoOf } from '../data/photos';
import { MARKER_IMAGES } from '../data/markers';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { useLocation } from '../lib/location';
import { useNav } from '../lib/ui';
import { getWeather, wmo } from './Weather';
import { WX_TEXT, weatherPicks, wxMode } from '../lib/weatherpick';
import { C, R } from '../theme';

/* "En iyi zaman" kutusu; şu an mevsimiyse rozet */
export function SeasonBox({ p }: { p: Place }) {
  const { t, lang } = useT();
  const txt = monthsText(bestMonths(p), lang);
  if (!txt) return null;
  const now = inSeason(p);
  return (
    <View style={[b.box, now && { borderColor: C.ok }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={b.boxH}>{`🗓 ${t('En iyi zaman')}`}</Text>
        {now && <SeasonBadge />}
      </View>
      <Text style={b.boxT}>{txt}</Text>
    </View>
  );
}
export function SeasonBadge({ small }: { small?: boolean }) {
  const { t } = useT();
  return (
    <View style={{ backgroundColor: C.ok, borderRadius: R.pill, paddingHorizontal: small ? 7 : 9, paddingVertical: small ? 1 : 3 }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: small ? 11 : 12 }}>{t('Şimdi tam zamanı!')}</Text>
    </View>
  );
}

/* ilin yöresel lezzetleri: Türkçe adı (çevrilmez) + diğer dillerde kısa açıklama */
export function Dishes({ il, title }: { il: string; title?: boolean }) {
  const { t, lang } = useT();
  const list = dishesOf(il);
  if (!list.length) return null;
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🍲 ${title === false ? t('Yöresel lezzetler') : t('{1} yöresel lezzetleri', il)}`}</Text>
      {list.map(([tr, en]) => (
        <Text key={tr} style={[b.boxT, { marginTop: 3 }]}>
          <Text style={{ fontWeight: '700' }}>{`• ${tr}`}</Text>
          {lang !== 'tr' ? <Text style={{ color: C.muted }}>{` — ${en}`}</Text> : null}
        </Text>
      ))}
    </View>
  );
}

/* Yerin kapak fotoğrafı (Wikimedia Commons) + fotoğrafçı ve lisans; dokununca Commons sayfası açılır */
export function PlaceHero({ id, width, height, radius = 0, credit = true }: { id: string; width: number; height: number; radius?: number; credit?: boolean }) {
  const ph = photoOf(id);
  if (!ph) return null;
  return (
    <View>
      <Image source={{ uri: ph.url(width * 2) }} style={{ width, height, borderRadius: radius, backgroundColor: C.line }} resizeMode="cover" accessibilityIgnoresInvertColors />
      {credit && (
        <Pressable onPress={() => Linking.openURL(ph.page).catch(() => {})} hitSlop={6} accessibilityRole="link">
          <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>{`📷 ${ph.author} · ${ph.license} · Wikimedia Commons`}</Text>
        </Pressable>
      )}
    </View>
  );
}
/* listelerde küçük görsel: fotoğraf yoksa kategori simgesi */
export function PlaceThumb({ p, size = 56 }: { p: Place; size?: number }) {
  const ph = photoOf(p.id);
  const icon = (MARKER_IMAGES as Record<string, any>)[`cat_${p.c}`];
  return ph
    ? <Image source={{ uri: ph.url(size * 3) }} style={{ width: size, height: size, borderRadius: R.sm, backgroundColor: C.line }} />
    : <View style={{ width: size, height: size, borderRadius: R.sm, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}>
        {icon ? <Image source={icon} style={{ width: size * 0.6, height: size * 0.6 }} resizeMode="contain" /> : null}
      </View>;
}

/* Keşfet: bugünün havasına göre yakındaki öneriler (konum izni varsa) */
export function WeatherPicks() {
  const { t, num } = useT();
  const { places, stats } = useStore();
  const { pos, request } = useLocation();
  const { push } = useNav();
  const [w, setW] = useState<{ t: number; c: number } | null>(null);
  useEffect(() => {
    if (!pos) return; let live = true;
    getWeather(pos.lat, pos.lng).then((x) => { if (live) setW(x.now); }).catch(() => {});
    return () => { live = false; };
  }, [pos?.lat.toFixed(1), pos?.lng.toFixed(1)]); // eslint-disable-line
  const mode = w ? wxMode(w.c, w.t) : null;
  const picks = useMemo(() => (pos && mode ? weatherPicks(places, stats, pos, mode) : []), [pos?.lat.toFixed(2), pos?.lng.toFixed(2), mode, places]); // eslint-disable-line
  if (!pos) {
    return (
      <Pressable onPress={() => request().catch(() => {})} style={[b.box, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} accessibilityRole="button">
        <Text style={{ fontSize: 20 }}>🌤</Text><Text style={{ color: C.ink, fontWeight: '700', flex: 1 }}>{t('Konumuna göre bugünün önerileri')}</Text><Text style={{ color: C.muted }}>›</Text>
      </Pressable>
    );
  }
  if (!w || !picks.length) return null;
  const [ic] = wmo(w.c);
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`${ic} ${num(Math.round(w.t))}° · ${t('Bugün için öneriler')}`}</Text>
      <Text style={{ color: C.ink, fontWeight: '700' }}>{t(WX_TEXT[mode!])}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {picks.map(({ p, km }) => (
          <Pressable key={p.id} onPress={() => push({ name: 'place', id: p.id })} style={{ width: '22%', minWidth: 72 }} accessibilityRole="button">
            <PlaceThumb p={p} size={72} />
            <Text style={{ color: C.ink, fontSize: 12, fontWeight: '700', marginTop: 4 }} numberOfLines={2}>{p.n}</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{`${num(Math.max(1, Math.round(km)))} km`}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* Yakında ne yenir: yerin çevresindeki lokanta ve kafeler (OpenStreetMap). İlin yöresel lezzetlerinden birini sunan "Yöresel" rozeti alır. */
const CUISINE: Record<string, string> = {
  turkish: 'Türk mutfağı', kebab: 'Kebap', regional: 'Yöresel', fish: 'Balık', seafood: 'Balık', pizza: 'Pizza', burger: 'Burger',
  coffee_shop: 'Kahve', breakfast: 'Kahvaltı', pide: 'Pide', dessert: 'Tatlı', ice_cream: 'Dondurma', italian: 'İtalyan', chinese: 'Çin mutfağı',
  vegetarian: 'Vejetaryen', vegan: 'Vegan', meat: 'Et', steak_house: 'Et', sandwich: 'Sandviç', bakery: 'Fırın', tea: 'Çay', international: 'Dünya mutfağı',
};
const KIND: Record<string, string> = { restaurant: 'Restoran', cafe: 'Kafe', fast_food: 'Hızlı yemek' };
type Food = { n: string; k: string; c: string; lat: number; lng: number; d: number };
export function NearbyFood({ p }: { p: Place }) {
  const { t, num } = useT();
  const [items, setItems] = useState<Food[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true; setItems(null); setErr(false);
    supabase.functions.invoke('food', { body: { place_id: p.id } })
      .then((r: any) => { if (!live) return; if (r.error || !r.data?.items) setErr(true); else setItems(r.data.items); })
      .catch(() => live && setErr(true));
    return () => { live = false; };
  }, [p.id]);
  const local = useMemo(() => dishesOf(p.il).map(([tr]) => fold(tr).split(' ')[0]).filter((w) => w.length >= 4), [p.il]);
  if (err || (items && !items.length)) return null;
  const open = (f: Food) => Linking.openURL(`geo:${f.lat},${f.lng}?q=${f.lat},${f.lng}(${encodeURIComponent(f.n)})`)
    .catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`).catch(() => {}));
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🍽 ${t('Yakında ne yenir')}`}</Text>
      {!items ? <Text style={{ color: C.muted }}>{t('Yükleniyor…')}</Text> : items.slice(0, 8).map((f, i) => {
        const tags = f.c.split(';').map((x) => CUISINE[x.trim()]).filter(Boolean);
        const isLocal = local.some((w) => fold(`${f.n} ${f.c}`).includes(w)) || f.c.includes('regional');
        return (
          <Pressable key={i} onPress={() => open(f)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '700' }} numberOfLines={1}>{f.n}</Text>
              <Text style={{ color: C.muted, fontSize: 12.5 }} numberOfLines={1}>{[t(KIND[f.k] || 'Restoran'), ...tags.map((x) => t(x))].join(' · ')}</Text>
            </View>
            {isLocal && <View style={{ backgroundColor: C.soft, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: C.accent, fontSize: 11.5, fontWeight: '800' }}>{t('Yöresel')}</Text></View>}
            <Text style={{ color: C.muted, fontSize: 12.5 }}>{f.d < 1000 ? `${num(f.d)} m` : `${num(f.d / 1000, 1)} km`}</Text>
          </Pressable>
        );
      })}
      <Text style={[b.fine, { marginTop: 6 }]}>{t('Kaynak: OpenStreetMap katkıcıları. Açılış saatlerini gitmeden önce kontrol et.')}</Text>
    </View>
  );
}

/* Müze ve ören yerleri: ücretler sık değiştiği için rakam yazılmaz; resmi siteye yönlendirilir */
const MUZE_CATS = new Set(['muze', 'antik', 'saray']);
export function MuseumBox({ p }: { p: Place }) {
  const { t } = useT();
  if (!MUZE_CATS.has(p.c)) return null;
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🎟 ${t('Giriş ücreti ve Müzekart')}`}</Text>
      <Text style={b.boxT}>{t('Kültür ve Turizm Bakanlığına bağlı müze ve ören yerlerinin çoğuna Müzekart ile girilir. Bazı saraylar, belediye ve özel müzeler Müzekart kabul etmez.')}</Text>
      <Text style={[b.boxT, { marginTop: 6 }]}>{t('Ücretler yılda birkaç kez değişebilir; gitmeden önce güncel ücreti resmi siteden kontrol et.')}</Text>
      <Pressable onPress={() => Linking.openURL('https://muze.gov.tr').catch(() => {})} accessibilityRole="link" style={{ marginTop: 8 }}>
        <Text style={{ color: C.link, fontWeight: '700' }}>{`muze.gov.tr ↗`}</Text>
      </Pressable>
    </View>
  );
}

/* Erişilebilirlik: ziyaretçilerin işaretlemesiyle (2 evet, 1 kısmen, 0 hayır) */
const ACC: [number, string, string][] = [[2, '♿', 'Erişilebilir'], [1, '◐', 'Kısmen'], [0, '✕', 'Erişilemez']];
export function AccessBox({ p }: { p: Place }) {
  const { t, num } = useT();
  const [rows, setRows] = useState<{ val: number; user_id: string }[] | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from('place_access').select('val,user_id').eq('place_id', p.id).limit(500);
    setRows((data as any[]) || []);
  }, [p.id]);
  useEffect(() => { load(); supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id || null)).catch(() => {}); }, [load]);
  if (!rows) return null;
  const mine = rows.find((r) => r.user_id === uid)?.val;
  const cnt = [0, 1, 2].map((v) => rows.filter((r) => r.val === v).length);
  const top = rows.length ? [2, 1, 0].reduce((a, v) => (cnt[v] > cnt[a] ? v : a), 2) : -1;
  async function vote(v: number) {
    if (!uid || busy) return;
    setBusy(true);
    const q = mine === v ? supabase.from('place_access').delete().eq('place_id', p.id).eq('user_id', uid)
      : supabase.from('place_access').upsert({ place_id: p.id, user_id: uid, val: v });
    await q; setBusy(false); load();
  }
  const sum = top < 0 ? t('Henüz bilgi yok. Gittiysen tekerlekli sandalye ve bebek arabasıyla gezilebiliyor mu, işaretle.')
    : `${t(ACC.find((a) => a[0] === top)![2])} · ${t('{1} ziyaretçiye göre', num(rows.length))}`;
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`♿ ${t('Erişilebilirlik')}`}</Text>
      <Text style={b.boxT}>{sum}</Text>
      {uid && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {ACC.map(([v, ic, l]) => (
            <Pressable key={v} onPress={() => vote(v)} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: mine === v }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R.sm, borderWidth: 1, borderColor: mine === v ? C.accent : C.chipLine, backgroundColor: mine === v ? C.soft : 'transparent' }}>
              <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{`${ic} ${t(l)}${cnt[v] ? ` (${num(cnt[v])})` : ''}`}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={[b.fine, { marginTop: 6 }]}>{t('Ziyaretçilerin bildirdiği bilgidir; rampa, asansör ve uygun tuvalet için gitmeden önce yeri arayıp sor.')}</Text>
    </View>
  );
}
