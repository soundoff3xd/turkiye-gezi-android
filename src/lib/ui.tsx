import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { C, R } from '../theme';
import type { Stop } from './stops';

/* Basit gezinme: alt sekmeler + üstte açılan ekran yığını (Android geri tuşu yığını kapatır) */
export type Tab = 'map' | 'explore' | 'plan' | 'photos';
export type Route =
  | { name: 'place'; id: string; tab?: 'ov' | 'rev' | 'pho' | 'qa' }
  | { name: 'compose'; id: string }
  | { name: 'suggest' }
  | { name: 'pending' }
  | { name: 'photo'; id: string }
  | { name: 'lang' }
  | { name: 'support' }
  | { name: 'route'; id?: string; ids?: string[]; stops?: Stop[]; mode?: string; avoid?: string[] }
  | { name: 'nav'; stops: Stop[]; mode: string; avoid?: string[] }
  | { name: 'profile' }
  | { name: 'interests' }
  | { name: 'trip'; shared?: string[] }
  | { name: 'recommend' }
  | { name: 'city'; il: string; subs: string[] }
  | { name: 'feedback' }
  | { name: 'mod' }
  | { name: 'privacy' }
  | { name: 'theme' }
  | { name: 'paint' }
  | { name: 'inbox' }
  | { name: 'journals' }
  | { name: 'routes' }
  | { name: 'phrases' }
  | { name: 'festivals' }
  | { name: 'help' }
  | { name: 'journal'; id: string };
export type MapFocus = { id?: string; lat?: number; lng?: number; ts: number } | null;

/* Gezinme iki parça: eylemler (hiç değişmez) ve durum (sekme, yığın, harita odağı).
   Ekranların çoğu yalnızca eylemleri kullanır; böylece sekme değişince ya da bildirim çıkınca hepsi yeniden çizilmez. */
type NavActions = {
  setTab: (t: Tab) => void; push: (r: Route) => void; pop: () => void; reset: () => void;
  showOnMap: (f: { id?: string; lat?: number; lng?: number }) => void;
};
type NavState = { tab: Tab; stack: Route[]; focus: MapFocus };
const NavCtx = createContext<NavActions | null>(null);
const NavStateCtx = createContext<NavState>({ tab: 'map', stack: [], focus: null });
export const useNav = () => useContext(NavCtx) as NavActions;
export const useNavState = () => useContext(NavStateCtx);

type Toast = (msg: string, ...args: (string | number)[]) => void;
const ToastCtx = createContext<Toast>(() => {});
export const useToast = () => useContext(ToastCtx);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('map');
  const [stack, setStack] = useState<Route[]>([]);
  const [focus, setFocus] = useState<MapFocus>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((r: Route) => setStack((s) => [...s, r]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const reset = useCallback(() => setStack([]), []);
  const showOnMap = useCallback((f: { id?: string; lat?: number; lng?: number }) => {
    setStack([]); setTab('map'); setFocus({ ...f, ts: Date.now() });
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length) { pop(); return true; }
      if (tab !== 'map') { setTab('map'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, tab, pop]);

  const toast = useCallback<Toast>((m, ...args) => {
    setMsg(t(m, ...args));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, [t]);

  const actions = useMemo<NavActions>(() => ({ setTab, push, pop, reset, showOnMap }), [push, pop, reset, showOnMap]);
  const navState = useMemo<NavState>(() => ({ tab, stack, focus }), [tab, stack, focus]);
  return (
    <NavCtx.Provider value={actions}>
      <NavStateCtx.Provider value={navState}>
      <ToastCtx.Provider value={toast}>
        {children}
        {msg && (
          <View style={[s.toast, { bottom: insets.bottom + 96 }]} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={s.txt}>{msg}</Text>
          </View>
        )}
      </ToastCtx.Provider>
      </NavStateCtx.Provider>
    </NavCtx.Provider>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', backgroundColor: C.solid, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 12, zIndex: 100, elevation: 20 },
  txt: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
});
