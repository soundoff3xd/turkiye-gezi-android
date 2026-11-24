import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, GeoJSONSource, Images, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { LANDMARKS, MARKER_IMAGES, markerOf } from '../data/markers';
import { DEFAULT_LAYERS, useMapStyle, type MapLayers } from '../lib/mapstyle';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { REGIONS, catName, fold, type Place } from '../data/catalog';
import PlaceSheet from '../components/PlaceSheet';
import AccountMenu from '../components/AccountMenu';
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
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { places, toggle, error, reload } = useStore();
  const { push, focus } = useNav();
  const toast = useToast();
  const { pos, request } = useLocation();
  const cam = useRef<CameraRef>(null);
  const mapRef = useRef<any>(null);
  const [reg, setReg] = useState(-1);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [style, setStyle] = useState('std');
  const [layers, setLayers] = useState(false);
  const [lay, setLay] = useState<MapLayers>(DEFAULT_LAYERS);
  const mapStyle = useMapStyle(style, MAP_STYLES[style][1], lay, lang);
  const topH = insets.top + 118;

  useEffect(() => {
    AsyncStorage.multiGet(['gezi-mapstyle', 'gezi-maplayers']).then(([[, v], [, l]]) => {
      if (v && MAP_STYLES[v]) setStyle(v);
      try { if (l) setLay({ ...DEFAULT_LAYERS, ...JSON.parse(l) }); } catch { /* */ }
    }).catch(() => {});
  }, []);
  const flipLayer = (k: keyof MapLayers) => setLay((o) => { const n = { ...o, [k]: !o[k] }; AsyncStorage.setItem('gezi-maplayers', JSON.stringify(n)).catch(() => {}); return n; });
  const chooseStyle = (k: string) => { setStyle(k); AsyncStorage.setItem('gezi-mapstyle', k).catch(() => {}); };

  const shown = useMemo(() => places.filter((p) => reg < 0 || p.r === reg), [places, reg]);
  // kendi kümelememiz (web sitesindeki gibi): içinde ünlü yer olan küme o yerin çizimi ve sayısıyla görünür
  const [zoom, setZoom] = useState(5);
  const zi = Math.floor(zoom);
  const data = useMemo<GeoJSON.FeatureCollection>(() => {
    const scale = 256 * Math.pow(2, zi), R = zi >= 12 ? 0 : 40;
    const px = (p: Place) => [((p.lng + 180) / 360) * scale, ((1 - Math.log(Math.tan(Math.PI / 4 + (p.lat * Math.PI) / 360)) / Math.PI) / 2) * scale];
    const prio = (p: Place) => (LANDMARKS.has(p.id) ? 10 : p.t || 3);
    const cl: { x: number; y: number; m: Place[] }[] = [];
    shown.filter((p) => p.id !== sel).sort((a, b) => prio(b) - prio(a)).forEach((p) => {
      const [x, y] = px(p);
      const c = R ? cl.find((k) => Math.abs(k.x - x) < R && Math.abs(k.y - y) < R) : undefined;
      if (c) c.m.push(p); else cl.push({ x, y, m: [p] });
    });
    const sp = sel ? shown.find((p) => p.id === sel) : undefined;
    const feat = (p: Place, props: Record<string, unknown>) => ({ type: 'Feature', properties: props, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } });
    return {
      type: 'FeatureCollection',
      features: [
        ...cl.map((c) => {
          const head = c.m[0], lm = LANDMARKS.has(head.id) ? 1 : 0;
          return c.m.length === 1
            ? feat(head, { k: 'p', id: head.id, n: head.n, ic: markerOf(head.id, head.c), lm, sel: 0, t: prio(head) })
            : feat(head, { k: 'c', ids: c.m.map((p) => p.id).join(','), n: c.m.length, ic: lm ? markerOf(head.id, head.c) : '', lm, sel: 0, t: prio(head) });
        }),
        ...(sp ? [feat(sp, { k: 'p', id: sp.id, n: sp.n, ic: markerOf(sp.id, sp.c), lm: LANDMARKS.has(sp.id) ? 1 : 0, sel: 1, t: 99 })] : []),
      ],
    } as GeoJSON.FeatureCollection;
  }, [shown, sel, zi]);
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
      <Map ref={mapRef} style={StyleSheet.absoluteFill} mapStyle={mapStyle as any} touchRotate={false} touchPitch={false} compass={false} logo={false}
        attribution attributionPosition={{ bottom: place ? 8 : insets.bottom + 8, left: 8 }}
        onPress={() => { Keyboard.dismiss(); setSearching(false); setSel(null); setPin(null); }}
        onRegionDidChange={(e: any) => {
          const z = e?.nativeEvent?.zoom;
          if (typeof z === 'number') { if (Math.floor(z) !== Math.floor(zoom)) setZoom(z); }
          else mapRef.current?.getZoom?.().then((v: number) => { if (Math.floor(v) !== Math.floor(zoom)) setZoom(v); }).catch(() => {});
        }}>
        <Camera ref={cam} initialViewState={{ bounds: TR_BOUNDS, padding: { top: topH, right: 24, bottom: 90, left: 24 } }} minZoom={4} maxZoom={18.5} />
        <Images images={MARKER_IMAGES} />
        <GeoJSONSource id="places" data={data}
          onPress={(e) => {
            e.stopPropagation();
            const f = e.nativeEvent.features[0]; if (!f) return;
            if (f.properties?.k === 'c') {
              const ps = String(f.properties.ids).split(',').map((id) => places.find((x) => x.id === id)).filter(Boolean) as Place[];
              const xs = ps.map((p) => p.lng), ys = ps.map((p) => p.lat);
              cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: topH + 40, right: 50, bottom: 140, left: 50 }, duration: 650 });
            } else { const p = places.find((x) => x.id === f.properties?.id); if (p) select(p); }
          }}>
          <Layer type="circle" id="clusters" filter={['all', ['==', ['get', 'k'], 'c'], ['==', ['get', 'lm'], 0]]}
            paint={{ 'circle-color': C.ink, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2.5, 'circle-radius': ['step', ['get', 'n'], 17, 10, 21, 30, 26] }} />
          <Layer type="symbol" id="cluster-count" filter={['all', ['==', ['get', 'k'], 'c'], ['==', ['get', 'lm'], 0]]}
            layout={{ 'text-field': ['to-string', ['get', 'n']], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true, 'text-ignore-placement': true }}
            paint={{ 'text-color': '#FFFFFF' }} />
          <Layer type="circle" id="sel-halo" filter={['==', ['get', 'sel'], 1]}
            paint={{ 'circle-color': C.accent, 'circle-radius': 24, 'circle-opacity': 0.25 }} />
          <Layer type="symbol" id="points" filter={['all', ['==', ['get', 'k'], 'p'], ['==', ['get', 'lm'], 0]]}
            layout={{ 'icon-image': ['get', 'ic'], 'icon-size': ['case', ['==', ['get', 'sel'], 1], 1.35, 1], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 't'] }} />
          <Layer type="symbol" id="names" filter={['==', ['get', 'k'], 'p']} minzoom={9}
            layout={{ 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12.5, 'text-offset': ['case', ['==', ['get', 'lm'], 1], ['literal', [0, 0.3]], ['literal', [0, 1.3]]], 'text-anchor': 'top', 'text-max-width': 9, 'text-optional': true }}
            paint={{ 'text-color': style === 'dark' ? '#FFFFFF' : C.ink, 'text-halo-color': style === 'dark' ? '#14313A' : '#FFFFFF', 'text-halo-width': 1.6 }} />
          {/* ünlü yerler ve ünlü yer içeren kümeler: özel çizim (+ sayı rozeti) */}
          <Layer type="symbol" id="lm-icons" filter={['==', ['get', 'lm'], 1]}
            layout={{ 'icon-image': ['get', 'ic'], 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 't'],
              'icon-size': ['*', ['case', ['==', ['get', 'sel'], 1], 1.25, 1], ['interpolate', ['linear'], ['zoom'], 4, 0.72, 7, 0.88, 10, 1]],
              'text-field': ['case', ['==', ['get', 'k'], 'c'], ['to-string', ['get', 'n']], ''], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-anchor': 'center', 'text-offset': [1.35, -3.4],
              'text-allow-overlap': true, 'text-ignore-placement': true }}
            paint={{ 'text-color': '#FFFFFF', 'text-halo-color': C.ink, 'text-halo-width': 4 }} />
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
          <AccountMenu />
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
        <View style={s.tools} pointerEvents="box-none">
          <Pressable onPress={() => setLayers((v) => !v)} style={[s.round, layers && { backgroundColor: C.ink }]} accessibilityRole="button" accessibilityLabel={t('Harita stili')} accessibilityState={{ expanded: layers }}>
            <Text style={{ fontSize: 19 }}>🗺</Text>
          </Pressable>
          <Pressable onPress={locate} style={s.round} accessibilityRole="button" accessibilityLabel={t('Konumum')}>
            <Text style={{ fontSize: 20, color: '#1F6FEB' }}>◎</Text>
          </Pressable>
        </View>
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

      {/* harita stili: sağ alttaki düğmenin yanında açılan küçük pencere (web sitesindeki gibi) */}
      {layers && !place && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLayers(false)} accessibilityLabel={t('Kapat')} />
          <View style={s.pop}>
            <Text style={s.popH}>{t('Harita stili')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {Object.entries(MAP_STYLES).map(([k, [l, , bg]]) => (
                <Pressable key={k} onPress={() => chooseStyle(k)} style={{ width: 68, alignItems: 'center', gap: 5 }} accessibilityRole="radio" accessibilityState={{ checked: style === k }}>
                  <View style={[s.thumb, { backgroundColor: bg }, style === k && { borderWidth: 3, borderColor: C.accent }]}>
                    <View style={[s.thumbRoad, { backgroundColor: k === 'dark' ? '#4A565B' : k === 'std' ? '#F6CF8E' : '#FFFFFF' }]} />
                    <View style={[s.thumbWater, { backgroundColor: k === 'dark' ? '#1B2A30' : k === 'std' ? '#AAD3DF' : '#DDE5E8' }]} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: style === k ? '800' : '600', color: style === k ? C.accent : C.ink }} numberOfLines={1}>{t(l)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.popH, { marginTop: 14 }]}>{t('Katmanlar')}</Text>
            {([['prov', 'İl sınırları'], ['labels', 'İl adları'], ['lakes', 'Göller']] as [keyof MapLayers, string][]).map(([k, l]) => (
              <Pressable key={k} onPress={() => flipLayer(k)} style={s.lrow} accessibilityRole="switch" accessibilityState={{ checked: lay[k] }}>
                <Text style={{ fontSize: 15, color: C.ink, fontWeight: '600' }}>{t(l)}</Text>
                <View style={[s.sw, lay[k] && { backgroundColor: C.accent }]}><View style={[s.knob, lay[k] && { alignSelf: 'flex-end' }]} /></View>
              </Pressable>
            ))}
          </View>
        </>
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
  tools: { position: 'absolute', right: 14, bottom: 82, gap: 12 },
  pop: { position: 'absolute', right: 74, bottom: 82, backgroundColor: C.surface, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.line, ...shadow, elevation: 12 },
  popH: { fontSize: 14, fontWeight: '800', color: C.muted },
  lrow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  sw: { width: 42, height: 24, borderRadius: 12, backgroundColor: C.chipLine, padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
  thumb: { width: 68, height: 56, borderRadius: R.sm, overflow: 'hidden', borderWidth: 1, borderColor: C.chipLine },
  thumbRoad: { position: 'absolute', left: -6, right: -6, top: 24, height: 6, transform: [{ rotate: '-18deg' }] },
  thumbWater: { position: 'absolute', right: -10, bottom: -14, width: 40, height: 34, borderRadius: 20 },
  barTxt: { color: C.ink, fontSize: 14.5, fontWeight: '700' },
});
