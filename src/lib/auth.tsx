import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SITE_URL } from './supabase';
import { unregisterPush } from './push';
import { readThemeCfg, saveThemeCfg } from '../Boot';
import { publicUrl, uploadImage, type Picked } from './images';
import { BAD_WORDS, fold } from '../data/catalog';

export type Me = { id: string; email: string; name: string; isMod: boolean; created: string; avPath: string | null; av: string | null };
type AuthState = {
  ready: boolean;
  me: Me | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'confirm' | 'done'>;
  signOut: () => Promise<void>;
  setAvatar: (img: Picked | null) => Promise<void>;
  deleteAccount: () => Promise<void>;
};
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => useContext(Ctx) as AuthState;

/* Supabase'in İngilizce hata mesajlarını Türkçeye çevir (ekranda seçili dile çevrilir) */
const ERR: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/email not confirmed/i, 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.'],
  [/rate limit|too many/i, 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.'],
  [/already registered|already exists/i, 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.'],
  [/network|fetch|timed? ?out/i, 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.'],
  [/password should be/i, 'Şifre en az 8 karakter olmalı.'],
  [/payload too large|exceeded the maximum/i, 'Fotoğraf en fazla 5 MB olabilir.'],
  [/own_content/i, 'Kendi paylaşımını şikâyet edemezsin.'],
  [/report_limit/i, 'Bugün çok fazla şikâyette bulundun. Yarın tekrar deneyebilirsin.'],
  [/feedback_limit/i, 'Bugün çok fazla mesaj gönderdin. Yarın tekrar deneyebilirsin.'],
  [/no_target/i, 'Bu içerik artık yok.'],
  [/duplicate key|already voted|unique/i, 'Bunu zaten yaptın.'],
];
export const trError = (e: unknown) => {
  const m = (e as { message?: string })?.message || String(e || '');
  const hit = ERR.find(([r]) => r.test(m));
  if (hit) return hit[1];
  // kendi Türkçe mesajlarımız (ör. veritabanı kurallarından gelenler) olduğu gibi gösterilir
  return /[çğıöşüÇĞİÖŞÜ]/.test(m) && m.length < 200 ? m : 'Bir hata oluştu, lütfen tekrar dene.';
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async (session: Session | null) => {
    if (!session?.user) { setMe(null); setReady(true); return; }
    const u = session.user;
    const { data: prof } = await supabase.from('profiles').select('name,is_moderator,created_at,avatar_path,theme').eq('id', u.id).maybeSingle();
    // hesaba kayıtlı tema bu telefondakinden farklıysa kaydet (bir sonraki açılışta uygulanır)
    if (prof?.theme && typeof prof.theme === 'object') {
      readThemeCfg().then((local) => { if (JSON.stringify(local) !== JSON.stringify(prof.theme)) saveThemeCfg(prof.theme); }).catch(() => {});
    }
    if (!prof) {
      // hesap silinmiş ama telefonda eski oturum kalmış olabilir
      const { error } = await supabase.auth.getUser();
      if (error) { await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); setMe(null); setReady(true); return; }
    }
    setMe({
      id: u.id, email: u.email || '', name: prof?.name || (u.user_metadata?.name as string) || (u.email || '?').split('@')[0],
      isMod: !!prof?.is_moderator, created: prof?.created_at || u.created_at, avPath: prof?.avatar_path || null, av: publicUrl(prof?.avatar_path),
    });
    setReady(true);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session)).catch(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === 'TOKEN_REFRESHED') return;
      setTimeout(() => load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

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
    async signOut() { await unregisterPush(); await supabase.auth.signOut(); },
    async setAvatar(img) {
      if (!me) return;
      const old = me.avPath;
      const path = img ? await uploadImage(me.id, img, 'avatar') : null;
      const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', me.id);
      if (error) { if (path) supabase.storage.from('photos').remove([path]).catch(() => {}); throw error; }
      if (old && old !== path) supabase.storage.from('photos').remove([old]).catch(() => {});
      setMe({ ...me, avPath: path, av: publicUrl(path) });
    },
    async deleteAccount() {
      if (!me) return;
      const { data: files } = await supabase.storage.from('photos').list(me.id, { limit: 1000 });
      if (files && files.length) await supabase.storage.from('photos').remove(files.map((f) => `${me.id}/${f.name}`));
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setMe(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
