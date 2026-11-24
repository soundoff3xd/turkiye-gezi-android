import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { C, R } from '../theme';

/* Basit gezinme: alt sekmeler + üstte açılan ekran yığını (Android geri tuşu yığını kapatır) */
export type Tab = 'map' | 'explore' | 'photos' | 'profile';
export type Route =
  | { name: 'place'; id: string; tab?: 'ov' | 'rev' | 'pho' }
  | { name: 'compose'; id: string }
  | { name: 'suggest' }
  | { name: 'pending' }
  | { name: 'photo'; id: string }
  | { name: 'lang' }
  | { name: 'support' }
  | { name: 'route'; id: string };
export type MapFocus = { id?: string; lat?: number; lng?: number; ts: number } | null;

type Nav = {
  tab: Tab; setTab: (t: Tab) => void;
  stack: Route[]; push: (r: Route) => void; pop: () => void; reset: () => void;
  focus: MapFocus; showOnMap: (f: { id?: string; lat?: number; lng?: number }) => void;
};
const NavCtx = createContext<Nav | null>(null);
export const useNav = () => useContext(NavCtx) as Nav;

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

  return (
    <NavCtx.Provider value={{ tab, setTab, stack, push, pop, reset, focus, showOnMap }}>
      <ToastCtx.Provider value={toast}>
        {children}
        {msg && (
          <View style={[s.toast, { bottom: insets.bottom + 96 }]} pointerEvents="none" accessibilityLiveRegion="polite">
            <Text style={s.txt}>{msg}</Text>
          </View>
        )}
      </ToastCtx.Provider>
    </NavCtx.Provider>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 18, paddingVertical: 12, zIndex: 100, elevation: 20 },
  txt: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '600', textAlign: 'center' },
});
