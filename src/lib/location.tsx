import React, { createContext, useCallback, useMemo, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { meters } from '../data/catalog';

/* Kullanıcının konumu: yalnızca telefonda kullanılır, sunucuya gönderilmez ve kaydedilmez. */
export type Pos = { lat: number; lng: number; acc: number };
type Ctx = {
  pos: Pos | null;
  status: 'unknown' | 'granted' | 'denied';
  request: () => Promise<Pos | null>;
  distTo: (lat: number, lng: number) => number | null;
};
const LocCtx = createContext<Ctx | null>(null);
export const useLocation = () => useContext(LocCtx) as Ctx;

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [status, setStatus] = useState<Ctx['status']>('unknown');
  const sub = useRef<Location.LocationSubscription | null>(null);

  const start = useCallback(async () => {
    if (sub.current) return;
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) setPos({ lat: last.coords.latitude, lng: last.coords.longitude, acc: last.coords.accuracy ?? 100 });
      sub.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
        (l) => setPos({ lat: l.coords.latitude, lng: l.coords.longitude, acc: l.coords.accuracy ?? 100 }));
    } catch { /* konum servisleri kapalı olabilir */ }
  }, []);
  const stop = useCallback(() => { sub.current?.remove(); sub.current = null; }, []);

  // izin daha önce verildiyse sormadan başla; uygulama arka plana geçince dinlemeyi durdur (pil için)
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((p) => {
      if (p.granted) { setStatus('granted'); start(); } else if (!p.canAskAgain) setStatus('denied');
    }).catch(() => {});
    const s = AppState.addEventListener('change', (st) => {
      if (st === 'active') Location.getForegroundPermissionsAsync().then((p) => { if (p.granted) { setStatus('granted'); start(); } }).catch(() => {});
      else stop();
    });
    return () => { s.remove(); stop(); };
  }, [start, stop]);

  const request = useCallback(async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) { setStatus('denied'); throw new Error('Konum izni verilmedi. Telefonunun ayarlarından izin verebilirsin.'); }
    setStatus('granted');
    await start();
    try {
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const v = { lat: cur.coords.latitude, lng: cur.coords.longitude, acc: cur.coords.accuracy ?? 50 };
      setPos(v); return v;
    } catch {
      throw new Error('Konumun bulunamadı. Telefonunda konum servisinin açık olduğundan emin ol.');
    }
  }, [start]);

  const distTo = useCallback((lat: number, lng: number) => (pos ? meters(pos.lat, pos.lng, lat, lng) : null), [pos]);
  const value = useMemo(() => ({ pos, status, request, distTo }), [pos, status, request, distTo]);
  return <LocCtx.Provider value={value}>{children}</LocCtx.Provider>;
}

/* 850 m · 4,2 km · 128 km */
export function fmtDist(m: number, num: (n: number, d?: number) => string) {
  if (m < 1000) return `${num(Math.max(10, Math.round(m / 10) * 10))} m`;
  return m < 10000 ? `${num(m / 1000, 1)} km` : `${num(Math.round(m / 1000))} km`;
}
