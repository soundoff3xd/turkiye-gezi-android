import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera, GeoJSONSource, Layer, Map, type CameraRef, type GeoJSONSourceRef,
} from '@maplibre/maplibre-react-native';
import { useAuth, trError } from '../lib/auth';
import { usePlaceData } from '../lib/data';
import { EMPTY_STATS, REGIONS, catName, fold, type Place } from '../data/catalog';
import PlaceSheet from '../components/PlaceSheet';
import { C, R, shadow } from '../theme';

/* Web sitesindeki gerçek haritanın aynısı: OpenFreeMap (ücretsiz, anahtarsız) */
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const TR_BOUNDS: [number, number, number, number] = [25.7, 35.8, 44.8, 42.2];
const PLACE_ZOOM = 13.5;

export default function MapScreen() {
  const { me, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { places, stats, visited, faved, error, reload, toggle } = usePlaceData(me?.id ?? null);
  const cam = useRef<CameraRef>(null);
  const src = useRef<GeoJSONSourceRef>(null);
  const [reg, setReg] = useState(-1);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topH = insets.top + 118;

  const say = useCallback((t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const shown = useMemo(() => places.filter((p) => reg < 0 || p.r === reg), [places, reg]);
  const data = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: shown.map((p) => ({
      type: 'Feature', id: p.id,
      properties: { id: p.id, n: p.n, sel: p.id === sel ? 1 : 0 },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  }), [shown, sel]);

  const matches = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return [];
    return places.filter((p) => fold(`${p.n} ${p.il} ${p.semt || ''} ${catName(p.c)}`).includes(f)).slice(0, 8);
  }, [q, places]);

  const place = sel ? places.find((p) => p.id === sel) || null : null;

  function select(p: Place) {
    Keyboard.dismiss(); setSearching(false); setQ('');
    setSel(p.id);
    cam.current?.flyTo({ center: [p.lng, p.lat], zoom: PLACE_ZOOM, duration: 900, padding: { top: topH, right: 0, left: 0, bottom: height * 0.45 } });
  }
  function pickRegion(i: number) {
    setReg(i); setSel(null);
    const ps = i < 0 ? [] : places.filter((p) => p.r === i);
    const b: [number, number, number, number] = ps.length
      ? [Math.min(...ps.map((p) => p.lng)), Math.min(...ps.map((p) => p.lat)), Math.max(...ps.map((p) => p.lng)), Math.max(...ps.map((p) => p.lat))]
      : TR_BOUNDS;
    cam.current?.fitBounds(b, { padding: { top: topH + 16, right: 32, bottom: insets.bottom + 80, left: 32 }, duration: 800 });
  }
  async function onToggle(kind: 'visits' | 'favorites') {
    if (!place) return;
    try {
      const on = await toggle(kind, place.id);
      if (on) say(kind === 'visits' ? 'Gittiğin yerlere eklendi' : 'Favorilere eklendi');
    } catch (e) { say(trError(e)); }
  }
  function account() {
    if (!me) return;
    Alert.alert(me.name, me.email, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış yap', style: 'destructive', onPress: () => { signOut(); } },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#B9D4E1' }}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attribution
        attributionPosition={{ bottom: (place ? 8 : insets.bottom + 70), left: 8 }}
        onPress={() => { Keyboard.dismiss(); setSearching(false); setSel(null); }}
      >
        <Camera ref={cam} initialViewState={{ bounds: TR_BOUNDS, padding: { top: topH, right: 24, bottom: 90, left: 24 } }} minZoom={4} maxZoom={18.5} />
        <GeoJSONSource
          id="places"
          ref={src}
          data={data}
          cluster
          clusterRadius={44}
          clusterMaxZoom={11}
          onPress={async (e) => {
            e.stopPropagation();
            const f = e.nativeEvent.features[0];
            if (!f) return;
            const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
            if (f.properties?.cluster) {
              const z = await src.current?.getClusterExpansionZoom(f.properties.cluster_id as number);
              cam.current?.easeTo({ center: coords, zoom: (z ?? 8) + 0.4, duration: 600 });
            } else {
              const p = places.find((x) => x.id === f.properties?.id);
              if (p) select(p);
            }
          }}
        >
          <Layer type="circle" id="clusters" filter={['has', 'point_count']}
            paint={{
              'circle-color': C.ink, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5,
              'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 30, 26],
            }} />
          <Layer type="symbol" id="cluster-count" filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13,
              'text-allow-overlap': true, 'text-ignore-placement': true,
            }}
            paint={{ 'text-color': '#FFFFFF' }} />
          <Layer type="circle" id="points" filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'sel'], 0]]}
            paint={{ 'circle-color': C.accent, 'circle-radius': 8, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5 }} />
          <Layer type="circle" id="selected" filter={['==', ['get', 'sel'], 1]}
            paint={{ 'circle-color': C.ink, 'circle-radius': 12, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3.5 }} />
          <Layer type="symbol" id="names" filter={['!', ['has', 'point_count']]} minzoom={9}
            layout={{
              'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12.5,
              'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true,
            }}
            paint={{ 'text-color': C.ink, 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.6 }} />
        </GeoJSONSource>
      </Map>

      {/* üst çubuk: arama, hesap, bölgeler */}
      <View style={[s.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.row}>
          <View style={s.search}>
            <Text style={s.searchIcon}>⌕</Text>
            <TextInput
              style={s.searchInput} value={q} onChangeText={(t) => { setQ(t); setSearching(true); }}
              onFocus={() => setSearching(true)} placeholder="İl veya yer ara" placeholderTextColor={C.muted}
              returnKeyType="search" accessibilityLabel="İl veya yer ara" autoCorrect={false}
              onSubmitEditing={() => { if (matches[0]) select(matches[0]); }}
            />
            {!!q && <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="Aramayı temizle"><Text style={{ color: C.muted, fontSize: 16 }}>✕</Text></Pressable>}
          </View>
          <Pressable onPress={account} style={s.acct} accessibilityRole="button" accessibilityLabel="Hesap">
            <Text style={s.acctTxt}>{(me?.name || '?').charAt(0).toLocaleUpperCase('tr')}</Text>
          </Pressable>
        </View>
        {searching && q.trim().length > 0 ? (
          <View style={s.results}>
            {matches.length ? (
              <FlatList
                data={matches} keyExtractor={(p) => p.id} keyboardShouldPersistTaps="handled"
                renderItem={({ item: p }) => (
                  <Pressable onPress={() => select(p)} style={({ pressed }) => [s.res, pressed && { backgroundColor: C.line }]}>
                    <Text style={s.resName}>{p.n}</Text>
                    <Text style={s.resSub}>{`${p.il} · ${catName(p.c)}`}</Text>
                  </Pressable>
                )}
              />
            ) : <Text style={[s.resSub, { padding: 16 }]}>Sonuç bulunamadı.</Text>}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            {[-1, ...REGIONS.map((_, i) => i)].map((i) => (
              <Pressable key={i} onPress={() => pickRegion(i)} style={[s.chip, reg === i && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: reg === i }}>
                <Text style={[s.chipTxt, reg === i && { color: C.onAccent }]}>{i < 0 ? 'Tüm Türkiye' : REGIONS[i]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {place ? (
        <PlaceSheet
          place={place} stats={stats[place.id] || EMPTY_STATS} visited={visited.has(place.id)} faved={faved.has(place.id)}
          bottom={insets.bottom} onToggle={onToggle} onClose={() => setSel(null)}
        />
      ) : (
        <View style={[s.bar, { bottom: insets.bottom + 14 }]}>
          <Text style={s.barTxt}>{`${shown.length} yer · ${reg < 0 ? 'Tüm Türkiye' : REGIONS[reg]}`}</Text>
          {error ? (
            <Pressable onPress={reload} hitSlop={8}><Text style={[s.barTxt, { color: C.accent }]}>Yeniden dene</Text></Pressable>
          ) : <Text style={[s.barTxt, { color: C.muted, fontWeight: '500' }]}>Bir yere dokun</Text>}
        </View>
      )}

      {toast && (
        <View style={[s.toast, { top: insets.top + 124 }]} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 16, height: 50, gap: 8, ...shadow },
  searchIcon: { fontSize: 22, color: C.muted, marginTop: -2 },
  searchInput: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 0 },
  acct: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', ...shadow },
  acctTxt: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: C.chipLine },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { color: C.ink, fontSize: 14.5, fontWeight: '600' },
  results: { marginHorizontal: 12, marginTop: 8, backgroundColor: C.surface, borderRadius: R.md, maxHeight: 360, overflow: 'hidden', ...shadow },
  res: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  resName: { color: C.ink, fontSize: 16, fontWeight: '700' },
  resSub: { color: C.muted, fontSize: 13.5, marginTop: 2 },
  bar: { position: 'absolute', left: 12, right: 12, backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow },
  barTxt: { color: C.ink, fontSize: 14.5, fontWeight: '700' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 11 },
  toastTxt: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600' },
});
