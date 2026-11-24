import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { REGIONS, catName, fold, type Place } from '../data/catalog';
import PlaceSheet from '../components/PlaceSheet';
import { C, R, shadow } from '../theme';

/* Web sitesindeki gerçek haritanın aynısı: OpenFreeMap (ücretsiz, anahtarsız) */
export const MAP_STYLES: Record<string, [string, string, string]> = {
  std: ['Standart', 'https://tiles.openfreemap.org/styles/liberty', '#F2EFE9'],
  dark: ['Koyu', 'https://tiles.openfreemap.org/styles/dark', '#2B3134'],
  plain: ['Sade', 'https://tiles.openfreemap.org/styles/positron', '#F5F5F3'],
};
export const MAP_STYLE = MAP_STYLES.std[1];
const TR_BOUNDS: [number, number, number, number] = [25.7, 35.8, 44.8, 42.2];
const PLACE_ZOOM = 13.5;

export default function MapScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { places, toggle, error, reload } = useStore();
  const { push, focus } = useNav();
  const toast = useToast();
  const { pos, request } = useLocation();
  const cam = useRef<CameraRef>(null);
  const src = useRef<GeoJSONSourceRef>(null);
  const [reg, setReg] = useState(-1);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [style, setStyle] = useState('std');
  const [layers, setLayers] = useState(false);
  const topH = insets.top + 118;

  useEffect(() => { AsyncStorage.getItem('gezi-mapstyle').then((v) => { if (v && MAP_STYLES[v]) setStyle(v); }).catch(() => {}); }, []);
  const chooseStyle = (k: string) => { setStyle(k); setLayers(false); AsyncStorage.setItem('gezi-mapstyle', k).catch(() => {}); };

  const shown = useMemo(() => places.filter((p) => reg < 0 || p.r === reg), [places, reg]);
  const data = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: shown.map((p) => ({ type: 'Feature', id: p.id, properties: { id: p.id, n: p.n, sel: p.id === sel ? 1 : 0 }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
  }), [shown, sel]);
  const pinData = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: pin ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: pin } }] : [] }), [pin]);
  const matches = useMemo(() => {
    const f = fold(q.trim()); if (!f) return [];
    return places.filter((p) => fold(`${p.n} ${p.il} ${p.semt || ''} ${catName(p.c)} ${t(catName(p.c))}`).includes(f)).slice(0, 8);
  }, [q, places, t]);
  const place = sel ? places.find((p) => p.id === sel) || null : null;
  const meData = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: pos ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] } }] : [] }), [pos]);
  async function locate() {
    try {
      const v = pos || (await request());
      if (v) cam.current?.flyTo({ center: [v.lng, v.lat], zoom: 13, duration: 900, padding: { top: topH, right: 0, left: 0, bottom: 120 } });
    } catch (e) { toast(trError(e)); }
  }

  function fly(lng: number, lat: number) {
    cam.current?.flyTo({ center: [lng, lat], zoom: PLACE_ZOOM, duration: 900, padding: { top: topH, right: 0, left: 0, bottom: height * 0.45 } });
  }
  function select(p: Place) { Keyboard.dismiss(); setSearching(false); setQ(''); setPin(null); setSel(p.id); fly(p.lng, p.lat); }

  // başka ekrandan "Haritada gör" gelince
  useEffect(() => {
    if (!focus) return;
    const go = () => {
      if (focus.id) { const p = places.find((x) => x.id === focus.id); if (p) { setReg(-1); select(p); return; } }
      if (focus.lat != null && focus.lng != null) { setSel(null); setPin([focus.lng, focus.lat]); fly(focus.lng, focus.lat); }
    };
    const h = setTimeout(go, 350); return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.ts]);

  function pickRegion(i: number) {
    setReg(i); setSel(null); setPin(null);
    const ps = i < 0 ? [] : places.filter((p) => p.r === i);
    const bb: [number, number, number, number] = ps.length ? [Math.min(...ps.map((p) => p.lng)), Math.min(...ps.map((p) => p.lat)), Math.max(...ps.map((p) => p.lng)), Math.max(...ps.map((p) => p.lat))] : TR_BOUNDS;
    cam.current?.fitBounds(bb, { padding: { top: topH + 16, right: 32, bottom: insets.bottom + 140, left: 32 }, duration: 800 });
  }
  async function onToggle(kind: 'visits' | 'favorites') {
    if (!place) return;
    try { const on = await toggle(kind, place.id); if (on) toast(kind === 'visits' ? 'Gittiğin yerlere eklendi' : 'Favorilere eklendi'); }
    catch (e) { toast(trError(e)); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: MAP_STYLES[style][2] }}>
      <Map style={StyleSheet.absoluteFill} mapStyle={MAP_STYLES[style][1]} touchRotate={false} touchPitch={false} compass={false} logo={false}
        attribution attributionPosition={{ bottom: place ? 8 : insets.bottom + 8, left: 8 }}
        onPress={() => { Keyboard.dismiss(); setSearching(false); setSel(null); setPin(null); }}>
        <Camera ref={cam} initialViewState={{ bounds: TR_BOUNDS, padding: { top: topH, right: 24, bottom: 90, left: 24 } }} minZoom={4} maxZoom={18.5} />
        <GeoJSONSource id="places" ref={src} data={data} cluster clusterRadius={44} clusterMaxZoom={11}
          onPress={async (e) => {
            e.stopPropagation();
            const f = e.nativeEvent.features[0]; if (!f) return;
            const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
            if (f.properties?.cluster) {
              const z = await src.current?.getClusterExpansionZoom(f.properties.cluster_id as number);
              cam.current?.easeTo({ center: coords, zoom: (z ?? 8) + 0.4, duration: 600 });
            } else { const p = places.find((x) => x.id === f.properties?.id); if (p) select(p); }
          }}>
          <Layer type="circle" id="clusters" filter={['has', 'point_count']}
            paint={{ 'circle-color': C.ink, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5, 'circle-radius': ['step', ['get', 'point_count'], 17, 10, 21, 30, 26] }} />
          <Layer type="symbol" id="cluster-count" filter={['has', 'point_count']}
            layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true }}
            paint={{ 'text-color': '#FFFFFF' }} />
          <Layer type="circle" id="points" filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'sel'], 0]]}
            paint={{ 'circle-color': C.accent, 'circle-radius': 8, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5 }} />
          <Layer type="circle" id="selected" filter={['==', ['get', 'sel'], 1]}
            paint={{ 'circle-color': C.ink, 'circle-radius': 12, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3.5 }} />
          <Layer type="symbol" id="names" filter={['!', ['has', 'point_count']]} minzoom={9}
            layout={{ 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12.5, 'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true }}
            paint={{ 'text-color': style === 'dark' ? '#FFFFFF' : C.ink, 'text-halo-color': style === 'dark' ? '#14313A' : '#FFFFFF', 'text-halo-width': 1.6 }} />
        </GeoJSONSource>
        <GeoJSONSource id="me" data={meData}>
          <Layer type="circle" id="me-halo" paint={{ 'circle-radius': 18, 'circle-color': '#1F6FEB', 'circle-opacity': 0.18 }} />
          <Layer type="circle" id="me-dot" paint={{ 'circle-radius': 8, 'circle-color': '#1F6FEB', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
        </GeoJSONSource>
        <GeoJSONSource id="pin" data={pinData}>
          <Layer type="circle" id="pin-dot" paint={{ 'circle-color': C.ok, 'circle-radius': 11, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
        </GeoJSONSource>
      </Map>

      {/* üst çubuk: arama, katmanlar, bölgeler */}
      <View style={[s.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={s.row}>
          <View style={s.search}>
            <Text style={s.searchIcon}>⌕</Text>
            <TextInput style={s.searchInput} value={q} onChangeText={(v) => { setQ(v); setSearching(true); }} onFocus={() => setSearching(true)}
              placeholder={t('İl veya yer ara')} placeholderTextColor={C.muted} returnKeyType="search" accessibilityLabel={t('İl veya yer ara')} autoCorrect={false}
              onSubmitEditing={() => { if (matches[0]) select(matches[0]); }} />
            {!!q && <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel={t('Aramayı temizle')}><Text style={{ color: C.muted, fontSize: 16 }}>✕</Text></Pressable>}
          </View>
          <Pressable onPress={() => setLayers(true)} style={s.round} accessibilityRole="button" accessibilityLabel={t('Harita stili')}>
            <Text style={{ fontSize: 20 }}>🗺</Text>
          </Pressable>
        </View>
        {searching && q.trim().length > 0 ? (
          <View style={s.results}>
            {matches.length ? (
              <FlatList data={matches} keyExtractor={(p) => p.id} keyboardShouldPersistTaps="handled"
                renderItem={({ item: p }) => (
                  <Pressable onPress={() => select(p)} style={({ pressed }) => [s.res, pressed && { backgroundColor: C.line }]}>
                    <Text style={s.resName}>{p.n}</Text><Text style={s.resSub}>{`${p.il} · ${t(catName(p.c))}`}</Text>
                  </Pressable>
                )} />
            ) : <Text style={[s.resSub, { padding: 16 }]}>{t('Sonuç bulunamadı.')}</Text>}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            {[-1, ...REGIONS.map((_, i) => i)].map((i) => (
              <Pressable key={i} onPress={() => pickRegion(i)} style={[s.chip, reg === i && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: reg === i }}>
                <Text style={[s.chipTxt, reg === i && { color: '#FFFFFF' }]}>{i < 0 ? t('Tüm Türkiye') : t(REGIONS[i])}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {!place && (
        <Pressable onPress={locate} style={[s.round, { position: 'absolute', right: 14, bottom: 82 }]} accessibilityRole="button" accessibilityLabel={t('Konumum')}>
          <Text style={{ fontSize: 20, color: '#1F6FEB' }}>◎</Text>
        </Pressable>
      )}
      {place ? (
        <PlaceSheet place={place} bottom={8} onToggle={onToggle} onClose={() => setSel(null)} onMore={() => push({ name: 'place', id: place.id })} />
      ) : (
        <View style={s.bar}>
          <Text style={s.barTxt}>{`${t('{1} yer', num(shown.length))} · ${reg < 0 ? t('Tüm Türkiye') : t(REGIONS[reg])}`}</Text>
          {error ? <Pressable onPress={reload} hitSlop={8}><Text style={[s.barTxt, { color: C.accent }]}>{t('Yeniden dene')}</Text></Pressable>
            : <Text style={[s.barTxt, { color: C.muted, fontWeight: '500' }]}>{t('Bir yere dokun')}</Text>}
        </View>
      )}

      <Modal visible={layers} transparent animationType="fade" onRequestClose={() => setLayers(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,49,58,0.35)', justifyContent: 'flex-end' }} onPress={() => setLayers(false)}>
          <Pressable style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{t('Harita stili')}</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {Object.entries(MAP_STYLES).map(([k, [l, , bg]]) => (
                <Pressable key={k} onPress={() => chooseStyle(k)} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityRole="radio" accessibilityState={{ checked: style === k }}>
                  <View style={{ width: '100%', aspectRatio: 1.3, borderRadius: R.md, backgroundColor: bg, borderWidth: style === k ? 3 : 1, borderColor: style === k ? C.accent : C.chipLine }} />
                  <Text style={{ fontWeight: style === k ? '800' : '600', color: C.ink }}>{t(l)}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 16, height: 50, gap: 8, ...shadow },
  searchIcon: { fontSize: 22, color: C.muted, marginTop: -2 },
  searchInput: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 0 },
  round: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: C.chipLine },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipTxt: { color: C.ink, fontSize: 14.5, fontWeight: '600' },
  results: { marginHorizontal: 12, marginTop: 8, backgroundColor: C.surface, borderRadius: R.md, maxHeight: 360, overflow: 'hidden', ...shadow },
  res: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  resName: { color: C.ink, fontSize: 16, fontWeight: '700' },
  resSub: { color: C.muted, fontSize: 13.5, marginTop: 2 },
  bar: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: C.surface, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow },
  barTxt: { color: C.ink, fontSize: 14.5, fontWeight: '700' },
});
