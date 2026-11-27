import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';

/* Uygulama içi bildirimler (yanıt, beğeni, onaylanan öneri). Okunmamış sayısı bütün ekranlarda paylaşılır. */
export type Note = { id: string; kind: 'reply' | 'like' | 'photo_like' | 'approved' | 'answer' | 'follow' | 'trip_join'; actor: string | null; actorName: string; review_id: string | null; place_id: string | null; read: boolean; created_at: string };
let unread = 0;
const subs = new Set<(n: number) => void>();
const emit = (n: number) => { unread = n; subs.forEach((f) => f(n)); };

export async function refreshUnread() {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
  if (!error && typeof count === 'number') emit(count);
}
export async function loadNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notifications').select('id,kind,actor,review_id,place_id,read,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  const rows = (data as any[]) || [];
  const ids = [...new Set(rows.map((r) => r.actor).filter(Boolean))];
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: ps } = await supabase.from('profiles').select('id,name').in('id', ids);
    names = Object.fromEntries(((ps as any[]) || []).map((p) => [p.id, p.name]));
  }
  return rows.map((r) => ({ ...r, actorName: (r.actor && names[r.actor]) || '?' }));
}
export async function markAllRead() {
  emit(0);
  await supabase.rpc('mark_notifications_read');
}
export function useUnread() {
  const [n, setN] = useState(unread);
  useEffect(() => { subs.add(setN); return () => { subs.delete(setN); }; }, []);
  return n;
}
/* Shell içinde bir kez: açılışta, uygulamaya her dönüşte ve 90 saniyede bir kontrol et */
export function useInboxPoll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    refreshUnread().catch(() => {});
    const iv = setInterval(() => { if (AppState.currentState === 'active') refreshUnread().catch(() => {}); }, 90000);
    const sub = AppState.addEventListener('change', (st: string) => { if (st === 'active') refreshUnread().catch(() => {}); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [enabled]);
}
