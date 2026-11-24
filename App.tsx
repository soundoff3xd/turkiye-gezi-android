import React, { useEffect, useRef } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LangProvider, useT } from './src/i18n';
import { AuthProvider, useAuth } from './src/lib/auth';
import { StoreProvider, useStore } from './src/lib/store';
import { UIProvider, useNav, useToast, type Route, type Tab } from './src/lib/ui';
import AuthScreen from './src/screens/AuthScreen';
import MapScreen from './src/screens/MapScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import ShowcaseScreen from './src/screens/ShowcaseScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen, { InterestsScreen } from './src/screens/OnboardingScreen';
import { PrefsProvider, usePrefs } from './src/lib/prefs';
import PlaceScreen from './src/screens/PlaceScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import SuggestScreen from './src/screens/SuggestScreen';
import PendingScreen from './src/screens/PendingScreen';
import PhotoScreen from './src/screens/PhotoScreen';
import LangScreen from './src/screens/LangScreen';
import SupportScreen from './src/screens/SupportScreen';
import RouteScreen from './src/screens/RouteScreen';
import { LocationProvider } from './src/lib/location';
import NavScreen from './src/screens/NavScreen';
import TripScreen from './src/screens/TripScreen';
import RecommendScreen, { CityScreen } from './src/screens/RecommendScreen';
import FeedbackScreen, { ModScreen } from './src/screens/FeedbackScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import { TripProvider } from './src/lib/trip';
import { APK_URL, useUpdate } from './src/lib/update';
import { BADGES, earned } from './src/data/badges';
import { Btn } from './src/components/common';
import { Splash, StackHost, TabLayer } from './src/components/Anim';
import { C } from './src/theme';

const TABS: [Tab, string, string][] = [['map', '🗺', 'Harita'], ['explore', '🧭', 'Keşfet'], ['photos', '📷', 'Vitrin']];

function Screen({ r }: { r: Route }) {
  switch (r.name) {
    case 'place': return <PlaceScreen id={r.id} initialTab={r.tab} />;
    case 'compose': return <ComposeScreen id={r.id} />;
    case 'suggest': return <SuggestScreen />;
    case 'pending': return <PendingScreen />;
    case 'photo': return <PhotoScreen id={r.id} />;
    case 'lang': return <LangScreen />;
    case 'support': return <SupportScreen />;
    case 'route': return <RouteScreen id={r.id} ids={r.ids} />;
    case 'nav': return <NavScreen ids={r.ids} mode={r.mode} />;
    case 'trip': return <TripScreen />;
    case 'recommend': return <RecommendScreen />;
    case 'city': return <CityScreen il={r.il} subs={r.subs} />;
    case 'feedback': return <FeedbackScreen />;
    case 'mod': return <ModScreen />;
    case 'privacy': return <PrivacyScreen />;
    case 'profile': return <ProfileScreen />;
    case 'interests': return <InterestsScreen />;
  }
}

function Shell() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { tab, setTab, stack, reset } = useNav();
  const { start, clearStart } = usePrefs();
  // ilk açılışta seçilen ilgi alanına göre başla: fotoğraf → vitrin, diğerleri → Keşfet "Senin için"
  useEffect(() => {
    if (start === 'photos') { setTab('photos'); clearStart(); }
    else if (start === 'foryou') setTab('explore');
  }, [start, setTab, clearStart]);
  useBadgeToasts();
  const up = useUpdate();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {/* harita her zaman yerinde durur; diğer sekmeler üstüne açılır */}
        <MapScreen />
        <TabLayer visible={tab === 'explore'}><ExploreScreen /></TabLayer>
        <TabLayer visible={tab === 'photos'}><ShowcaseScreen /></TabLayer>
      </View>
      <View style={[s.tabs, { paddingBottom: insets.bottom + 6 }]} accessibilityRole="tablist">
        {TABS.map(([k, icon, label]) => (
          <Pressable key={k} onPress={() => { reset(); setTab(k); }} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} accessibilityLabel={t(label)}>
            <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.55 }}>{icon}</Text>
            <Text style={[s.tabTxt, tab === k && { color: C.accent }]} numberOfLines={1}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>
      <StackHost stack={stack} render={(r) => <Screen r={r} />} />
      <Modal visible={up.show} transparent animationType="fade" onRequestClose={up.later}>
        <View style={s.dim}>
          <View style={s.card}>
            <Text style={{ fontSize: 34 }}>🎉</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink, marginTop: 6 }}>{t('Yeni sürüm hazır')}</Text>
            <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: 'center' }}>{t('Yeni özellikler ve düzeltmeler içeren {1} indirilmeye hazır. İndirip kurman yeterli; hesabın ve kayıtların korunur.', up.tag)}</Text>
            <Btn kind="pri" label={`⬇ ${t('Şimdi indir')}`} onPress={() => { up.later(); Linking.openURL(APK_URL); }} style={{ alignSelf: 'stretch', marginTop: 16 }} />
            <Btn kind="ghost" label={t('Sonra')} onPress={up.later} style={{ alignSelf: 'stretch', marginTop: 4 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* yeni rozet kazanınca haber ver (ilk yüklemede sessizce kaydeder) */
function useBadgeToasts() {
  const { me } = useAuth();
  const { visited, posts, byId, places, loading } = useStore();
  const toast = useToast();
  const { t } = useT();
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!me || loading) return;
    const mine = posts.filter((x) => x.uid === me.id);
    const now = earned({ visited: [...visited].map((id) => byId(id)).filter(Boolean) as any[], reviews: mine.length, photos: mine.filter((x) => x.photo).length, all: places });
    const key = `gezi-badges-${me.id}`;
    if (!known.current) {
      AsyncStorage.getItem(key).then((v) => {
        const prev = new Set<string>(v ? JSON.parse(v) : now);
        known.current = prev;
        const fresh = now.filter((x) => !prev.has(x));
        if (fresh.length) { const bd = BADGES.find((x) => x.id === fresh[0]); if (bd) toast('Yeni rozet kazandın: {1}', `${bd.icon} ${t(bd.name)}`); }
        known.current = new Set(now); AsyncStorage.setItem(key, JSON.stringify(now)).catch(() => {});
      }).catch(() => { known.current = new Set(now); });
      return;
    }
    const fresh = now.filter((x) => !known.current!.has(x));
    if (fresh.length) {
      const bd = BADGES.find((x) => x.id === fresh[0]);
      if (bd) toast('Yeni rozet kazandın: {1}', `${bd.icon} ${t(bd.name)}`);
      known.current = new Set(now); AsyncStorage.setItem(key, JSON.stringify(now)).catch(() => {});
    }
  }, [me, visited, posts, loading]); // eslint-disable-line
}

function Root() {
  const { t } = useT();
  const { ready, me } = useAuth();
  const prefs = usePrefs();
  if (!ready || !prefs.ready) {
    return <Splash label={t('Türkiye Gezi Rehberi')} />;
  }
  // ilk açılış: dil ve ilgi alanları
  if (!prefs.onboarded) return <OnboardingScreen />;
  // Hesap olmadan uygulama kullanılamaz
  if (!me) return <AuthScreen />;
  return (
    <StoreProvider>
      <LocationProvider>
        <TripProvider>
          <UIProvider>
            <Shell />
          </UIProvider>
        </TripProvider>
      </LocationProvider>
    </StoreProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <PrefsProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Root />
          </AuthProvider>
        </PrefsProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.chipLine, paddingTop: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  tabTxt: { fontSize: 12, fontWeight: '700', color: C.muted },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.surface, borderRadius: 22, padding: 22, alignItems: 'center', alignSelf: 'stretch' },
});
