import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { C, R } from '../theme';

/* Akıcı geçişler ve yükleme animasyonları (yalnızca React Native Animated, yerel sürücüyle) */
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

/* İlk kare hemen çizilsin, ağır içerik geçiş animasyonu bitince gelsin */
export function useDeferred(min = 0) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    // geçiş animasyonu (~280 ms) bitene kadar ağır içeriği bekletir
    let raf = 0;
    const t = setTimeout(() => { raf = requestAnimationFrame(() => { if (live) setReady(true); }); }, Math.max(min, 180));
    return () => { live = false; clearTimeout(t); cancelAnimationFrame(raf); };
  }, [min]);
  return ready;
}

/* Sekme katmanı: bir kez açılınca bellekte kalır (geri dönüş anında olur), görünürken yumuşakça belirir */
export function TabLayer({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(visible);
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 240, easing: EASE_OUT, useNativeDriver: true }).start();
    }
  }, [visible, a]);
  if (!mounted) return null;
  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, display: visible ? 'flex' : 'none', opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/* Sayfa yığını: yeni sayfa sağdan kayarak gelir, geri dönünce sağa kayarak çıkar; alttaki sayfa hafifçe kararır */
type Item<T> = { r: T; key: number; leaving: boolean };
export function StackHost<T>({ stack, render }: { stack: T[]; render: (r: T) => React.ReactNode }) {
  const [items, setItems] = useState<Item<T>[]>(() => stack.map((r, i) => ({ r, key: i, leaving: false })));
  const prev = useRef(stack);
  const seq = useRef(stack.length);
  useEffect(() => {
    const old = prev.current; prev.current = stack;
    setItems((cur) => {
      const live = cur.filter((x) => !x.leaving);
      // ortak başlangıcı koru, gidenleri "çıkıyor" olarak işaretle, yenileri ekle
      let same = 0;
      while (same < stack.length && same < old.length && stack[same] === old[same]) same++;
      const kept = live.slice(0, same);
      const leaving = live.slice(same).map((x) => ({ ...x, leaving: true }));
      const added = stack.slice(same).map((r) => ({ r, key: ++seq.current, leaving: false }));
      return [...kept, ...added, ...leaving, ...cur.filter((x) => x.leaving)];
    });
  }, [stack]);
  const drop = (key: number) => setItems((cur) => cur.filter((x) => x.key !== key));
  const top = items.filter((x) => !x.leaving).length - 1;
  return (
    <>
      {items.map((x, i) => (
        <Slide key={x.key} leaving={x.leaving} covered={!x.leaving && i < top} onGone={() => drop(x.key)}>{render(x.r)}</Slide>
      ))}
    </>
  );
}
function Slide({ leaving, covered, onGone, children }: { leaving: boolean; covered: boolean; onGone: () => void; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(width)).current;
  const dim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(x, { toValue: 0, duration: 280, easing: EASE_OUT, useNativeDriver: true }).start(); }, [x]);
  useEffect(() => {
    if (leaving) Animated.timing(x, { toValue: width, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onGone());
  }, [leaving]); // eslint-disable-line
  useEffect(() => { Animated.timing(dim, { toValue: covered ? 1 : 0, duration: 260, useNativeDriver: true }).start(); }, [covered, dim]);
  return (
    <Animated.View pointerEvents={leaving || covered ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, transform: [{ translateX: Animated.add(x, dim.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.18] })) }] },
        { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 }]}>
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }) }]} />
    </Animated.View>
  );
}

/* Parlayan taslak kutusu (içerik gelene kadar) */
const pulse = new Animated.Value(0);
let pulsing = false;
function startPulse() {
  if (pulsing) return; pulsing = true;
  Animated.loop(Animated.sequence([
    Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ])).start();
}
export function Bone({ w = '100%', h = 14, r = 7, style }: { w?: number | `${number}%`; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  useEffect(startPulse, []);
  return <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: C.chipLine, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) }, style]} />;
}
export function SkeletonRows({ n = 7 }: { n?: number }) {
  return (
    <View accessibilityLabel="…" accessible>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w={`${55 + ((i * 17) % 35)}%`} h={16} />
            <Bone w={`${35 + ((i * 11) % 25)}%`} h={12} />
            <Bone w="45%" h={11} />
          </View>
        </View>
      ))}
    </View>
  );
}
export function SkeletonGrid({ n = 6 }: { n?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 }}>
      {Array.from({ length: n }).map((_, i) => <Bone key={i} w="48.5%" h={150} r={R.md} />)}
    </View>
  );
}
export function SkeletonPage() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Bone w="40%" h={13} /><Bone w="80%" h={26} r={9} /><Bone w="55%" h={14} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}><Bone w="31%" h={44} r={22} /><Bone w="31%" h={44} r={22} /><Bone w="31%" h={44} r={22} /></View>
      <Bone h={90} r={R.md} style={{ marginTop: 6 }} /><Bone h={70} r={R.md} /><Bone h={110} r={R.md} />
    </View>
  );
}

/* Açılış ekranı: nabız gibi atan harita iğnesi */
export function Splash({ label }: { label?: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true })).start();
  }, [a, ring]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: C.accent,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }} />
        <Animated.View style={{ alignItems: 'center', transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, borderBottomRightRadius: 4, backgroundColor: C.accent, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' }} />
          </View>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', bottom: 22, width: 26, height: 6, borderRadius: 3, backgroundColor: '#000',
          opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.07] }), transform: [{ scaleX: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }] }} />
      </View>
      {!!label && <Text style={{ marginTop: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.4 }}>{label}</Text>}
    </View>
  );
}
