import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { fmtDist, useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { fetchRoute, prepTrack, routeErrorText, RouteError, snap, type Profile, type RouteRes } from '../lib/routing';
import { ALONG_KINDS, MAX_STOPS, encodeRoute, fetchAlong, fromPlace, kindIcon, optimize, placesAlong, stopKey, type AlongItem, type Stop } from '../lib/stops';
import { SITE_URL } from '../lib/supabase';
import { catName, fold } from '../data/catalog';
import { Btn, Chip, Empty, Header, b } from '../components/common';
import { MAP_STYLE } from './MapScreen';
import { C, R } from '../theme';

type Mode = Profile | 'transit';
export const MODES: [Mode, string, string, string][] = [
  ['driving-car', '🚗', 'Araba', 'driving'], ['foot-walking', '🚶', 'Yürüyüş', 'walking'],
  ['cycling-regular', '🚲', 'Bisiklet', 'bicycling'], ['transit', '🚌', 'Toplu taşıma', 'transit'],
];
export const AVOIDS: [string, string][] = [['tollways', 'Paralı yol yok'], ['highways', 'Otoyol yok'], ['ferries', 'Feribot yok']];
const STAYS = [0, 15, 30, 60, 90, 120, 180];
export const fmtDur = (s: number, t: (k: string, ...a: any[]) => string, num: (n: number) => string) => {
  const h = Math.floor(s / 3600), m = Math.max(1, Math.round((s % 3600) / 60));
  return h ? t('{1} sa {2} dk', num(h), num(m)) : t('{1} dk', num(m));
};
export const clock = (d: Date, lang: string) => {
  try { return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }); } catch { return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }
};

/* Yol tarifi: tek yere ya da birden çok durağa. Durak eklenip çıkarılabilir, sırası değiştirilebilir,
   en kısa sıraya dizilebilir; yol üstü mola yerleri ve rotanın yakınındaki yerler önerilir. */
