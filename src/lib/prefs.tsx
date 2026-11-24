import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* İlk açılış tercihleri: dil seçildi mi, ilgi alanları, girişten sonra hangi ekranla başlanacak */
export const INTERESTS: [string, string, string][] = [
  ['kultur', '🏛', 'Tarih ve kültür'], ['doga', '🌲', 'Doğa'], ['deniz', '🌊', 'Deniz ve kıyı'],
  ['sehir', '🏘', 'Şehir ve kasaba'], ['manzara', '🌄', 'Manzara'], ['foto', '📷', 'Fotoğraf çekmek'],
];
export type Start = 'photos' | 'foryou' | null;

/* "Senin için" listesine girecek kategori grupları. Fotoğraf sevenlere manzara noktaları da önerilir. */
export function forYouGroups(interests: string[]): Set<string> {
  const g = new Set(interests.filter((k) => k !== 'foto'));
  if (interests.includes('foto')) g.add('manzara');
  return g;
}

type Prefs = {
  ready: boolean; onboarded: boolean; interests: string[]; start: Start;
  finish: (interests: string[]) => void; setInterests: (interests: string[]) => void; clearStart: () => void;
};
const PrefsCtx = createContext<Prefs | null>(null);
export const usePrefs = () => useContext(PrefsCtx) as Prefs;

const startFor = (xs: string[]): Start => (xs.includes('foto') ? 'photos' : xs.length ? 'foryou' : null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [interests, setInt] = useState<string[]>([]);
  const [start, setStart] = useState<Start>(null);

  useEffect(() => {
    AsyncStorage.multiGet(['gezi-onboarded', 'gezi-interests', 'gezi-start']).then((rows) => {
      const m = Object.fromEntries(rows);
      setOnboarded(m['gezi-onboarded'] === '1');
      try { const xs = JSON.parse(m['gezi-interests'] || '[]'); if (Array.isArray(xs)) setInt(xs.filter((x) => typeof x === 'string')); } catch { /* bozuk kayıt */ }
      const s = m['gezi-start']; if (s === 'photos' || s === 'foryou') setStart(s);
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const setInterests = useCallback((xs: string[]) => {
    setInt(xs); AsyncStorage.setItem('gezi-interests', JSON.stringify(xs)).catch(() => {});
  }, []);
  const finish = useCallback((xs: string[]) => {
    const s = startFor(xs);
    setInterests(xs); setOnboarded(true); setStart(s);
    AsyncStorage.multiSet([['gezi-onboarded', '1'], ['gezi-start', s || '']]).catch(() => {});
  }, [setInterests]);
  const clearStart = useCallback(() => { setStart(null); AsyncStorage.removeItem('gezi-start').catch(() => {}); }, []);

  const value = useMemo(() => ({ ready, onboarded, interests, start, finish, setInterests, clearStart }), [ready, onboarded, interests, start, finish, setInterests, clearStart]);
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}
