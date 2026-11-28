import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { C, R, isDark } from '../theme';

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

/* Sekme katmanı: bir kez açılınca bellekte kalır. Sekme değişince yöne göre kayarak girer ve çıkar:
   sağdaki sekmeye geçerken yeni ekran sağdan gelir, eskisi sola kayarak kaybolur (geri dönüşte tersi). */
export function TabLayer({ visible, dir = 1, children }: { visible: boolean; dir?: number; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [shown, setShown] = useState(visible);
  const a = useRef(new Animated.Value(visible ? 1 : 0)).current;      // 0 = görünmez, 1 = yerinde
  const off = useRef(new Animated.Value(0)).current;                    // görünmezken durduğu yatay konum
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const d = dir || 1;
    if (visible) {
      setMounted(true); setShown(true);
      off.setValue(d * width * 0.28); a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 320, easing: EASE_OUT, useNativeDriver: true }).start();
    } else {
      off.setValue(-d * width * 0.28);
      Animated.timing(a, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => { if (finished) setShown(false); });
    }
  }, [visible]); // eslint-disable-line
  if (!mounted) return null;
  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, display: shown ? 'flex' : 'none', opacity: a,
        transform: [{ translateX: Animated.multiply(Animated.subtract(1, a), off) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }]}>
      <ThemeBg />
      {children}
    </Animated.View>
  );
}

/* degrade temalarda arka plan (düz temalarda hiçbir şey çizmez) */
export function ThemeBg() {
  if (!C.grad) return null;
  const [a, b] = C.grad.split(',');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" preserveAspectRatio="none">
      <Defs><LinearGradient id="tg" x1="0" y1="0" x2="0.35" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient></Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#tg)" />
    </Svg>
  );
}

/* Alt sekme çubuğunda seçili sekmenin altında kayan çizgi */
export function TabIndicator({ index, count, color }: { index: number; count: number; color: string }) {
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => { Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 16, bounciness: 6 }).start(); }, [index, x]);
  const w = width / count;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: w, alignItems: 'center',
      transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(1, count - 1)], outputRange: [0, w * Math.max(1, count - 1)] }) }] }}>
      <View style={{ width: Math.min(46, w * 0.5), height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: color }} />
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
      <ThemeBg />
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

/* ---------- Logo: konum iğnesi + ay-yıldız ---------- */
export const BRAND = { bg: '#1E1A1A', pin: '#E0453A', em: '#FFF6EE' };
const PIN_D = 'M0,0 C-6,-8 -10,-12 -10,-18 A10,10 0 1 1 10,-18 C10,-12 6,-8 0,0Z';
const CRES_D = (R: number) => { const r = R * 0.8, d = R * 0.5, x = (R * R - r * r + d * d) / (2 * d), y = Math.sqrt(R * R - x * x); return `M${x},${-y} A${R},${R} 0 1 0 ${x},${y} A${r},${r} 0 1 1 ${x},${-y}Z`; };
const STAR_D = (R: number) => { const p: string[] = []; for (let i = 0; i < 10; i++) { const a = Math.PI + (i * Math.PI) / 5, rr = i % 2 ? R * 0.4 : R; p.push(`${(rr * Math.cos(a)).toFixed(3)},${(rr * Math.sin(a)).toFixed(3)}`); } return 'M' + p.join('L') + 'Z'; };
const EM_R = 12.5 / 2.2;
/* iğne: uç (0,0), baş merkezi (0,-18), yarıçap 10 birim. size = iğnenin yüksekliği (px) */
export function LogoPin({ size = 64, pin = BRAND.pin, em = BRAND.em }: { size?: number; pin?: string; em?: string }) {
  const w = size * (20.5 / 28);
  return (
    <Svg width={w} height={size} viewBox="-10.25 -28.1 20.5 28.2">
      <Path d={PIN_D} fill={pin} />
      <Path d={CRES_D(EM_R)} fill={em} x={-EM_R * 0.16} y={-18} />
      <Path d={STAR_D(EM_R * 0.37)} fill={em} x={EM_R * 0.6} y={-18} />
    </Svg>
  );
}

