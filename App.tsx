import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LangProvider, useT } from './src/i18n';
import { AuthProvider, trError, useAuth } from './src/lib/auth';
import { StoreProvider, useStore } from './src/lib/store';
import { UIProvider, useNav, useNavState, useToast, type Route, type Tab } from './src/lib/ui';
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
import ThemeScreen from './src/screens/ThemeScreen';
import PaintScreen from './src/screens/PaintScreen';
import InboxScreen from './src/screens/InboxScreen';
import JournalScreen, { JournalsScreen } from './src/screens/JournalScreen';
import { PhrasesScreen, RoutesScreen } from './src/components/Extras2';
import { FestivalScreen, HelpScreen, PlanScreen } from './src/components/Extras3';
import { TripProvider } from './src/lib/trip';
import { EmergencyScreen, FxScreen, PricesScreen } from './src/components/Extras4';
import { BlueFlagScreen, CollectionScreen, CollectionsScreen, PackingScreen, QuizScreen, SharedTripScreen, SharedTripsScreen, TrailScreen, TrailsScreen, TravelerScreen, YearScreen, joinShared } from './src/components/Extras5';
import { decodeRoute } from './src/lib/stops';
import { checkForUpdate, install, later as updLater, openInBrowser, useAutoUpdateCheck, useUpdate, VERSION } from './src/lib/update';
import { BADGES, earned } from './src/data/badges';
import { Btn } from './src/components/common';
import { PageLoader, Splash, StackHost, TabIndicator, TabLayer } from './src/components/Anim';
import { C, isDark } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { installCrashHandler, track } from './src/lib/telemetry';
import { useInboxPoll } from './src/lib/inbox';
import { parseLink } from './src/lib/share';
import { usePush } from './src/lib/push';

installCrashHandler();

// sekme değişince ya da üst bileşen yeniden çizilince bu ekranlar boşuna yeniden çizilmesin
const MapM = React.memo(MapScreen), ExploreM = React.memo(ExploreScreen), ShowcaseM = React.memo(ShowcaseScreen), PlanM = React.memo(PlanScreen);

const TABS: [Tab, string, string][] = [['map', '🗺', 'Harita'], ['explore', '🧭', 'Keşfet'], ['plan', '📋', 'Planla'], ['photos', '📷', 'Vitrin']];

const ScreenM = React.memo(function Screen({ r }: { r: Route }) {
  switch (r.name) {
    case 'place': return <PlaceScreen id={r.id} initialTab={r.tab} />;
    case 'compose': return <ComposeScreen id={r.id} />;
    case 'suggest': return <SuggestScreen />;
    case 'pending': return <PendingScreen />;
    case 'photo': return <PhotoScreen id={r.id} />;
    case 'lang': return <LangScreen />;
    case 'support': return <SupportScreen />;
    case 'route': return <RouteScreen id={r.id} ids={r.ids} stops={r.stops} mode={r.mode} avoid={r.avoid} />;
    case 'nav': return <NavScreen stops={r.stops} mode={r.mode} avoid={r.avoid} />;
    case 'trip': return <TripScreen shared={r.shared} />;
    case 'recommend': return <RecommendScreen />;
    case 'city': return <CityScreen il={r.il} subs={r.subs} />;
    case 'feedback': return <FeedbackScreen />;
    case 'mod': return <ModScreen />;
    case 'privacy': return <PrivacyScreen />;
    case 'theme': return <ThemeScreen />;
    case 'paint': return <PaintScreen />;
    case 'inbox': return <InboxScreen />;
    case 'journals': return <JournalsScreen />;
    case 'routes': return <RoutesScreen />;
    case 'phrases': return <PhrasesScreen />;
    case 'festivals': return <FestivalScreen />;
    case 'help': return <HelpScreen />;
    case 'emergency': return <EmergencyScreen />;
    case 'traveler': return <TravelerScreen id={r.id} />;
    case 'sharedTrips': return <SharedTripsScreen />;
    case 'sharedTrip': return <SharedTripScreen id={r.id} />;
    case 'year': return <YearScreen />;
    case 'collections': return <CollectionsScreen />;
    case 'collection': return <CollectionScreen id={r.id} />;
    case 'quiz': return <QuizScreen />;
    case 'trails': return <TrailsScreen />;
    case 'trail': return <TrailScreen id={r.id} />;
    case 'blueflag': return <BlueFlagScreen />;
    case 'packing': return <PackingScreen />;
    case 'fx': return <FxScreen />;
    case 'prices': return <PricesScreen />;
    case 'journal': return <JournalScreen id={r.id} />;
    case 'profile': return <ProfileScreen />;
    case 'interests': return <InterestsScreen />;
  }
  return null;
});

