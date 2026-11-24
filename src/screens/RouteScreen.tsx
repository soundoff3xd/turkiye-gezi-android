import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { fmtDist, useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav } from '../lib/ui';
import { Btn, Chip, Empty, Header, b } from '../components/common';
import { MAP_STYLE } from './MapScreen';
import { C, R } from '../theme';

type Mode = 'driving-car' | 'foot-walking' | 'cycling-regular' | 'transit';
const MODES: [Mode, string, string, string][] = [
  ['driving-car', '🚗', 'Araba', 'driving'], ['foot-walking', '🚶', 'Yürüyüş', 'walking'],
  ['cycling-regular', '🚲', 'Bisiklet', 'bicycling'], ['transit', '🚌', 'Toplu taşıma', 'transit'],
];
type RouteRes = { geometry: GeoJSON.LineString; distance: number; duration: number; steps: { i: string; d: number; t: number }[] };

/* Uygulama içi yol tarifi: rota bizim haritamızda çizilir; sesli navigasyon için Google Haritalar'a devredilir */
export default function RouteScreen({ id }: { id: string }) {
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { byId } = useStore();
  const { pos, request } = useLocation();
  const { pop } = useNav();
  const cam = useRef<CameraRef>(null);
  const p = byId(id);
  const [mode, setMode] = useState<Mode>('driving-car');
  const [route, setRoute] = useState<RouteRes | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'nokey'>('idle');
  const [err, setErr] = useState('');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(pos ? { lat: pos.lat, lng: pos.lng } : null);

  useEffect(() => { if (!origin && pos) setOrigin({ lat: pos.lat, lng: pos.lng }); }, [pos, origin]);
  useEffect(() => { if (!origin) request().then((v) => v && setOrigin({ lat: v.lat, lng: v.lng })).catch((e) => { setState('error'); setErr(t(trError(e))); }); /* eslint-disable-next-line */ }, []);

  const gmaps = (m: Mode) => {
    const tm = MODES.find((x) => x[0] === m)![3];
    const o = origin ? `&origin=${origin.lat},${origin.lng}` : '';
    return `https://www.google.com/maps/dir/?api=1${o}&destination=${p!.lat},${p!.lng}&travelmode=${tm}`;
  };

  useEffect(() => {
    if (!p || !origin || mode === 'transit') return;
    let live = true;
    setState('loading'); setRoute(null);
    supabase.functions.invoke('route', { body: { profile: mode, coordinates: [[origin.lng, origin.lat], [p.lng, p.lat]], language: lang } })
      .then(async ({ data, error }) => {
        if (!live) return;
        if (error) {
          let code = '';
          try { code = (await (error as any).context?.json())?.error || ''; } catch { /* */ }
          if (code === 'no_key') { setState('nokey'); return; }
          setState('error');
          setErr(code === 'rate_limited' ? t('Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.') : t('Rota bulunamadı.'));
          return;
        }
        setRoute(data as RouteRes); setState('idle');
        const cs = (data as RouteRes).geometry.coordinates as [number, number][];
        const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
        cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 40, right: 40, bottom: 40, left: 40 }, duration: 600 });
      })
      .catch(() => { if (live) { setState('error'); setErr(t('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.')); } });
    return () => { live = false; };
  }, [p?.id, origin?.lat, origin?.lng, mode, lang]); // eslint-disable-line

  const line = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: route ? [{ type: 'Feature', properties: {}, geometry: route.geometry }] : [] }), [route]);
  const ends = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [
      ...(origin ? [{ type: 'Feature', properties: { k: 'o' }, geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] } }] : []),
      ...(p ? [{ type: 'Feature', properties: { k: 'd' }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }] : []),
    ] as any,
  }), [origin, p]);

  if (!p) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header onBack={pop} /><Empty title={t('Bu yer bulunamadı.')} /></View>;
  const dur = (s: number) => { const h = Math.floor(s / 3600), m = Math.max(1, Math.round((s % 3600) / 60)); return h ? t('{1} sa {2} dk', num(h), num(m)) : t('{1} dk', num(m)); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header onBack={pop} title={`${t('Yol tarifi')} · ${p.n}`} />
      <View style={{ height: '42%' }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} touchRotate={false} touchPitch={false} compass={false} logo={false}>
          <Camera ref={cam} initialViewState={origin ? { bounds: [Math.min(origin.lng, p.lng), Math.min(origin.lat, p.lat), Math.max(origin.lng, p.lng), Math.max(origin.lat, p.lat)], padding: { top: 40, right: 40, bottom: 40, left: 40 } } : { center: [p.lng, p.lat], zoom: 12 }} />
          <GeoJSONSource id="route" data={line}>
            <Layer type="line" id="route-casing" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#FFFFFF', 'line-width': 8 }} />
            <Layer type="line" id="route-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#1F6FEB', 'line-width': 5 }} />
          </GeoJSONSource>
          <GeoJSONSource id="ends" data={ends}>
            <Layer type="circle" id="ends-dot" paint={{ 'circle-radius': 9, 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF', 'circle-color': ['match', ['get', 'k'], 'o', '#1F6FEB', C.accent] }} />
          </GeoJSONSource>
        </Map>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MODES.map(([k, icon, label]) => <Chip key={k} label={`${icon} ${t(label)}`} on={mode === k} onPress={() => (k === 'transit' ? Linking.openURL(gmaps('transit')) : setMode(k))} />)}
        </View>

        {state === 'loading' && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 18 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.muted }}>{t('Rota hesaplanıyor…')}</Text></View>}
        {state === 'error' && <View style={[b.box, { borderColor: C.danger }]}><Text style={{ color: C.ink }}>{err}</Text></View>}
        {state === 'nokey' && <View style={b.box}><Text style={{ color: C.ink, lineHeight: 21 }}>{t('Uygulama içi yol tarifi çok yakında açılacak. Şimdilik Google Haritalar ile devam edebilirsin.')}</Text></View>}

        {route && state === 'idle' && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>{dur(route.duration)}</Text>
            <Text style={{ color: C.muted, fontSize: 15 }}>{fmtDist(route.distance, num)}</Text>
          </View>
        )}
        <Btn kind="pri" label={`▶ ${t('Navigasyonu başlat')}`} onPress={() => Linking.openURL(gmaps(mode))} style={{ marginTop: 16 }} />
        <Text style={b.fine}>{t('Sesli yönlendirme Google Haritalar ile açılır.')}</Text>

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
