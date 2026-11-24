import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* Gezi listem: gezmek istediğin yerler, senin belirlediğin sırayla (telefonda saklanır) */
export const TRIP_MAX = 24;
type Trip = {
  ids: string[]; has: (id: string) => boolean;
  add: (id: string) => boolean; addMany: (ids: string[]) => number; remove: (id: string) => void;
  move: (id: string, d: -1 | 1) => void; setAll: (ids: string[]) => void; clear: () => void;
};
const TripCtx = createContext<Trip | null>(null);
export const useTrip = () => useContext(TripCtx) as Trip;

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    AsyncStorage.getItem('gezi-trip').then((v) => { try { const x = JSON.parse(v || '[]'); if (Array.isArray(x)) setIds(x.filter((i) => typeof i === 'string').slice(0, TRIP_MAX)); } catch { /* */ } }).catch(() => {});
  }, []);
  const save = useCallback((next: string[]) => { setIds(next); AsyncStorage.setItem('gezi-trip', JSON.stringify(next)).catch(() => {}); }, []);
  const add = useCallback((id: string) => {
    if (ids.includes(id)) return true;
    if (ids.length >= TRIP_MAX) return false;
    save([...ids, id]); return true;
  }, [ids, save]);
  const addMany = useCallback((xs: string[]) => {
    const next = ids.slice(); let n = 0;
    xs.forEach((x) => { if (!next.includes(x) && next.length < TRIP_MAX) { next.push(x); n++; } });
    save(next); return n;
  }, [ids, save]);
  const remove = useCallback((id: string) => save(ids.filter((x) => x !== id)), [ids, save]);
  const move = useCallback((id: string, d: -1 | 1) => {
    const i = ids.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= ids.length) return;
    const next = ids.slice(); [next[i], next[j]] = [next[j], next[i]]; save(next);
  }, [ids, save]);
  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), add, addMany, remove, move, setAll: save, clear: () => save([]) }), [ids, add, addMany, remove, move, save]);
  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}