function Shell() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { setTab, reset } = useNav();
  const { tab, stack } = useNavState();
  const { start, clearStart } = usePrefs();
  // sekme değişiminin yönü: sağdaki sekmeye geçiş +1, soldakine −1
  const order = TABS.findIndex(([k]) => k === tab);
  const prevOrder = useRef(order);
  const dir = order === prevOrder.current ? 1 : Math.sign(order - prevOrder.current);
  useEffect(() => { prevOrder.current = order; }, [order]);
  // anonim kullanım sayıları: hangi sekme/ekran açıldı
  useEffect(() => { track(`tab:${tab}`); }, [tab]);
  const top = stack.length ? stack[stack.length - 1].name : '';
  useEffect(() => { if (top) track(`screen:${top}`); }, [top, stack.length]);
  // ilk açılışta seçilen ilgi alanına göre başla: fotoğraf → vitrin, diğerleri → Keşfet "Senin için"
  useEffect(() => {
    if (start === 'photos') { setTab('photos'); clearStart(); }
    else if (start === 'foryou') setTab('explore');
  }, [start, setTab, clearStart]);
  useBadgeToasts();
  useInboxPoll(true);
  useDeepLinks();
  usePushOpen();
  useAutoUpdateCheck();
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <View style={{ flex: 1 }}>
        {/* harita her zaman yerinde durur; diğer sekmeler üstüne açılır */}
        <ErrorBoundary label="map" t={t}><MapM /></ErrorBoundary>
        <TabLayer visible={tab === 'explore'} dir={dir}><ErrorBoundary label="explore" t={t}><ExploreM /></ErrorBoundary></TabLayer>
        <TabLayer visible={tab === 'plan'} dir={dir}><ErrorBoundary label="plan" t={t}><PlanM /></ErrorBoundary></TabLayer>
        <TabLayer visible={tab === 'photos'} dir={dir}><ErrorBoundary label="photos" t={t}><ShowcaseM /></ErrorBoundary></TabLayer>
      </View>
      <View style={[s.tabs, { paddingBottom: insets.bottom + 6 }]} accessibilityRole="tablist">
        <TabIndicator index={Math.max(0, order)} count={TABS.length} color={C.accent} />
        {TABS.map(([k, icon, label]) => (
          <Pressable key={k} onPress={() => { reset(); setTab(k); }} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }} accessibilityLabel={t(label)}>
            <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.55 }}>{icon}</Text>
            <Text style={[s.tabTxt, tab === k && { color: C.accent }]} numberOfLines={1}>{t(label)}</Text>
          </Pressable>
        ))}
      </View>
      <StackHost stack={stack} render={(r) => <ErrorBoundary label={r.name} t={t}><ScreenM r={r} /></ErrorBoundary>} />
      <PageLoader signal={`${tab}|${stack.length}|${stack.length ? JSON.stringify(stack[stack.length - 1]) : ''}`} />
      <UpdateModal />
    </View>
  );
}

