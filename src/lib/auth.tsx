import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SITE_URL } from './supabase';
import { BAD_WORDS, fold } from '../data/catalog';

export type Me = { id: string; email: string; name: string; isMod: boolean };
type AuthState = {
  ready: boolean;
  me: Me | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'confirm' | 'done'>;
  signOut: () => Promise<void>;
};
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => useContext(Ctx) as AuthState;

/* Supabase'in İngilizce hata mesajlarını Türkçeye çevir */
const ERR: [RegExp, string][] = [
  [/invalid login credentials|invalid/i, 'E-posta veya şifre hatalı.'],
  [/email not confirmed|confirm/i, 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.'],
  [/rate limit|too many/i, 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.'],
  [/already registered|already exists/i, 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.'],
  [/network|fetch|timed? ?out/i, 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.'],
  [/password should be/i, 'Şifre en az 8 karakter olmalı.'],
];
export const trError = (e: unknown) => {
  const m = (e as { message?: string })?.message || String(e || '');
  const hit = ERR.find(([r]) => r.test(m));
  return hit ? hit[1] : 'Bir hata oluştu, lütfen tekrar dene.';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  async function load(session: Session | null) {
    if (!session?.user) { setMe(null); setReady(true); return; }
    const u = session.user;
    const { data: prof } = await supabase.from('profiles').select('name,is_moderator').eq('id', u.id).maybeSingle();
    if (!prof) {
      // hesap silinmiş ama telefonda eski oturum kalmış olabilir
      const { error } = await supabase.auth.getUser();
      if (error) { await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); setMe(null); setReady(true); return; }
    }
    setMe({ id: u.id, email: u.email || '', name: prof?.name || (u.user_metadata?.name as string) || (u.email || '?').split('@')[0], isMod: !!prof?.is_moderator });
    setReady(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session)).catch(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => { setTimeout(() => load(session), 0); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    ready, me,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw new Error(trError(error));
    },
    async signUp(name, email, password) {
      const n = name.trim();
      if (n.length < 2 || n.length > 30) throw new Error('Adın 2 ile 30 karakter arasında olmalı.');
      if (BAD_WORDS.some((w) => fold(n).includes(fold(w)))) throw new Error('Bu ad kullanılamaz.');
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password, options: { data: { name: n }, emailRedirectTo: SITE_URL },
      });
      if (error) throw new Error(trError(error));
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.');
      return data.session ? 'done' : 'confirm';
    },
    async signOut() { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