export default function RouteScreen({ id, ids, stops: initStops, mode: initMode, avoid: initAvoid }: { id?: string; ids?: string[]; stops?: Stop[]; mode?: string; avoid?: string[] }) {
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { byId, places } = useStore();
  const { pos, request } = useLocation();
  const { pop, push } = useNav();
  const cam = useRef<CameraRef>(null);
  const [stops, setStops] = useState<Stop[]>(() => (initStops && initStops.length ? initStops : (ids || (id ? [id] : [])).map((x) => byId(x)).filter(Boolean).map((p) => fromPlace(p!))).slice(0, MAX_STOPS));
  const multi = stops.length > 1;
  const [mode, setMode] = useState<Mode>((MODES.find((m) => m[0] === initMode)?.[0] as Mode) || 'driving-car');
  const [avoid, setAvoid] = useState<string[]>(initAvoid || []);
  const [route, setRoute] = useState<RouteRes | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(pos ? { lat: pos.lat, lng: pos.lng } : null);
  const [noLoc, setNoLoc] = useState(false);
  const [adding, setAdding] = useState(false);
  const [alongKind, setAlongKind] = useState<string | null>(null);
  const [along, setAlong] = useState<AlongItem[] | null>(null);
  const [alongBusy, setAlongBusy] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [depart] = useState(() => Date.now());

  useEffect(() => { if (!origin && pos) setOrigin({ lat: pos.lat, lng: pos.lng }); }, [pos, origin]);
  useEffect(() => {
    if (!origin) request().then((v) => v && setOrigin({ lat: v.lat, lng: v.lng })).catch((e) => { setNoLoc(true); if (stops.length < 2) { setState('error'); setErr(t(trError(e))); } });
    /* eslint-disable-next-line */
  }, []);

  const last = stops[stops.length - 1];
  const gmaps = (m: Mode) => {
    const tm = MODES.find((x) => x[0] === m)![3];
    const o = origin ? `&origin=${origin.lat},${origin.lng}` : `&origin=${stops[0].lat},${stops[0].lng}`;
    const mids = (origin ? stops.slice(0, -1) : stops.slice(1, -1)).slice(0, 9).map((p) => `${p.lat},${p.lng}`).join('|');
    const av = m === 'driving-car' && avoid.length ? `&avoid=${avoid.map((a) => (a === 'tollways' ? 'tolls' : a)).join('|')}` : '';
    return `https://www.google.com/maps/dir/?api=1${o}&destination=${last.lat},${last.lng}${mids ? `&waypoints=${encodeURIComponent(mids)}` : ''}&travelmode=${tm}${av}`;
  };
  const coords = useMemo<[number, number][]>(() => [...(origin ? [[origin.lng, origin.lat] as [number, number]] : []), ...stops.map((p) => [p.lng, p.lat] as [number, number])], [origin, stops]);
  const avoidKey = avoid.join(',');

  useEffect(() => {
    if (!stops.length || mode === 'transit' || coords.length < 2 || (!origin && !noLoc)) { if (coords.length < 2) setRoute(null); return; }
    let live = true;
    setState('loading');
    const h = setTimeout(() => {
      fetchRoute(mode, coords, lang, mode === 'driving-car' ? avoid : []).then((r) => {
        if (!live) return;
        setRoute(r); setState('idle'); setAlong(null);
        const cs = r.geometry.coordinates as [number, number][];
        const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
        cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 40, right: 40, bottom: 40, left: 40 }, duration: 600 });
      }).catch((e) => { if (live) { setState('error'); setErr(t(routeErrorText(e instanceof RouteError ? e.code : 'network'))); } });
    }, 350);
    return () => { live = false; clearTimeout(h); };
  }, [coords, mode, lang, noLoc, avoidKey]); // eslint-disable-line

  const track = useMemo(() => (route ? prepTrack(route.geometry) : null), [route]);

  // her durağa varış saati (durakta kalma süreleri eklenerek)
  const times = useMemo(() => {
    if (!route) return [] as { at: number; leg?: { d: number; t: number } }[];
    let tm = depart;
    return stops.map((s, i) => {
      const leg = route.legs[origin ? i : i - 1];
      if (leg) tm += leg.t * 1000;
      const at = tm;
      tm += (s.stay || 0) * 60000;
      return { at, leg };
    });
  }, [route, stops, origin, depart]);
  const totalStay = stops.reduce((a, s) => a + (s.stay || 0), 0);

  const near = useMemo(() => (track && mode !== 'foot-walking' ? placesAlong(track, places, new Set(stops.map((s) => s.id || '')), mode === 'driving-car' ? 8000 : 3000).slice(0, 40) : []), [track, places, stops, mode]);

  function move(i: number, d: number) {
    setStops((ss) => { const a = ss.slice(), j = i + d; if (j < 0 || j >= a.length) return ss; [a[i], a[j]] = [a[j], a[i]]; return a; });
  }
  function remove(i: number) { setStops((ss) => ss.filter((_, k) => k !== i)); }
  function cycleStay(i: number) { setStops((ss) => ss.map((s, k) => (k === i ? { ...s, stay: STAYS[(STAYS.indexOf(s.stay || 0) + 1) % STAYS.length] } : s))); }
  /* yeni durağı rotadaki yerine göre araya koy */
  function insert(s: Stop) {
    if (stops.length >= MAX_STOPS) { toast('En fazla {1} durak eklenebilir', MAX_STOPS); return; }
    if (stops.some((x) => stopKey(x) === stopKey(s))) { toast('Bu durak zaten rotada'); return; }
    setStops((ss) => {
      if (!track) return [...ss, s];
      const at = snap(track, s.lat, s.lng).along;
      const idx = ss.findIndex((x) => snap(track, x.lat, x.lng).along > at);
      const a = ss.slice(); a.splice(idx < 0 ? a.length : idx, 0, s); return a;
    });
    toast('{1} durak olarak eklendi', s.n || t('Durak'));
  }
  function reorder() {
    if (stops.length < 2) return;
    const o = optimize(origin, stops, true);
    if (o.map(stopKey).join() === stops.map(stopKey).join()) { toast('Duraklar zaten en kısa sırada'); return; }
    setStops(o); toast('Duraklar en kısa sıraya dizildi');
  }
  async function loadAlong(k: string) {
    if (alongKind === k) { setAlongKind(null); setAlong(null); return; }
    if (!track) return;
    setAlongKind(k); setAlongBusy(true); setAlong(null);
    try { setAlong(await fetchAlong(track, k === 'rest' ? ['rest', 'fuel'] : [k])); } catch { setAlong([]); toast('Mola yerleri şu an yüklenemedi'); }
    setAlongBusy(false);
  }
  async function share() {
    const url = `${SITE_URL.replace(/\/$/, '')}/?${encodeRoute(stops, mode === 'transit' ? 'driving-car' : mode, avoid)}`;
    try { await Share.share({ message: `${t('Rotam')} · ${stops.map((s) => s.n).join(' → ')}\n${url}`, title: t('Rotam') }); } catch { /* vazgeçti */ }
  }

  const line = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: route ? [{ type: 'Feature', properties: {}, geometry: route.geometry }] : [] }), [route]);
  const ends = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [
      ...(origin ? [{ type: 'Feature', properties: { k: 'o', n: '' }, geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] } }] : []),
      ...stops.map((p, i) => ({ type: 'Feature', properties: { k: p.id ? 'd' : 'm', n: multi ? String(i + 1) : '' }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
      ...(along || []).slice(0, 60).map((a) => ({ type: 'Feature', properties: { k: 'a', n: '' }, geometry: { type: 'Point', coordinates: [a.lng, a.lat] } })),
    ] as any,
  }), [origin, stops, multi, along]);

  if (!stops.length) return <View style={{ flex: 1, backgroundColor: C.screen }}><Header onBack={pop} /><Empty title={t('Rotada durak kalmadı.')} action={t('Durak ekle')} onAction={() => setAdding(true)} />
    <AddStop open={adding} onClose={() => setAdding(false)} onPick={(s) => { setStops([s]); setAdding(false); }} /></View>;
  const xs = [...stops.map((p) => p.lng), ...(origin ? [origin.lng] : [])], ys = [...stops.map((p) => p.lat), ...(origin ? [origin.lat] : [])];
  const canNav = !!origin && mode !== 'transit' && !!route && state === 'idle';
  const arrive = times.length ? times[times.length - 1].at : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={multi ? `${t('Yol tarifi')} · ${t('{1} durak', num(stops.length))}` : `${t('Yol tarifi')} · ${last.n}`}
        right={<Pressable onPress={share} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Rotayı paylaş')}><Text style={{ fontSize: 20, paddingHorizontal: 8 }}>↗</Text></Pressable>} />
      <View style={{ height: '36%' }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} touchRotate={false} touchPitch={false} compass={false} logo={false}>
          <Camera ref={cam} initialViewState={xs.length > 1 ? { bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], padding: { top: 40, right: 40, bottom: 40, left: 40 } } : { center: [last.lng, last.lat], zoom: 12 }} />
          <GeoJSONSource id="route" data={line}>
            <Layer type="line" id="route-casing" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }} />
            <Layer type="line" id="route-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#1F6FEB', 'line-width': 5 }} />
          </GeoJSONSource>
          <GeoJSONSource id="ends" data={ends}>
            <Layer type="circle" id="ends-dot" paint={{ 'circle-radius': ['match', ['get', 'k'], 'a', 5, multi ? 11 : 9], 'circle-stroke-width': ['match', ['get', 'k'], 'a', 2, 3], 'circle-stroke-color': '#FFFFFF', 'circle-color': ['match', ['get', 'k'], 'o', '#1F6FEB', 'm', '#7A4FD0', 'a', '#E08A00', C.accent] }} />
            <Layer type="symbol" id="ends-num" layout={{ 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true }} paint={{ 'text-color': '#FFFFFF' }} />
          </GeoJSONSource>
        </Map>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MODES.map(([k, icon, label]) => <Chip key={k} label={`${icon} ${t(label)}`} on={mode === k} onPress={() => (k === 'transit' ? Linking.openURL(gmaps('transit')) : setMode(k))} />)}
        </View>
        {mode === 'driving-car' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {AVOIDS.map(([k, label]) => <Chip key={k} label={`${avoid.includes(k) ? '✓ ' : ''}${t(label)}`} on={avoid.includes(k)} onPress={() => setAvoid((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]))} />)}
          </View>
        )}

        {state === 'loading' && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 18 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.muted }}>{t('Rota hesaplanıyor…')}</Text></View>}
        {state === 'error' && <View style={[b.box, { borderColor: C.danger }]}><Text style={{ color: C.ink, lineHeight: 21 }}>{err}</Text>{avoid.length > 0 && <Text style={[b.fine, { marginTop: 6 }]}>{t('Kaçınma seçeneklerini kapatıp tekrar dene.')}</Text>}</View>}
        {noLoc && <Text style={b.fine}>{t('Konumun alınamadığı için rota ilk duraktan başlıyor.')}</Text>}

        {route && state === 'idle' && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>{fmtDur(route.duration, t, num)}</Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>
              {`${fmtDist(route.distance, num)}${origin ? ` · ${t('Varış {1}', clock(new Date(arrive), lang))}` : ''}${totalStay ? ` · ${t('{1} mola dahil', fmtDur(totalStay * 60, t, num))}` : ''}`}
            </Text>
          </View>
        )}

        {/* duraklar */}
        <Text style={[b.h2, { fontSize: 18, marginTop: 18 }]}>{t('Duraklar')}</Text>
        <View style={s.stopRow}>
          <Text style={[s.num, { backgroundColor: '#1F6FEB' }]}>●</Text>
          <Text style={{ flex: 1, color: C.muted, fontWeight: '700' }}>{origin ? t('Başlangıç: konumun') : t('Başlangıç: ilk durak')}</Text>
          {origin && <Text style={{ color: C.muted }}>{clock(new Date(depart), lang)}</Text>}
        </View>
        {stops.map((p, i) => {
          const tm = times[i];
          return (
            <View key={stopKey(p)} style={s.stopRow}>
              <Text style={[s.num, !p.id && { backgroundColor: '#7A4FD0' }]}>{p.id ? i + 1 : kindIcon(p.k)}</Text>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => p.id && push({ name: 'place', id: p.id })} disabled={!p.id}>
                  <Text style={{ color: C.ink, fontWeight: '800' }} numberOfLines={1}>{p.n || t('Durak')}</Text>
                </Pressable>
                <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                  {[tm?.leg ? `${fmtDist(tm.leg.d, num)} · ${fmtDur(tm.leg.t, t, num)}` : '', tm && (origin || i > 0) ? t('Varış {1}', clock(new Date(tm.at), lang)) : ''].filter(Boolean).join(' · ')}
                </Text>
                <Pressable onPress={() => cycleStay(i)} style={s.stay} accessibilityRole="button">
                  <Text style={{ color: p.stay ? C.accent : C.muted, fontWeight: '700', fontSize: 12.5 }}>{p.stay ? `⏱ ${t('{1} kal', fmtDur(p.stay * 60, t, num))}` : `⏱ ${t('Kalma süresi ekle')}`}</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={s.mini} hitSlop={4} accessibilityLabel={t('Yukarı taşı')}><Text style={[s.miniT, i === 0 && { opacity: 0.25 }]}>↑</Text></Pressable>
              <Pressable onPress={() => move(i, 1)} disabled={i === stops.length - 1} style={s.mini} hitSlop={4} accessibilityLabel={t('Aşağı taşı')}><Text style={[s.miniT, i === stops.length - 1 && { opacity: 0.25 }]}>↓</Text></Pressable>
              <Pressable onPress={() => remove(i)} style={s.mini} hitSlop={4} accessibilityLabel={t('Durağı kaldır')}><Text style={[s.miniT, { color: C.danger }]}>✕</Text></Pressable>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Btn small label={`＋ ${t('Durak ekle')}`} onPress={() => setAdding(true)} style={{ flex: 1 }} />
          <Btn small label={`⇅ ${t('En kısa sıra')}`} onPress={reorder} disabled={stops.length < 2} style={{ flex: 1 }} />
        </View>

        <Btn kind="pri" label={`▶ ${t('Navigasyonu başlat')}`} disabled={!canNav} onPress={() => push({ name: 'nav', stops, mode, avoid: mode === 'driving-car' ? avoid : [] })} style={{ marginTop: 16 }} />
        <Text style={b.fine}>{origin ? t('Sesli yönlendirmeli canlı navigasyon uygulamanın içinde açılır.') : t('Navigasyon için konum izni gerekiyor.')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Btn label={t('Google Haritalar’da aç')} onPress={() => Linking.openURL(gmaps(mode))} style={{ flex: 1 }} small />
          <Btn label={`↗ ${t('Paylaş')}`} onPress={share} style={{ flex: 1 }} small />
        </View>

        {/* yol üstü mola */}
        {route && mode !== 'foot-walking' && (
          <View style={{ marginTop: 22 }}>
            <Text style={[b.h2, { fontSize: 18 }]}>{t('Yol üstü mola')}</Text>
            <Text style={[b.fine, { marginTop: 2 }]}>{t('Rotadan çok sapmadan uğrayabileceğin yerler.')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {ALONG_KINDS.map(([k, icon, label]) => <Chip key={k} label={`${icon} ${t(label)}`} on={alongKind === k} onPress={() => loadAlong(k)} />)}
            </View>
            {alongBusy && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.muted }}>{t('Aranıyor…')}</Text></View>}
            {along && !alongBusy && (along.length === 0 ? <Text style={b.fine}>{t('Rotanın yakınında bulunamadı.')}</Text> : (
              <View style={{ marginTop: 8 }}>
                {pickSpread(along, 12).map((a) => (
                  <View key={`${a.lat},${a.lng}`} style={s.alongRow}>
                    <Text style={{ fontSize: 20 }}>{kindIcon(a.k)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.ink, fontWeight: '700' }} numberOfLines={1}>{a.n || t(ALONG_KINDS.find((x) => x[0] === a.k)?.[2] || 'Durak')}</Text>
                      <Text style={{ color: C.muted, fontSize: 13 }}>{`${t('{1} sonra', fmtDist(a.along, num))}${route ? ` · ~${clock(new Date(depart + (a.along / Math.max(1, route.distance)) * route.duration * 1000), lang)}` : ''}${a.off > 300 ? ` · ${t('rotadan {1}', fmtDist(a.off, num))}` : ''}${a.h ? ' · 24/7' : ''}`}</Text>
                    </View>
                    <Btn small label={`＋ ${t('Ekle')}`} onPress={() => insert({ n: a.n || t(ALONG_KINDS.find((x) => x[0] === a.k)?.[2] || 'Durak'), lat: a.lat, lng: a.lng, k: a.k, stay: a.k === 'food' ? 30 : 15 })} />
                  </View>
                ))}
                <Text style={b.fine}>© OpenStreetMap</Text>
              </View>
            ))}
          </View>
        )}

        {/* rotanın yakınındaki yerler */}
        {near.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={[b.h2, { fontSize: 18 }]}>{t('Yolun üstünde, kaçırma')}</Text>
            <Text style={[b.fine, { marginTop: 2 }]}>{t('Rotana yakın, rehberdeki görülecek yerler.')}</Text>
            {near.slice(0, 8).map(({ p, along: al, off }) => (
              <View key={p.id} style={s.alongRow}>
                <Pressable style={{ flex: 1 }} onPress={() => push({ name: 'place', id: p.id })}>
                  <Text style={{ color: C.ink, fontWeight: '700' }} numberOfLines={1}>{p.n}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>{`${t(catName(p.c))} · ${t('{1} sonra', fmtDist(al, num))} · ${t('rotadan {1}', fmtDist(off, num))}`}</Text>
                </Pressable>
                <Btn small label={`＋ ${t('Ekle')}`} onPress={() => insert({ ...fromPlace(p), stay: 45 })} />
              </View>
            ))}
          </View>
        )}

        {route && route.steps.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Pressable onPress={() => setShowSteps((v) => !v)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[b.h2, { fontSize: 18, flex: 1 }]}>{t('Adım adım tarif')}</Text>
              <Text style={{ color: C.accent, fontWeight: '800' }}>{showSteps ? t('Gizle') : t('Göster ({1})', num(route.steps.length))}</Text>
            </Pressable>
            {showSteps && route.steps.map((st, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Text style={{ width: 24, color: C.muted, fontWeight: '800' }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21 }}>{st.i}</Text>
                  {st.d > 0 && <Text style={{ color: C.muted, fontSize: 13 }}>{fmtDist(st.d, num)}</Text>}
                </View>
              </View>
            ))}
            <Text style={b.fine}>© openrouteservice.org · © OpenStreetMap</Text>
          </View>
        )}
      </ScrollView>
      <AddStop open={adding} onClose={() => setAdding(false)} onPick={(st) => { insert({ ...st, stay: 45 }); setAdding(false); }} skip={new Set(stops.map((x) => x.id || ''))} />
    </View>
  );
}