/* Açılış ekranı: logo zıplar, yere değince jöle gibi basılıp toparlanır; altından halka yayılır */
export function Splash({ label }: { label?: string }) {
  const jump = useRef(new Animated.Value(0)).current;   // 0 yerde, 1 tepede
  const squash = useRef(new Animated.Value(0)).current; // yere değince basılma
  const ring = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 520, easing: EASE_OUT, useNativeDriver: true }).start();
    const hop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(jump, { toValue: 1, duration: 460, easing: Easing.bezier(0.2, 0.7, 0.35, 1), useNativeDriver: true }),
        Animated.timing(squash, { toValue: -0.6, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(jump, { toValue: 0, duration: 400, easing: Easing.bezier(0.6, 0, 0.85, 0.4), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.spring(squash, { toValue: 1, velocity: 6, stiffness: 900, damping: 14, mass: 1, useNativeDriver: true }),
      Animated.spring(squash, { toValue: 0, stiffness: 420, damping: 11, mass: 1, useNativeDriver: true }),
    ]));
    const pulse = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }));
    hop.start(); pulse.start();
    return () => { hop.stop(); pulse.stop(); };
  }, [jump, squash, ring, intro]);
  const H = 76;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND.bg }}>
      <Animated.View style={{ width: 160, height: 150, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18, opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }] }}>
        <Animated.View style={{ position: 'absolute', bottom: 6, width: 120, height: 26, borderRadius: 60, borderWidth: 2, borderColor: BRAND.pin,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scaleX: ring.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }, { scaleY: ring.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }] }} />
        <Animated.View style={{ position: 'absolute', bottom: 14, width: 44, height: 10, borderRadius: 5, backgroundColor: BRAND.pin,
          opacity: jump.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.1] }), transform: [{ scaleX: jump.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }] }} />
        <Animated.View style={{ transform: [
          { translateY: jump.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) },
          { translateY: H / 2 }, // ölçek iğnenin ucundan (alttan) olsun
          { scaleY: squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 0.84] }) },
          { scaleX: squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.94, 1, 1.12] }) },
          { translateY: -H / 2 },
        ] }}>
          <LogoPin size={H} />
        </Animated.View>
      </Animated.View>
      {!!label && <Animated.Text style={{ marginTop: 12, color: '#EFE4DA', fontWeight: '700', letterSpacing: 0.4, opacity: intro }}>{label}</Animated.Text>}
    </View>
  );
}

/* ---------- Yükleme: yandan görülen atom; hilal ve yıldızlar yörüngede döner, jöle gibi esner ----------
   Her parçanın bir turu önceden hesaplanır (yay benzetimiyle), sonra yerel sürücüyle oynatılır: JS meşgulken bile akıcı. */
