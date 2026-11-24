import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import build from '../build.json';

/* "Yeni sürüm var" kontrolü: GitHub'daki son sürümün numarasını bu derlemeninkiyle karşılaştırır.
   build.json derleme sırasında GitHub Actions tarafından yazılır (yerelde 0 olur, kontrol yapılmaz). */
export const BUILD_RUN: number = (build as { run: number }).run || 0;
export const VERSION = BUILD_RUN ? `v0.1.${BUILD_RUN}` : 'dev';
export const APK_URL = 'https://github.com/soundoff3xd/turkiye-gezi-android/releases/latest/download/turkiye-gezi-rehberi.apk';
const API = 'https://api.github.com/repos/soundoff3xd/turkiye-gezi-android/releases/latest';

export function useUpdate() {
  const [latest, setLatest] = useState<{ run: number; tag: string } | null>(null);
  const [hidden, setHidden] = useState<number>(0);
  useEffect(() => {
    if (!BUILD_RUN) return;
    let live = true;
    AsyncStorage.getItem('gezi-update-later').then((v) => live && setHidden(+(v || 0))).catch(() => {});
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      const m = /v\d+\.\d+\.(\d+)/.exec(j?.tag_name || '');
      if (live && m) setLatest({ run: +m[1], tag: j.tag_name });
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const show = !!latest && latest.run > BUILD_RUN && latest.run !== hidden;
  const later = () => { if (latest) { setHidden(latest.run); AsyncStorage.setItem('gezi-update-later', String(latest.run)).catch(() => {}); } };
  return { show, tag: latest?.tag || '', later };
}