/* güncelleme penceresi: hazır → indiriliyor (%) → yükleyici; hata olursa tarayıcıdan indir */
function UpdateModal() {
  const { t } = useT();
  const u = useUpdate();
  const busy = u.phase === 'checking' || u.phase === 'down';
  let icon = '🎉', title = t('Yeni sürüm hazır'), body = t('Yeni özellikler ve düzeltmeler içeren {1} indirilmeye hazır. İndirip kurman yeterli; hesabın ve kayıtların korunur.', u.tag);
  if (u.phase === 'checking') { icon = '🔎'; title = t('Güncellemeler denetleniyor'); body = ''; }
  else if (u.phase === 'none') { icon = '✅'; title = t('Uygulaman güncel'); body = t('Sürüm {1}', VERSION); }
  else if (u.phase === 'down') { icon = '⬇️'; title = t('İndiriliyor'); body = t('Uygulamayı kullanmaya devam edebilirsin; indirme bitince kurulum açılır.'); }
  else if (u.phase === 'install') { icon = '📲'; title = t('Kuruluma hazır'); body = t('Açılan ekranda "Yükle"ye dokun. Telefon izin isterse "Bu kaynağa izin ver"i açıp geri dön.'); }
  else if (u.phase === 'error') { icon = '⚠️'; title = t('Güncelleme indirilemedi'); body = t('İnternet bağlantını kontrol edip tekrar dene ya da tarayıcıdan indir.'); }
  return (
    <Modal visible={u.show} transparent animationType="fade" onRequestClose={updLater}>
      <View style={s.dim}>
        <View style={s.card}>
          <Text style={{ fontSize: 34 }}>{icon}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink, marginTop: 6, textAlign: 'center' }}>{title}</Text>
          {!!body && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: 'center' }}>{body}</Text>}
          {u.phase === 'down' && (
            <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' }}>
                <View style={{ width: `${u.pct}%`, height: 10, backgroundColor: C.accent }} />
              </View>
              <Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', fontWeight: '700' }}>%{u.pct}</Text>
            </View>
          )}
          {u.phase === 'checking' && <ActivityIndicator style={{ marginTop: 14 }} color={C.accent} />}
          {u.phase === 'ready' && <Btn kind="pri" label={`⬇ ${t('Güncelle')}`} onPress={install} style={{ alignSelf: 'stretch', marginTop: 16 }} />}
          {u.phase === 'install' && <Btn kind="pri" label={`📲 ${t('Kurulumu aç')}`} onPress={install} style={{ alignSelf: 'stretch', marginTop: 16 }} />}
          {u.phase === 'error' && <Btn kind="pri" label={t('Tekrar dene')} onPress={u.run ? install : checkForUpdate} style={{ alignSelf: 'stretch', marginTop: 16 }} />}
          {u.phase === 'error' && <Btn kind="ghost" label={t('Tarayıcıda indir')} onPress={() => { updLater(); openInBrowser(); }} style={{ alignSelf: 'stretch', marginTop: 4 }} />}
          {!busy || u.phase === 'down' ? <Btn kind="ghost" label={u.phase === 'none' ? t('Tamam') : u.phase === 'down' ? t('Arka planda devam et') : t('Sonra')} onPress={updLater} style={{ alignSelf: 'stretch', marginTop: 4 }} /> : null}
        </View>
      </View>
    </Modal>
  );
}

/* telefona gelen bildirim: dokununca ilgili yeri aç (yorum/fotoğraf sekmesiyle) */
function usePushOpen() {
  const { lang } = useT();
  const { push } = useNav();
  const { byId, loading } = useStore();
  usePush(lang, (id, kind) => {
    if (!byId(id)) return;
    track('act:open_push');
    push({ name: 'place', id, tab: kind === 'photo_like' ? 'pho' : kind === 'approved' ? 'ov' : 'rev' });
  }, !loading);
}

/* site bağlantıları uygulamada açılır: ?yer=… yer kartı, ?gezi=… paylaşılan gezi listesi */
function useDeepLinks() {
  const { push } = useNav();
  const toast = useToast();
  const { byId, loading } = useStore();
  const pending = useRef<string | null>(null);
  const handle = (url: string | null) => {
    if (!url) return;
    const l = parseLink(url); if (!l) return;
    track('act:open_link');
    if (l.ortak) { const o = l.ortak; joinShared(o.id, o.k).then((r) => { toast(r.already ? 'Bu listeye zaten katıldın' : '{1} listesine katıldın', r.title); push({ name: 'sharedTrip', id: o.id }); }, (e) => toast(trError(e))); }
    else if (l.rota) { const d = decodeRoute(l.rota.r, l.rota.m, l.rota.k, byId); if (d.stops.length) push({ name: 'route', stops: d.stops, mode: d.mode, avoid: d.avoid }); }
    else if (l.gunluk) push({ name: 'journal', id: l.gunluk });
    else if (l.gezi && l.gezi.length) push({ name: 'trip', shared: l.gezi.filter((id) => !!byId(id)) });
    else if (l.yer && byId(l.yer)) push({ name: 'place', id: l.yer });
  };
  useEffect(() => {
    Linking.getInitialURL().then((u: string | null) => { pending.current = u; }).catch(() => {});
    const sub = Linking.addEventListener('url', (e: { url: string }) => handle(e.url));
    return () => sub.remove();
  }, []); // eslint-disable-line
  // yerler yüklendikten sonra ilk açılış bağlantısını işle
  useEffect(() => { if (!loading && pending.current) { const u = pending.current; pending.current = null; handle(u); } }, [loading]); // eslint-disable-line
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
            <StatusBar style={isDark ? 'light' : 'dark'} />
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
  dim: { flex: 1, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.surface, borderRadius: 22, padding: 22, alignItems: 'center', alignSelf: 'stretch' },
});