type Orbit = { rx: number; tilt: number; roll: number; speed: number; bodies: { k: 'c' | 's'; s: number; ph: number }[] };
const ATOM: Orbit[] = [
  { rx: 32, tilt: 0.34, roll: -25, speed: 0.42, bodies: [{ k: 'c', s: 8.5, ph: 0 }, { k: 's', s: 6, ph: 0.5 }] },
  { rx: 32, tilt: 0.34, roll: 30, speed: 0.34, bodies: [{ k: 's', s: 7, ph: 0.2 }, { k: 'c', s: 7.5, ph: 0.7 }] },
  { rx: 22, tilt: 0.4, roll: 90, speed: 0.55, bodies: [{ k: 's', s: 5.5, ph: 0.35 }] },
];
type Track = { k: 'c' | 's'; s: number; T: number; ph: number; u: number[]; x: number[]; y: number[]; dir: number[]; sx: number[]; sy: number[]; rot: number[]; op: number[]; back: number[]; front: number[] };
const N = 72;
function buildTracks(): Track[] {
  const out: Track[] = [];
  ATOM.forEach((o) => o.bodies.forEach((b) => {
    const T = 1 / o.speed, rr = (o.roll * Math.PI) / 180, spin = b.k === 's' ? 1 : -1;
    const pos = (t: number) => { let a = (t * o.speed + b.ph) * 2 * Math.PI; a += 0.3 * Math.sin(a); const x0 = Math.cos(a) * o.rx, y0 = Math.sin(a) * o.rx * o.tilt; return { a, z: Math.sin(a), x: x0 * Math.cos(rr) - y0 * Math.sin(rr), y: x0 * Math.sin(rr) + y0 * Math.cos(rr) }; };
    const dt = 1 / 240; let sx = 0, sv = 0, lx = 0, lv = 0, dir = 0, px = pos(0);
    const tr: Track = { k: b.k, s: b.s, T, ph: b.ph, u: [], x: [], y: [], dir: [], sx: [], sy: [], rot: [], op: [], back: [], front: [] };
    const total = T * 6, rec = T * 5; let next = 0;
    for (let t = dt; t <= total + 2 * dt; t += dt) {
      const p = pos(t), vx = (p.x - px.x) / dt, vy = (p.y - px.y) / dt, spd = Math.hypot(vx, vy); px = p;
      if (spd > 0.5) { let dd = Math.atan2(vy, vx) - dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); dir += dd * Math.min(1, dt * 10); }
      const tgt = Math.min(0.3, spd / 380); const acc = 70 * (tgt - sx) - 7 * sv; sv += acc * dt; sx += sv * dt;
      const lacc = 40 * (Math.sin(p.a) * 0.25 - lx) - 5 * lv; lv += lacc * dt; lx += lv * dt;
      if (t >= rec && next <= N) {
        const uu = (t - rec) / T;
        if (uu >= next / N - 1e-9) {
          const d0 = (p.z + 1) / 2, depth = d0 * d0 * (3 - 2 * d0), sc = 0.6 + 0.5 * depth;
          tr.u.push(next / N); tr.x.push(p.x); tr.y.push(p.y); tr.dir.push((dir * 180) / Math.PI);
          tr.sx.push(sc * (1 + sx)); tr.sy.push(sc * (1 - sx * 0.6));
          tr.rot.push(spin * 360 * (next / N) + lx * 57.3);
          tr.op.push(0.32 + 0.68 * depth); tr.back.push(p.z < 0 ? 1 : 0); tr.front.push(p.z < 0 ? 0 : 1);
          next++;
        }
      }
    }
    // açıların sürekli olması (360° sıçraması olmasın)
    for (let i = 1; i < tr.dir.length; i++) { while (tr.dir[i] - tr.dir[i - 1] > 180) tr.dir[i] -= 360; while (tr.dir[i] - tr.dir[i - 1] < -180) tr.dir[i] += 360; }
    out.push(tr);
  }));
  return out;
}
let TRACKS: Track[] | null = null;
function AtomBody({ tr, v, k, color, layer }: { tr: Track; v: InstanceType<typeof Animated.Value>; k: number; color: string; layer: 'back' | 'front' }) {
  const box = tr.s * 2.4 * k, d = tr.k === 's' ? STAR_D(tr.s) : CRES_D(tr.s);
  const ip = (arr: number[], f = (x: number) => x) => v.interpolate({ inputRange: tr.u, outputRange: arr.map(f) });
  const ipd = (arr: number[]) => v.interpolate({ inputRange: tr.u, outputRange: arr.map((x) => `${x.toFixed(2)}deg`) });
  const vis = layer === 'back' ? tr.back : tr.front;
  const opacity = Animated.multiply(ip(tr.op), ip(vis));
  const relRot = tr.rot.map((r, i) => r - tr.dir[i]);
  return (
    <Animated.View style={{ position: 'absolute', left: -box / 2, top: -box / 2, width: box, height: box, opacity,
      transform: [{ translateX: ip(tr.x, (x) => x * k) }, { translateY: ip(tr.y, (y) => y * k) }, { rotate: ipd(tr.dir) }, { scaleX: ip(tr.sx) }, { scaleY: ip(tr.sy) }, { rotate: ipd(relRot) }] }}>
      <Svg width={box} height={box} viewBox={`${-tr.s * 1.2} ${-tr.s * 1.2} ${tr.s * 2.4} ${tr.s * 2.4}`}><Path d={d} fill={color} /></Svg>
    </Animated.View>
  );
}
export function Atom({ size = 72, color }: { size?: number; color?: string }) {
  if (!TRACKS) TRACKS = buildTracks();
  const tracks = TRACKS;
  const vals = useRef(tracks.map(() => new Animated.Value(0))).current;
  const wob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loops = vals.map((v, i) => Animated.loop(Animated.timing(v, { toValue: 1, duration: tracks[i].T * 1000, easing: Easing.linear, useNativeDriver: true, isInteraction: false })));
    const w = Animated.loop(Animated.timing(wob, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    loops.forEach((l) => l.start()); w.start();
    return () => { loops.forEach((l) => l.stop()); w.stop(); };
  }, [vals, wob, tracks]);
  const col = color || (isDark ? '#F0806B' : '#C0392B'), k = size / 100;
  const ws = Array.from({ length: 29 }, (_, i) => i / 28);
  const rot = wob.interpolate({ inputRange: ws, outputRange: ws.map((u) => `${(Math.sin(u * 2 * Math.PI) * 5).toFixed(2)}deg`) });
  const bob = wob.interpolate({ inputRange: ws, outputRange: ws.map((u) => Math.sin(u * 4 * Math.PI) * 1.4 * k) });
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityLabel="…">
      <Animated.View style={{ position: 'absolute', left: size / 2, top: size / 2, transform: [{ rotate: rot }, { translateY: bob }] }}>
        {tracks.map((tr, i) => <AtomBody key={'b' + i} tr={tr} v={vals[i]} k={k} color={col} layer="back" />)}
        {tracks.map((tr, i) => <AtomBody key={'f' + i} tr={tr} v={vals[i]} k={k} color={col} layer="front" />)}
      </Animated.View>
    </View>
  );
}