/* uzun rotada hepsi aynı yerde toplanmasın: rota boyunca yayılmış en çok n öneri (isimliler önce) */
function pickSpread(items: AlongItem[], n: number) {
  if (items.length <= n) return items;
  const named = items.filter((x) => x.n), pool = named.length >= n ? named : items;
  const out: AlongItem[] = [];
  for (let i = 0; i < n; i++) out.push(pool[Math.floor((i * pool.length) / n)]);
  return out;
}

/* rehberden durak seç */
function AddStop({ open, onClose, onPick, skip }: { open: boolean; onClose: () => void; onPick: (s: Stop) => void; skip?: Set<string> }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { places, visited, faved } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const f = fold(q.trim());
    const pool = places.filter((p) => !p.closed && !(skip && skip.has(p.id)));
    if (!f) return pool.filter((p) => faved.has(p.id)).concat(pool.filter((p) => !faved.has(p.id) && !visited.has(p.id)).sort((a, b2) => b2.r - a.r)).slice(0, 30);
    return pool.filter((p) => fold(`${p.n} ${p.il} ${p.semt || ''}`).includes(f)).slice(0, 40);
  }, [q, places, skip, faved, visited]);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.screen, paddingTop: insets.top }}>
        <Header onBack={onClose} title={t('Durak ekle')} />
        <View style={{ padding: 12 }}>
          <TextInput value={q} onChangeText={setQ} placeholder={t('Yer ya da il ara')} placeholderTextColor={C.muted} autoFocus style={s.search} />
          {!q && <Text style={[b.fine, { marginTop: 6 }]}>{t('Favorilerin ve öne çıkan yerler')}</Text>}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {list.map((p) => (
            <Pressable key={p.id} onPress={() => { onPick(fromPlace(p)); setQ(''); }} style={({ pressed }) => [b.row, pressed && { backgroundColor: C.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={b.rowN} numberOfLines={1}>{`${faved.has(p.id) ? '♥ ' : ''}${p.n}`}</Text>
                <Text style={b.rowM} numberOfLines={1}>{`${p.il} · ${t(catName(p.c))}`}</Text>
              </View>
              <Text style={{ color: C.accent, fontWeight: '800', fontSize: 20 }}>＋</Text>
            </Pressable>
          ))}
          {!list.length && <Empty title={t('Sonuç bulunamadı.')} />}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  num: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 12, lineHeight: 24, overflow: 'hidden' },
  stay: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 2 },
  mini: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  miniT: { color: C.ink, fontWeight: '900', fontSize: 15 },
  alongRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  search: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 11, color: C.ink, fontSize: 16 },
});
