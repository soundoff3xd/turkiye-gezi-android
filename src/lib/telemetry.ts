import { AppState } from 'react-native';
import { supabase } from './supabase';
import { VERSION } from './update';

/* Anonim kullanım sayıları: hangi ekran/özellik kaç kez kullanıldı. Kim olduğu gönderilmez;
   sayılar bellekte toplanır, dakikada bir ve uygulama arka plana geçince tek seferde gönderilir. */
const counts: Record<string, number> = {};
let timer: ReturnType<typeof setTimeout> | null = null;
export function track(name: string) {
  const k = name.toLowerCase().replace(/[^a-z0-9_:.-]/g, '_').slice(0, 40);
  if (!k) return;
  counts[k] = (counts[k] || 0) + 1;
  if (!timer) timer = setTimeout(flush, 60000);
}
export function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  const ev: Record<string, number> = {};
  for (const k of Object.keys(counts).slice(0, 40)) { ev[k] = counts[k]; delete counts[k]; }
  if (!Object.keys(ev).length) return;
  supabase.rpc('track', { p_platform: 'android', p_events: ev }).then(() => {}, () => {});
}
AppState.addEventListener('change', (s) => { if (s !== 'active') flush(); });

/* Hata raporu: uygulama çökerse ya da beklenmedik bir hata olursa moderatör paneline düşer */
let last = '';
export function logCrash(err: unknown, context = '') {
  const e = err as { message?: string; stack?: string };
  const message = String(e?.message || err || 'unknown').slice(0, 500);
  if (message === last) return; last = message;
  supabase.rpc('log_crash', { p_platform: 'android', p_version: VERSION, p_message: message, p_stack: String(e?.stack || '').slice(0, 4000), p_context: context.slice(0, 200) }).then(() => {}, () => {});
}
export function installCrashHandler() {
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => { logCrash(e, fatal ? 'fatal' : 'error'); flush(); prev(e, fatal); });
}
