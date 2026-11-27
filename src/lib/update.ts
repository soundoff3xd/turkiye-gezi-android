import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import build from '../build.json';

/* Güncelleme: GitHub'daki son sürümü bu derlemeyle karşılaştırır; GitHub sürümünde APK'yı
   uygulamanın içinde indirip Android yükleyicisini açar. Play sürümünde (build.json store=play)
   indirme yoktur, Play Store sayfası açılır (Play politikası kendi kendini güncellemeye izin vermez).
   build.json derleme sırasında GitHub Actions tarafından yazılır (yerelde run 0 olur, kontrol yapılmaz). */
const B = build as { run: number; store?: string };
export const BUILD_RUN: number = B.run || 0;
export const IS_PLAY = B.store === 'play';
export const VERSION = BUILD_RUN ? `v0.1.${BUILD_RUN}` : 'dev';
export const APK_URL = 'https://github.com/soundoff3xd/turkiye-gezi-android/releases/latest/download/turkiye-gezi-rehberi.apk';
const PKG = 'com.turkiyegezirehberi.app';
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PKG}`;
const API = 'https://api.github.com/repos/soundoff3xd/turkiye-gezi-android/releases/latest';

export type UpPhase = 'idle' | 'checking' | 'none' | 'ready' | 'down' | 'install' | 'error';
type St = { phase: UpPhase; tag: string; run: number; pct: number; open: boolean; manual: boolean };
let st: St = { phase: 'idle', tag: '', run: 0, pct: 0, open: false, manual: false };
const subs = new Set<(s: St) => void>();
const set = (p: Partial<St>) => { st = { ...st, ...p }; subs.forEach((f) => f(st)); };

async function fetchLatest(): Promise<{ run: number; tag: string } | null> {
  const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) return null;
  const j = await r.json();
  const m = /v\d+\.\d+\.(\d+)/.exec(j?.tag_name || '');
  return m ? { run: +m[1], tag: j.tag_name } : null;
}

/** Açılışta sessiz kontrol (kullanıcı "Sonra" dediği sürümü tekrar göstermez). */
async function autoCheck() {
  if (!BUILD_RUN || IS_PLAY) return;
  try {
    const later = +((await AsyncStorage.getItem('gezi-update-later')) || 0);
    const l = await fetchLatest();
    if (l && l.run > BUILD_RUN && l.run !== later && st.phase === 'idle') set({ phase: 'ready', tag: l.tag, run: l.run, open: true, manual: false });
  } catch { /* çevrimdışı: sessiz geç */ }
}

/** Hesap menüsündeki "Güncellemeleri denetle". */
export async function checkForUpdate() {
  if (IS_PLAY) { openStore(); return; }
  if (st.phase === 'down' || st.phase === 'install') { set({ open: true }); return; }
  set({ phase: 'checking', open: true, manual: true });
  try {
    const l = await fetchLatest();
    if (!l) throw new Error('no release');
    if (BUILD_RUN && l.run <= BUILD_RUN) set({ phase: 'none', tag: l.tag, run: l.run });
    else set({ phase: 'ready', tag: l.tag, run: l.run });
  } catch { set({ phase: 'error' }); }
}

export function openStore() {
  Linking.openURL(`market://details?id=${PKG}`).catch(() => Linking.openURL(PLAY_URL).catch(() => {}));
}
export function openInBrowser() { Linking.openURL(APK_URL).catch(() => {}); }

export function later() {
  if (st.run) AsyncStorage.setItem('gezi-update-later', String(st.run)).catch(() => {});
  if (st.phase === 'down') { set({ open: false }); return; } // indirme arka planda sürsün
  set({ open: false, phase: st.phase === 'install' ? 'ready' : 'idle' });
}

/** APK'yı indir, Android yükleyicisini aç. Bir şey ters giderse tarayıcıdan indirmeye düş. */
export async function install() {
  if (IS_PLAY) { openStore(); return; }
  const dir = FileSystem.cacheDirectory;
  if (!dir) { openInBrowser(); return; }
  const file = `${dir}gezi-update-${st.run || 'latest'}.apk`;
  set({ phase: 'down', pct: 0, open: true });
  try {
    await FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
    const dl = FileSystem.createDownloadResumable(APK_URL, file, {}, (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
      if (p.totalBytesExpectedToWrite > 0) set({ pct: Math.min(99, Math.round((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100)) });
    });
    const res = await dl.downloadAsync();
    if (!res || (res.status && res.status >= 400)) throw new Error('download ' + (res && res.status));
    set({ pct: 100, phase: 'install' });
    const uri = await FileSystem.getContentUriAsync(res.uri || file);
    // 1 = FLAG_GRANT_READ_URI_PERMISSION: yükleyici dosyayı okuyabilsin
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: 'application/vnd.android.package-archive' });
  } catch {
    set({ phase: 'error' });
  }
}

export function useUpdate() {
  const [s, setS] = useState<St>(st);
  useEffect(() => {
    subs.add(setS);
    return () => { subs.delete(setS); };
  }, []);
  return { ...s, show: s.open };
}

/* uygulama açılırken bir kez */
let started = false;
export function useAutoUpdateCheck() {
  useEffect(() => { if (!started) { started = true; autoCheck(); } }, []);
}
