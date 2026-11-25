import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { fmtDist, useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav } from '../lib/ui';
import { fetchRoute, routeErrorText, RouteError, type Profile, type RouteRes } from '../lib/routing';
import { Btn, Chip, Empty, Header, b } from '../components/common';
import { MAP_STYLE } from './MapScreen';
import { C } from '../theme';

type Mode = Profile | 'transit';
export const MODES: [Mode, string, string, string][] = [
  ['driving-car', '🚗', 'Araba', 'driving'], ['foot-walking', '🚶', 'Yürüyüş', 'walking'],
  ['cycling-regular', '🚲', 'Bisiklet', 'bicycling'], ['transit', '🚌', 'Toplu taşıma', 'transit'],
];
export const fmtDur = (s: number, t: (k: string, ...a: any[]) => string, num: (n: number) => string) => {
  const h = Math.floor(s / 3600), m = Math.max(1, Math.round((s % 3600) / 60));
  return h ? t('{1} sa {2} dk', num(h), num(m)) : t('{1} dk', num(m));
};

/* Yol tarifi: tek yere ya da gezi listesindeki duraklara. "Navigasyonu başlat" uygulama içinde canlı yönlendirmeyi açar. */
export default function RouteScreen({ id, ids }: { id?: string; ids?: string[] }) {
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { byId } = useStore();
  const { pos, request } = useLocation();
  const { pop, push } = useNav();
  const cam = useRef<CameraRef>(null);
  const stops = useMemo(() => (ids || (id ? [id] : [])).map((x) => byId(x)).filter(Boolean) as NonNullable<ReturnType<typeof byId>>[], [id, ids, byId]);
  const multi = stops.length > 1;
  const [mode, setMode] = useState<Mode>('driving-car');
  const [route, setRoute] = useState<RouteRes | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(pos ? { lat: pos.lat, lng: pos.lng } : null);
  const [noLoc, setNoLoc] = useState(false);

  useEffect(() => { if (!origin && pos) setOrigin({ lat: pos.lat, lng: pos.lng }); }, [pos, origin]);
  useEffect(() => {
    if (!origin) request().then((v) => v && setOrigin({ lat: v.lat, lng: v.lng })).catch((e) => { setNoLoc(true); if (!multi) { setState('error'); setErr(t(trError(e))); } });
    /* eslint-disable-next-line */
  }, []);

  const last = stops[stops.length - 1];
  const gmaps = (m: Mode) => {
    const tm = MODES.find((x) => x[0] === m)![3];
    const o = origin ? `&origin=${origin.lat},${origin.lng}` : '';
    const mids = (origin ? stops.slice(0, -1) : stops.slice(1, -1)).map((p) => `${p.lat},${p.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1${o}&destination=${last.lat},${last.lng}${mids ? `&waypoints=${encodeURIComponent(mids)}` : ''}&travelmode=${tm}`;
  };
  const coords = useMemo<[number, number][]>(() => [...(origin ? [[origin.lng, origin.lat] as [number, number]] : []), ...stops.map((p) => [p.lng, p.lat] as [number, number])], [origin, stops]);

  useEffect(() => {
    if (!stops.length || mode === 'transit' || coords.length < 2 || (!origin && !noLoc)) return;
    let live = true;
    setState('loading'); setRoute(null);
    fetchRoute(mode, coords, lang).then((r) => {
      if (!live) return;
      setRoute(r); setState('idle');
      const cs = r.geometry.coordinates as [number, number][];
      const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
      cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 40, right: 40, bottom: 40, left: 40 }, duration: 600 });
    }).catch((e) => { if (live) { setState('error'); setErr(t(routeErrorText(e instanceof RouteError ? e.code : 'network'))); } });
    return () => { live = false; };
  }, [coords, mode, lang, noLoc]); // eslint-disable-line

  const line = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: route ? [{ type: 'Feature', properties: {}, geometry: route.geometry }] : [] }), [route]);
  const ends = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [
      ...(origin ? [{ type: 'Feature', properties: { k: 'o', n: '' }, geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] } }] : []),
      ...stops.map((p, i) => ({ type: 'Feature', properties: { k: 'd', n: multi ? String(i + 1) : '' }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
    ] as any,
  }), [origin, stops, multi]);

  if (!stops.length) return <View style={{ flex: 1, backgroundColor: C.screen }}><Header onBack={pop} /><Empty title={t('Bu yer bulunamadı.')} /></View>;
  const xs = [...stops.map((p) => p.lng), ...(origin ? [origin.lng] : [])], ys = [...stops.map((p) => p.lat), ...(origin ? [origin.lat] : [])];
  const canNav = !!origin && mode !== 'transit' && !!route;

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={multi ? `${t('Yol tarifi')} · ${t('{1} durak', num(stops.length))}` : `${t('Yol tarifi')} · ${last.n}`} />
      <View style={{ height: '40%' }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} touchRotate={false} touchPitch={false} compass={false} logo={false}>
          <Camera ref={cam} initialViewState={xs.length > 1 ? { bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], padding: { top: 40, right: 40, bottom: 40, left: 40 } } : { center: [last.lng, last.lat], zoom: 12 }} />
          <GeoJSONSource id="route" data={line}>
            <Layer type="line" id="route-casing" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }} />
            <Layer type="line" id="route-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#1F6FEB', 'line-width': 5 }} />
          </GeoJSONSource>
          <GeoJSONSource id="ends" data={ends}>
            <Layer type="circle" id="ends-dot" paint={{ 'circle-radius': multi ? 11 : 9, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF', 'circle-color': ['match', ['get', 'k'], 'o', '#1F6FEB', C.accent] }} />
            <Layer type="symbol" id="ends-num" layout={{ 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true }} paint={{ 'text-color': '#FFFFFF' }} />
          </GeoJSONSource>
        </Map>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MODES.map(([k, icon, label]) => <Chip key={k} label={`${icon} ${t(label)}`} on={mode === k} onPress={() => (k === 'transit' ? Linking.openURL(gmaps('transit')) : setMode(k))} />)}
        </View>

        {state === 'loading' && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 18 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.muted }}>{t('Rota hesaplanıyor…')}</Text></View>}
        {state === 'error' && <View style={[b.box, { borderColor: C.danger }]}><Text style={{ color: C.ink, lineHeight: 21 }}>{err}</Text></View>}
        {multi && noLoc && <Text style={b.fine}>{t('Konumun alınamadığı için rota ilk duraktan başlıyor.')}</Text>}

        {route && state === 'idle' && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>{fmtDur(route.duration, t, num)}</Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>{fmtDist(route.distance, num)}</Text>
            {multi && route.legs.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {route.legs.map((l, i) => {
                  const to = stops[origin ? i : i + 1];
                  return to ? (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line }}>
                      <Text style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 12, lineHeight: 22 }}>{origin ? i + 1 : i + 2}</Text>
                      <Text style={{ flex: 1, color: C.ink, fontWeight: '700' }} numberOfLines={1}>{to.n}</Text>
                      <Text style={{ color: C.muted }}>{`${fmtDist(l.d, num)} · ${fmtDur(l.t, t, num)}`}</Text>
                    </View>
                  ) : null;
                })}
              </View>
            )}
          </View>
        )}
        <Btn kind="pri" label={`▶ ${t('Navigasyonu başlat')}`} disabled={!canNav} onPress={() => push({ name: 'nav', ids: stops.map((p) => p.id), mode })} style={{ marginTop: 16 }} />
        <Text style={b.fine}>{origin ? t('Sesli yönlendirmeli canlı navigasyon uygulamanın içinde açılır.') : t('Navigasyon için konum izni gerekiyor.')}</Text>
        <Btn label={t('Google Haritalar’da aç')} onPress={() => Linking.openURL(gmaps(mode))} style={{ marginTop: 10 }} small />

        {route && route.steps.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[b.h2, { fontSize: 18 }]}>{t('Adım adım tarif')}</Text>
            {route.steps.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Text style={{ width: 24, color: C.muted, fontWeight: '800' }}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21 }}>{s.i}</Text>
                  {s.d > 0 && <Text style={{ color: C.muted, fontSize: 13 }}>{fmtDist(s.d, num)}</Text>}
                </View>
              </View>
            ))}
            <Text style={b.fine}>© openrouteservice.org · © OpenStreetMap</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