/* Yükleme yıldızı: 12 ışın sırayla parlar (dönen ışık), yıldız nefes alır, ortada harita iğnesi atar */
export function Spark({ size = 56, color = C.accent }: { size?: number; color?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 960, easing: (t) => Math.floor(t * 12) / 12, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [spin, breath]);
  const bar = size * 0.2, thick = Math.max(3, size * 0.075), r = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="progressbar" accessibilityLabel="…">
      <Animated.View style={{ position: 'absolute', width: size, height: size,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }, { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] }) }] }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', transform: [{ rotate: `${i * 30}deg` }] }}>
            <View style={{ width: thick, height: bar, borderRadius: thick / 2, backgroundColor: color, opacity: 0.12 + (0.88 * i) / 11 }} />
          </View>
        ))}
      </Animated.View>
      <Animated.View style={{ width: r * 0.5, height: r * 0.5, borderRadius: r * 0.25, borderBottomRightRadius: r * 0.06, backgroundColor: color, alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: '45deg' }, { scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.85] }) }] }}>
        <View style={{ width: r * 0.17, height: r * 0.17, borderRadius: r * 0.085, backgroundColor: C.surface }} />
      </Animated.View>
    </View>
  );
}

/* Sayfa değişirken ekranın ortasında kısa bir an beliren yükleme animasyonu; arkasında kart yok (dokunmayı engellemez) */
export function PageLoader({ signal }: { signal: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOn(true); a.stopAnimation();
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 140, easing: EASE_OUT, useNativeDriver: true }),
      Animated.delay(340),
      Animated.timing(a, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setOn(false); });
  }, [signal]); // eslint-disable-line
  if (!on) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
        <Atom size={72} />
      </Animated.View>
    </View>
  );
}
