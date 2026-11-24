import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LangProvider, useT } from './src/i18n';
import { AuthProvider, useAuth } from './src/lib/auth';
import { StoreProvider } from './src/lib/store';
import { UIProvider, useNav, type Route, type Tab } from './src/lib/ui';
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
    case 'route': return <RouteScreen id={r.id} />;
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
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {/* harita her zaman yerinde durur; diğer sekmeler üstüne açılır */}
        <MapScreen />
        {tab === 'explore' && <View style={StyleSheet.absoluteFill}><ExploreScreen /></View>}
        {tab === 'photos' && <View style={StyleSheet.absoluteFill}><ShowcaseScreen /></View>}
      </View>
      <View style={[s.tabs, { paddingBottom: insets.bottom + 6 }]} accessibilityRole="tablist">
        {TABS.map(([k, icon, label]) => (
          <Pressable key={k} onPress={() => { reset(); setTab(k); }} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} accessibilityLabel={t(label)}>
            <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.55 }}>{icon}</Text>
            <Text style={[s.tabTxt, tab === k && { color: C.accent }]} numberOfLines={1}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>
      {stack.map((r, i) => (
        <View key={i} style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]}><Screen r={r} /></View>
      ))}
    </View>
  );
}

function Root() {
  const { ready, me } = useAuth();
  const prefs = usePrefs();
  if (!ready || !prefs.ready) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator size="large" color={C.accent} /></View>;
  }
  // ilk açılış: dil ve ilgi alanları
  if (!prefs.onboarded) return <OnboardingScreen />;
  // Hesap olmadan uygulama kullanılamaz
  if (!me) return <AuthScreen />;
  return (
    <StoreProvider>
      <LocationProvider>
        <UIProvider>
          <Shell />
        </UIProvider>
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
});
