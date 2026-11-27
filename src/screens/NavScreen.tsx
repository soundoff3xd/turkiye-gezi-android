import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useKeepAwake } from 'expo-keep-awake';
import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { fmtDist } from '../lib/location';
import { useNav } from '../lib/ui';
import { ARROW, aheadBearing, fetchRoute, prepTrack, routeErrorText, RouteError, snap, stepAt, type Profile, type RouteRes, type Snap, type Track } from '../lib/routing';
import { MAP_STYLE } from './MapScreen';
import { fmtDur } from './RouteScreen';
import { fetchAlong, kindIcon, type AlongItem, type Stop } from '../lib/stops';
import { C, R, shadow } from '../theme';

/* sürüş / bisiklet / yürüyüş için: sesli uyarı mesafeleri ve rotadan sapma sınırı (metre) */
const TUNE: Record<Profile, { pre: number; now: number; off: number; zoom: number }> = {
  'driving-car': { pre: 350, now: 70, off: 55, zoom: 16.4 },
  'cycling-regular': { pre: 150, now: 30, off: 35, zoom: 17 },
  'foot-walking': { pre: 60, now: 15, off: 30, zoom: 17.6 },
};

const BREAK_MS = 2 * 3600 * 1000;

/* Canlı navigasyon: haritada seni takip eder, sıradaki dönüşü gösterir ve sesli söyler, yoldan çıkınca rotayı yeniler */
export default function NavScreen({ stops: initStops, mode, avoid = [] }: { stops: Stop[]; mode: string; avoid?: string[] }) {
  useKeepAwake();
  const { t, num, lang } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { pop } = useNav();
  const profile = (TUNE[mode as Profile] ? mode : 'driving-car') as Profile;
  const tune = TUNE[profile];
  const [stops, setStops] = useState<Stop[]>(initStops || []);
  const stopsRef = useRef(stops); stopsRef.current = stops;
  const cam = useRef<CameraRef>(null);

  const [route, setRoute] = useState<RouteRes | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [sn, setSn] = useState<Snap | null>(null);
  const [status, setStatus] = useState<'loading' | 'nav' | 'reroute' | 'arrived' | 'error'>('loading');
  const [err, setErr] = useState('');
  const [muted, setMuted] = useState(false);
  const [follow, setFollow] = useState(true);
  const leg0 = useRef(0);             // yeniden hesaplamada geçilen durak sayısı
  const spoken = useRef(new Set<string>());
  const offCount = useRef(0), lastReroute = useRef(0), lastLeg = useRef(0);
  const mutedRef = useRef(muted); mutedRef.current = muted;
  // uzun yol molası: araba ile 2 saat aralıksız sürünce hatırlat (10 dk durmak mola sayılır)
  const driveStart = useRef(Date.now()), lastMove = useRef<{ lat: number; lng: number; at: number } | null>(null), breakAsked = useRef(false);
  const [brk, setBrk] = useState<null | 'ask' | 'list'>(null);
  const [brItems, setBrItems] = useState<AlongItem[] | null>(null);

  const say = useCallback((text: string, language?: string) => {
    if (mutedRef.current || !text) return;
    Speech.stop(); Speech.speak(text, { language: language || lang, rate: 1.0 });
  }, [lang]);
  useEffect(() => () => { Speech.stop(); }, []);

  const load = useCallback(async (from: { lat: number; lng: number }, startLeg: number, list?: Stop[]) => {
    const rest = (list || stopsRef.current).slice(startLeg);
    if (!rest.length) return;
    try {
      const r = await fetchRoute(profile, [[from.lng, from.lat], ...rest.map((p) => [p.lng, p.lat] as [number, number])], lang, avoid);
      leg0.current = startLeg; lastLeg.current = 0; spoken.current = new Set();
      setRoute(r); setTrack(prepTrack(r.geometry)); setStatus('nav');
      if (r.steps[0]) say(r.steps[0].i, r.lang);
    } catch (e) {
      setStatus((s) => (s === 'reroute' ? 'nav' : 'error'));
      setErr(t(routeErrorText(e instanceof RouteError ? e.code : 'network')));
    }
  }, [profile, lang, say, t]); // eslint-disable-line

  // yüksek doğrulukla konum dinle
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null, alive = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) { setStatus('error'); setErr(t('Navigasyon için konum izni gerekiyor.')); return; }
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
        if (!alive) return;
        const p0 = { lat: first.coords.latitude, lng: first.coords.longitude, acc: first.coords.accuracy ?? 30 };
        setMe(p0); load(p0, 0);
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 1000 },
          (l) => setMe({ lat: l.coords.latitude, lng: l.coords.longitude, acc: l.coords.accuracy ?? 30 }));
      } catch { setStatus('error'); setErr(t('Konumun bulunamadı. Telefonunda konum servisinin açık olduğundan emin ol.')); }
    })();
    return () => { alive = false; sub?.remove(); };
  }, []); // eslint-disable-line

  // her konum güncellemesinde: rotaya oturt, adımı bul, gerekirse konuş / rotayı yenile / kamerayı çevir
  useEffect(() => {
    if (!me || !track || !route || status === 'arrived') return;
    const s = snap(track, me.lat, me.lng, sn?.idx ?? 0);
    setSn(s);
    const remaining = track.total - s.along;
    const lastStop = stops[stops.length - 1];
    if (remaining < 25 || (status === 'nav' && lastStop && Math.hypot((me.lat - lastStop.lat) * 110540, (me.lng - lastStop.lng) * 111320 * Math.cos(me.lat * Math.PI / 180)) < 30)) {
      setStatus('arrived'); say(t('Hedefe ulaştın: {1}', lastStop?.n || ''), lang); return;
    }
    // rotadan çıktın mı?
    if (s.off > tune.off && me.acc < 60) offCount.current++; else offCount.current = 0;
    if (offCount.current >= 2 && Date.now() - lastReroute.current > 15000 && status === 'nav') {
      lastReroute.current = Date.now(); offCount.current = 0; setStatus('reroute');
      say(t('Rota yeniden hesaplanıyor'), lang);
      load(me, leg0.current + lastLeg.current);
      return;
    }
    const k = stepAt(route.steps, s.idx), st = route.steps[k], next = route.steps[k + 1];
    // ara durağa varış
    if (st && st.k > lastLeg.current) {
      const reached = stops[leg0.current + st.k - 1];
      lastLeg.current = st.k;
      if (reached) say(t('{1} durağına ulaştın', reached.n), lang);
    }
    if (next) {
      const dist = track.cum[Math.min(st.e, track.cum.length - 1)] - s.along;
      const sameLang = route.lang === lang;
      if (dist <= tune.now && !spoken.current.has(`${k}n`)) { spoken.current.add(`${k}n`); spoken.current.add(`${k}p`); say(next.i, route.lang); }
      else if (dist <= tune.pre && dist > tune.now * 1.6 && !spoken.current.has(`${k}p`)) {
        spoken.current.add(`${k}p`);
        say(sameLang ? `${t('{1} sonra', fmtDist(dist, (n, d) => num(n, d)))}, ${next.i}` : next.i, route.lang);
      }
    }
    if (profile === 'driving-car') {
      const now = Date.now(), lm = lastMove.current;
      if (!lm || Math.hypot((me.lat - lm.lat) * 110540, (me.lng - lm.lng) * 111320 * Math.cos(me.lat * Math.PI / 180)) > 80) lastMove.current = { lat: me.lat, lng: me.lng, at: now };
      else if (now - lm.at > 10 * 60000) { driveStart.current = now; breakAsked.current = false; }
      if (now - driveStart.current > BREAK_MS && !breakAsked.current) {
        breakAsked.current = true; setBrk('ask');
        say(t('2 saattir yoldasın. Kısa bir mola vermeye ne dersin?'), lang);
      }
    }
    if (follow) {
      const on = s.off < 40;
      cam.current?.easeTo({ center: on ? [s.lng, s.lat] : [me.lng, me.lat], zoom: tune.zoom, bearing: aheadBearing(track, s), pitch: 45, duration: 900, easing: 'linear',
        padding: { top: height * 0.32, bottom: 150 + insets.bottom, left: 0, right: 0 } });
    }
  }, [me, track]); // eslint-disable-line

  const left = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!track || !sn) return { type: 'FeatureCollection', features: route ? [{ type: 'Feature', properties: {}, geometry: route.geometry }] : [] };
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[sn.lng, sn.lat], ...track.pts.slice(sn.idx + 1)] } }] };
  }, [track, sn, route]);
  const dots = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: [
      ...stops.map((p, i) => ({ type: 'Feature', properties: { k: 'd', n: stops.length > 1 ? String(i + 1) : '' }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
      ...(me ? [{ type: 'Feature', properties: { k: 'me', n: '' }, geometry: { type: 'Point', coordinates: [me.lng, me.lat] } }] : []),
    ] as any,
  }), [stops, me]);

  async function findBreak() {
    setBrk('list'); setBrItems(null);
    if (!track || !sn) { setBrItems([]); return; }
    try { setBrItems((await fetchAlong(track, ['rest', 'fuel', 'food'], sn.along + 300, sn.along + 45000)).slice(0, 5)); } catch { setBrItems([]); }
  }
  /* mola yerini sıradaki durak yap ve rotayı yeniden hesapla */
  function addBreak(a: AlongItem) {
    const at = leg0.current + lastLeg.current;
    const next = stopsRef.current.slice(); next.splice(at, 0, { n: a.n || t('Mola'), lat: a.lat, lng: a.lng, k: a.k });
    setStops(next); stopsRef.current = next; setBrk(null); driveStart.current = Date.now();
    if (me) { setStatus('reroute'); load(me, at, next); }
  }
  function overview() {
    setFollow(false);
    if (!route) return;
    const cs = route.geometry.coordinates as [number, number][], xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]);
    cam.current?.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 200, right: 40, bottom: 200, left: 40 }, bearing: 0, pitch: 0, duration: 700 });
  }

  // ekranda gösterilecekler
  const k = route && sn ? stepAt(route.steps, sn.idx) : 0;
  const st = route?.steps[k], next = route?.steps[k + 1], after = route?.steps[k + 2];
  const toTurn = route && track && sn && st ? Math.max(0, track.cum[Math.min(st.e, track.cum.length - 1)] - sn.along) : 0;
  const remD = track && sn ? Math.max(0, track.total - sn.along) : route?.distance || 0;
  let remT = route?.duration || 0;
  if (route && track && sn && st) {
    const frac = st.d > 0 ? Math.min(1, toTurn / st.d) : 0;
    remT = st.t * frac + route.steps.slice(k + 1).reduce((a, x) => a + x.t, 0);
  }
  const eta = new Date(Date.now() + remT * 1000);
  let etaTxt = ''; try { etaTxt = eta.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }); } catch { etaTxt = `${eta.getHours()}:${String(eta.getMinutes()).padStart(2, '0')}`; }

  return (
    <View style={{ flex: 1, backgroundColor: '#E9E5DC' }}>
      <Map style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE} compass={false} logo={false} touchPitch={false}
        onRegionWillChange={(e: any) => { if (e?.nativeEvent?.userInteraction || e?.nativeEvent?.isUserInteraction) setFollow(false); }}>
        <Camera ref={cam} initialViewState={stops[0] ? { center: [stops[0].lng, stops[0].lat], zoom: 13 } : undefined} />
        <GeoJSONSource id="nav-route" data={left}>
          <Layer type="line" id="nav-casing" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#0B4AA8', 'line-width': 11 }} />
          <Layer type="line" id="nav-line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#2F80ED', 'line-width': 7 }} />
        </GeoJSONSource>
        <GeoJSONSource id="nav-dots" data={dots}>
          <Layer type="circle" id="nav-halo" filter={['==', ['get', 'k'], 'me']} paint={{ 'circle-radius': 22, 'circle-color': '#1F6FEB', 'circle-opacity': 0.18 }} />
          <Layer type="circle" id="nav-dot" paint={{ 'circle-radius': ['match', ['get', 'k'], 'me', 10, 11], 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF', 'circle-color': ['match', ['get', 'k'], 'me', '#1F6FEB', C.accent] }} />
          <Layer type="symbol" id="nav-num" layout={{ 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true }} paint={{ 'text-color': '#FFFFFF' }} />
        </GeoJSONSource>
      </Map>

      {/* üst: sıradaki manevra */}
      <View style={[s.banner, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
        {status === 'loading' ? (
          <View style={s.row}><ActivityIndicator color="#FFFFFF" /><Text style={s.bannerTxt}>{t('Rota hesaplanıyor…')}</Text></View>
        ) : status === 'error' ? (
          <Text style={s.bannerTxt}>{err}</Text>
        ) : status === 'arrived' ? (
          <View style={s.row}><Text style={s.arrow}>⚑</Text><Text style={[s.bannerTxt, { fontSize: 20 }]}>{t('Hedefe ulaştın: {1}', stops[stops.length - 1]?.n || '')}</Text></View>
        ) : (
          <>
            <View style={s.row}>
              <Text style={s.arrow}>{ARROW[(next || st)?.y ?? 6] || '↑'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.dist}>{next ? fmtDist(toTurn, (n, d) => num(n, d)) : fmtDist(remD, (n, d) => num(n, d))}</Text>
                <Text style={s.bannerTxt} numberOfLines={3}>{status === 'reroute' ? t('Rota yeniden hesaplanıyor…') : (next || st)?.i}</Text>
              </View>
            </View>
            {!!after && status === 'nav' && <Text style={s.then} numberOfLines={1}>{`${t('Sonra')}: ${ARROW[after.y] || ''} ${after.i}`}</Text>}
          </>
        )}
      </View>

      {!follow && status !== 'arrived' && (
        <Pressable onPress={() => setFollow(true)} style={[s.recenter, { bottom: 150 + insets.bottom }]} accessibilityRole="button">
          <Text style={{ color: '#1F6FEB', fontWeight: '800' }}>{`◎ ${t('Ortala')}`}</Text>
        </Pressable>
      )}

      {brk && status !== 'arrived' && (
        <View style={[s.brk, { bottom: 140 + insets.bottom }]}>
          {brk === 'ask' ? (
            <>
              <Text style={s.brkT}>{`☕ ${t('2 saattir yoldasın. Kısa bir mola iyi gelir.')}`}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Pressable onPress={findBreak} style={[s.brkBtn, { backgroundColor: C.accent }]}><Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{t('Mola yeri bul')}</Text></Pressable>
                <Pressable onPress={() => { setBrk(null); driveStart.current = Date.now(); breakAsked.current = false; }} style={s.brkBtn}><Text style={{ color: C.ink, fontWeight: '800' }}>{t('Sonra')}</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[s.brkT, { flex: 1 }]}>{t('İleride mola yerleri')}</Text>
                <Pressable onPress={() => setBrk(null)} hitSlop={10}><Text style={{ color: C.muted, fontSize: 18, fontWeight: '800' }}>✕</Text></Pressable>
              </View>
              {!brItems ? <ActivityIndicator style={{ marginTop: 10 }} color={C.accent} /> : !brItems.length ? <Text style={{ color: C.muted, marginTop: 8 }}>{t('Önümüzdeki 45 km içinde bulunamadı.')}</Text> : brItems.map((a) => (
                <Pressable key={`${a.lat},${a.lng}`} onPress={() => addBreak(a)} style={s.brkRow}>
                  <Text style={{ fontSize: 18 }}>{kindIcon(a.k)}</Text>
                  <Text style={{ flex: 1, color: C.ink, fontWeight: '700' }} numberOfLines={1}>{a.n || t('Mola')}</Text>
                  <Text style={{ color: C.muted }}>{fmtDist(Math.max(0, a.along - (sn?.along || 0)), (n, d) => num(n, d))}</Text>
                  <Text style={{ color: C.accent, fontWeight: '900' }}>＋</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}

      {/* alt: kalan süre, mesafe, varış saati */}
      <View style={[s.panel, { paddingBottom: insets.bottom + 14 }]}>
        <View style={{ flex: 1 }}>
          {status === 'arrived' ? <Text style={s.big}>{t('Keyifli geziler!')}</Text> : (
            <>
              <Text style={s.big}>{route ? fmtDur(remT, t, num) : '–'}</Text>
              <Text style={s.small}>{route ? `${fmtDist(remD, (n, d) => num(n, d))} · ${t('Varış {1}', etaTxt)}` : ''}</Text>
            </>
          )}
        </View>
        <Pressable onPress={() => { setMuted((m) => !m); Speech.stop(); }} style={s.icon} accessibilityRole="button" accessibilityLabel={muted ? t('Sesi aç') : t('Sesi kapat')}>
          <Text style={{ fontSize: 20 }}>{muted ? '🔇' : '🔊'}</Text>
        </Pressable>
        {profile === 'driving-car' && status === 'nav' && (
          <Pressable onPress={findBreak} style={s.icon} accessibilityRole="button" accessibilityLabel={t('Mola yeri bul')}>
            <Text style={{ fontSize: 19 }}>☕</Text>
          </Pressable>
        )}
        <Pressable onPress={overview} style={s.icon} accessibilityRole="button" accessibilityLabel={t('Genel bakış')}>
          <Text style={{ fontSize: 19 }}>🗺</Text>
        </Pressable>
        <Pressable onPress={() => { Speech.stop(); pop(); }} style={s.end} accessibilityRole="button">
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>{t('Bitir')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { position: 'absolute', left: 10, right: 10, backgroundColor: '#14532D', borderRadius: R.lg, padding: 14, ...shadow, elevation: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  arrow: { color: '#FFFFFF', fontSize: 44, fontWeight: '900', width: 50, textAlign: 'center' },
  dist: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  bannerTxt: { color: '#E8F5EC', fontSize: 16.5, fontWeight: '700', lineHeight: 22, flexShrink: 1 },
  then: { color: '#BFE3CB', fontSize: 14, fontWeight: '600', marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.2)', paddingTop: 8 },
  recenter: { position: 'absolute', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 11, ...shadow },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow, elevation: 12 },
  big: { fontSize: 24, fontWeight: '900', color: C.ok },
  small: { fontSize: 14.5, color: C.muted, marginTop: 2 },
  icon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  brk: { position: 'absolute', left: 12, right: 12, backgroundColor: C.surface, borderRadius: R.lg, padding: 14, ...shadow, elevation: 11 },
  brkT: { color: C.ink, fontWeight: '800', fontSize: 15.5, lineHeight: 21 },
  brkBtn: { flex: 1, borderRadius: R.pill, paddingVertical: 10, alignItems: 'center', backgroundColor: C.bg },
  brkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.line },
  end: { backgroundColor: C.danger, borderRadius: R.pill, paddingHorizontal: 18, height: 46, justifyContent: 'center' },
});
