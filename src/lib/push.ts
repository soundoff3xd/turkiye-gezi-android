import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { refreshUnread } from './inbox';

/* Telefona anlık bildirim (Firebase Cloud Messaging).
   Cihazın FCM jetonu push_tokens tablosuna kaydedilir; sunucudaki "push" işlevi yeni bildirimleri bu jetona yollar.
   Firebase ayar dosyası olmadan derlenmişse jeton alınamaz; uygulama sessizce bildirimsiz çalışır. */

const ASKED = 'gezi-push-asked';
let myToken: string | null = null;

// uygulama açıkken gelen bildirim de üstte görünsün
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false } as any),
  });
} catch { /* modül yoksa */ }

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Türkiye Gezi Rehberi', importance: Notifications.AndroidImportance.DEFAULT, lightColor: '#B8321F',
  });
}

/* izin iste (yalnızca bir kez sorar) ve jetonu kaydet */
export async function registerPush(lang: string, ask = true) {
  try {
    await ensureChannel();
    let st = await Notifications.getPermissionsAsync();
    if (!st.granted) {
      const asked = await AsyncStorage.getItem(ASKED);
      if (!ask || asked) return false;
      await AsyncStorage.setItem(ASKED, '1');
      st = await Notifications.requestPermissionsAsync();
      if (!st.granted) return false;
    }
    const t = await Notifications.getDevicePushTokenAsync();
    const token = typeof t?.data === 'string' ? t.data : null;
    if (!token) return false;
    myToken = token;
    const { error } = await supabase.rpc('register_push', { p_token: token, p_platform: Platform.OS, p_lang: lang });
    return !error;
  } catch { return false; }
}

/* çıkış yaparken bu cihazın jetonunu sil (başka hesaba bildirim gitmesin) */
export async function unregisterPush() {
  try { if (myToken) await supabase.from('push_tokens').delete().eq('token', myToken); } catch { /* */ }
  myToken = null;
}

/* Shell içinde: girişte jeton kaydı, dil değişince güncelle, bildirime dokununca ilgili yeri aç */
export function usePush(lang: string, open: (placeId: string, kind: string) => void, ready: boolean) {
  const openRef = useRef(open); openRef.current = open;
  useEffect(() => {
    const t = setTimeout(() => { registerPush(lang).catch(() => {}); }, 2500);   // açılış ekranı bitince sor
    return () => clearTimeout(t);
  }, [lang]);
  useEffect(() => {
    let sub1: { remove(): void } | null = null, sub2: { remove(): void } | null = null;
    try {
      sub1 = Notifications.addNotificationResponseReceivedListener((r: any) => {
        const d = r?.notification?.request?.content?.data || {};
        if (d.place_id) openRef.current(String(d.place_id), String(d.kind || ''));
      });
      sub2 = Notifications.addNotificationReceivedListener(() => { refreshUnread().catch(() => {}); });
    } catch { /* */ }
    return () => { sub1?.remove(); sub2?.remove(); };
  }, []);
  // uygulama kapalıyken bildirime dokunup açıldıysa: yerler yüklenince o yere git
  useEffect(() => {
    if (!ready) return;
    Notifications.getLastNotificationResponseAsync().then((r: any) => {
      const d = r?.notification?.request?.content?.data || {};
      const id = r?.notification?.request?.identifier;
      if (!d.place_id || !id) return;
      AsyncStorage.getItem('gezi-push-last').then((last: string | null) => {
        if (last === id) return;   // aynı bildirimi iki kez açma
        AsyncStorage.setItem('gezi-push-last', id).catch(() => {});
        openRef.current(String(d.place_id), String(d.kind || ''));
      }).catch(() => {});
    }).catch(() => {});
  }, [ready]);
}
