import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { publicUrl, uploadImage, type Picked } from './images';
import { useAuth } from './auth';
import { track } from './telemetry';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* çevrimdışı kullanım: son yüklenen veriler telefonda saklanır, bağlantı yokken bunlar gösterilir */
const cacheSet = (k: string, v: unknown) => { try { AsyncStorage.setItem(`gezi-c-${k}`, JSON.stringify(v)).catch(() => {}); } catch { /* çok büyük */ } };
const cacheGet = async <T,>(k: string): Promise<T | null> => { try { const v = await AsyncStorage.getItem(`gezi-c-${k}`); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
import { BASE_PLACES, EMPTY_STATS, regionOf, type Place, type Stats } from '../data/catalog';

/* Web sitesiyle aynı veritabanı: yerler, istatistikler, yorumlar, beğeniler, öneriler */
export type Reply = { id: string; uid: string; a: string; t: string; av: string | null; hidden?: boolean };
export type Review = {
  id: string; pid: string; uid: string; author: string; av: string | null; rating: number; text: string;
  photo: string | null; likes: number; replies: Reply[]; at: string; hidden?: boolean; photoHidden?: boolean; photoPending?: boolean;
};
export type ReportTarget = 'review' | 'reply' | 'photo';
export type FeedbackKind = 'oneri' | 'hata' | 'gorus';
export type Suggestion = {
  id: string; n: string; il: string; c: string; lat: number; lng: number; d: string; by: string; av: string | null; uid: string;
  ok: number; bad: number; at: string; own: boolean; photo: string | null; state: 'wait' | 'mod' | 'ok' | 'no'; placeId: string | null;
};
export type Photo = { id: string; rid: string; pid: string; by: string; uid: string; av: string | null; cap: string; url: string; likes: number; at: string };

type Store = {
  places: Place[]; byId: (id: string) => Place | undefined; stats: (id: string) => Stats;
  visited: Set<string>; faved: Set<string>; posts: Review[]; liked: Set<string>; plikes: Set<string>;
  sugg: Suggestion[]; myVotes: Record<string, 'ok' | 'bad'>; mineToday: number; photos: Photo[];
  loading: boolean; error: string | null; offline: boolean;
  reload: () => Promise<void>;
  toggle: (kind: 'visits' | 'favorites', placeId: string) => Promise<boolean>;
  like: (reviewId: string) => Promise<void>;
  photoLike: (reviewId: string) => Promise<boolean>;
  reply: (reviewId: string, text: string) => Promise<void>;
  addReview: (placeId: string, rating: number, text: string, img: Picked | null) => Promise<void>;
  addSuggestion: (f: { n: string; il: string; c: string; lat: number; lng: number; d: string; img: Picked }) => Promise<void>;
  vote: (id: string, val: 1 | -1) => Promise<'added' | 'mod' | 'reported' | 'ok'>;
  moderate: (id: string, approve: boolean) => Promise<void>;
  report: (type: ReportTarget, id: string, reason: string) => Promise<void>;
  sendFeedback: (f: { kind: FeedbackKind; rating: number | null; body: string; version: string }) => Promise<void>;
  correct: (placeId: string, kind: CorrectionKind, note: string, lat?: number | null, lng?: number | null) => Promise<void>;
};
export type CorrectionKind = 'konum' | 'bilgi' | 'kapali' | 'diger';
const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx) as Store;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const uid = me?.id ?? null;
  const [community, setCommunity] = useState<Place[]>([]);
  const [over, setOver] = useState<Record<string, { lat: number | null; lng: number | null; closed: boolean }>>({});
  const [agg, setAgg] = useState<Record<string, Stats>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [faved, setFaved] = useState<Set<string>>(new Set());
  const [posts, setPosts] = useState<Review[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [plikes, setPlikes] = useState<Set<string>>(new Set());
  const [photoBase, setPhotoBase] = useState<Record<string, number>>({});
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, 'ok' | 'bad'>>({});
  const [mineToday, setMineToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const fresh = useRef<Record<string, boolean>>({});
  const uidRef = useRef(uid); uidRef.current = uid;

  // moderatörün onayladığı düzeltmeler (konum, kapandı) paketteki verinin üstüne uygulanır
  const all = useMemo(() => {
    const ids = new Set(BASE_PLACES.map((p) => p.id));
    return [...BASE_PLACES, ...community.filter((p) => !ids.has(p.id))].map((p) => {
      const o = over[p.id]; if (!o) return p;
      return { ...p, lat: o.lat ?? p.lat, lng: o.lng ?? p.lng, closed: o.closed || undefined };
    });
  }, [community, over]);
  const places = useMemo(() => all.filter((p) => !p.closed), [all]);
  const index = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  /* ---- yükleyiciler ---- */
  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_place_stats'); if (error) throw error;
    const m: Record<string, Stats> = {};
    (data as any[]).forEach((r) => { m[r.place_id] = { visits: +r.visits, favs: +r.favs, count: +r.reviews, rating: r.rating ? +r.rating : 0 }; });
    setAgg(m); fresh.current.agg = true; cacheSet('agg', m);
  }, []);
  const loadPlaces = useCallback(async () => {
    const { data, error } = await supabase.from('places')
      .select('id,name,province,region,category,lat,lng,description,added_by,profiles!places_added_by_fkey(name)').not('added_by', 'is', null);
    if (error) throw error;
    const com = (data as any[]).map((r) => ({ id: r.id, n: r.name, il: r.province, r: r.region, c: r.category, lat: r.lat, lng: r.lng, d: r.description, t: 1, added: r.profiles?.name || '' }));
    const ov = await supabase.from('place_overrides').select('place_id,lat,lng,closed');
    const o = ov.error ? null : Object.fromEntries((ov.data as any[]).map((r) => [r.place_id, { lat: r.lat, lng: r.lng, closed: !!r.closed }]));
    if (o) setOver(o);
    setCommunity(com);
    fresh.current.places = true; cacheSet('places', { com, over: o || {} });
  }, []);
  const loadReviews = useCallback(async () => {
    const { data, error } = await supabase.from('reviews')
      .select('id,place_id,user_id,rating,body,photo_path,hidden,photo_hidden,photo_pending,created_at,profiles!reviews_user_id_fkey(name,avatar_path),replies(id,body,hidden,created_at,user_id,profiles!replies_user_id_fkey(name,avatar_path)),review_likes(user_id),photo_likes(user_id)')
      .order('created_at', { ascending: false }).limit(400);
    if (error) throw error;
    const me = uidRef.current, L = new Set<string>(), P = new Set<string>(), base: Record<string, number> = {};
    const list = (data as any[]).map((r) => {
      const mineLike = !!me && r.review_likes.some((l: any) => l.user_id === me);
      const minePhoto = !!me && r.photo_likes.some((l: any) => l.user_id === me);
      if (mineLike) L.add(r.id); if (minePhoto) P.add(r.id);
      base[r.id] = r.photo_likes.length - (minePhoto ? 1 : 0);
      return {
        id: r.id, pid: r.place_id, uid: r.user_id, author: r.profiles?.name || '?', av: publicUrl(r.profiles?.avatar_path), rating: r.rating, text: r.body || '',
        // şikâyetle gizlenen fotoğrafı yalnızca sahibi görür
        photo: r.photo_hidden && r.user_id !== me ? null : publicUrl(r.photo_path), likes: r.review_likes.length - (mineLike ? 1 : 0), at: r.created_at,
        hidden: !!r.hidden, photoHidden: !!r.photo_hidden, photoPending: !!r.photo_pending,
        replies: (r.replies as any[]).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((x) => ({ id: x.id, uid: x.user_id, a: x.profiles?.name || '?', t: x.body, av: publicUrl(x.profiles?.avatar_path), hidden: !!x.hidden })),
      } as Review;
    });
    setPosts(list); setLiked(L); setPlikes(P); setPhotoBase(base);
    fresh.current.reviews = true; cacheSet('reviews', { list, L: [...L], P: [...P], base });
  }, []);
  const loadSuggestions = useCallback(async () => {
    const { data, error } = await supabase.from('suggestions')
      .select('*,profiles!suggestions_user_id_fkey(name,avatar_path),suggestion_votes(user_id,vote)').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const me = uidRef.current, votes: Record<string, 'ok' | 'bad'> = {}; let mine = 0;
    const list = (data as any[]).map((g) => {
      const mv = me && g.suggestion_votes.find((v: any) => v.user_id === me);
      if (mv) votes[g.id] = mv.vote > 0 ? 'ok' : 'bad';
      if (me && g.user_id === me && Date.now() - new Date(g.created_at).getTime() < 864e5) mine++;
      return {
        id: g.id, n: g.name, il: g.province, c: g.category, lat: g.lat, lng: g.lng, d: g.description, by: g.profiles?.name || '?', av: publicUrl(g.profiles?.avatar_path),
        uid: g.user_id, ok: g.suggestion_votes.filter((v: any) => v.vote > 0).length, bad: g.suggestion_votes.filter((v: any) => v.vote < 0).length,
        at: g.created_at, own: !!me && g.user_id === me, photo: publicUrl(g.photo_path), state: g.status, placeId: g.place_id,
      } as Suggestion;
    });
    setSugg(list); setMyVotes(votes); setMineToday(mine);
  }, []);
  const loadMine = useCallback(async () => {
    if (!uidRef.current) { setVisited(new Set()); setFaved(new Set()); return; }
    const [v, f] = await Promise.all([supabase.from('visits').select('place_id'), supabase.from('favorites').select('place_id')]);
    if (v.error) throw v.error; if (f.error) throw f.error;
    const vs = (v.data as any[]).map((x) => x.place_id), fs = (f.data as any[]).map((x) => x.place_id);
    setVisited(new Set(vs)); setFaved(new Set(fs));
    fresh.current.mine = true; cacheSet(`mine-${uidRef.current}`, { vs, fs });
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    const res = await Promise.allSettled([loadPlaces(), loadStats(), loadReviews(), loadSuggestions(), loadMine()]);
    if (res.some((r) => r.status === 'rejected')) setError('Bazı bilgiler yüklenemedi. İnternet bağlantını kontrol et.');
    setOffline(res.filter((r) => r.status === 'rejected').length >= 3);
    setLoading(false);
  }, [loadPlaces, loadStats, loadReviews, loadSuggestions, loadMine]);
  // kayıtlı verileri hemen göster; sunucudan gelen yenisi gelince üzerine yazılır
  useEffect(() => {
    let live = true;
    (async () => {
      const [a, pl, rv, mi] = await Promise.all([
        cacheGet<Record<string, Stats>>('agg'), cacheGet<{ com: Place[]; over: Record<string, any> }>('places'),
        cacheGet<{ list: Review[]; L: string[]; P: string[]; base: Record<string, number> }>('reviews'), uid ? cacheGet<{ vs: string[]; fs: string[] }>(`mine-${uid}`) : null,
      ]);
      if (!live) return;
      if (a && !fresh.current.agg) setAgg(a);
      if (pl && !fresh.current.places) { setCommunity(pl.com || []); setOver(pl.over || {}); }
      if (rv && !fresh.current.reviews) { setPosts(rv.list || []); setLiked(new Set(rv.L || [])); setPlikes(new Set(rv.P || [])); setPhotoBase(rv.base || {}); }
      if (mi && !fresh.current.mine) { setVisited(new Set(mi.vs || [])); setFaved(new Set(mi.fs || [])); }
    })();
    return () => { live = false; };
  }, [uid]);
  useEffect(() => { reload(); }, [uid, reload]);

  /* ---- işlemler (önce ekranda değiştir, veritabanı reddederse geri al) ---- */
  const bump = (id: string, field: 'visits' | 'favs', d: number) =>
    setAgg((m) => { const a = { ...(m[id] || EMPTY_STATS) }; a[field] = Math.max(0, a[field] + d); return { ...m, [id]: a }; });

  const toggle = useCallback(async (kind: 'visits' | 'favorites', placeId: string) => {
    if (!uid) throw new Error('Giriş yap');
    const set = kind === 'visits' ? visited : faved, setSet = kind === 'visits' ? setVisited : setFaved, field = kind === 'visits' ? 'visits' : 'favs';
    const on = !set.has(placeId);
    const apply = (add: boolean) => { setSet((s) => { const n = new Set(s); add ? n.add(placeId) : n.delete(placeId); return n; }); bump(placeId, field, add ? 1 : -1); };
    apply(on);
    const { error } = on ? await supabase.from(kind).insert({ user_id: uid, place_id: placeId }) : await supabase.from(kind).delete().eq('user_id', uid).eq('place_id', placeId);
    if (error) { apply(!on); throw error; }
    if (on) track(kind === 'visits' ? 'act:visit' : 'act:fav');
    return on;
  }, [uid, visited, faved]);

  const flip = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, add: boolean) =>
    setter((s) => { const n = new Set(s); add ? n.add(id) : n.delete(id); return n; });

  const like = useCallback(async (rid: string) => {
    if (!uid) return;
    const on = !liked.has(rid); flip(setLiked, rid, on);
    const { error } = on ? await supabase.from('review_likes').insert({ review_id: rid, user_id: uid }) : await supabase.from('review_likes').delete().eq('review_id', rid).eq('user_id', uid);
    if (error) { flip(setLiked, rid, !on); throw error; }
    if (on) track('act:like');
  }, [uid, liked]);

  const photoLike = useCallback(async (rid: string) => {
    if (!uid) return false;
    const on = !plikes.has(rid); flip(setPlikes, rid, on);
    const { error } = on ? await supabase.from('photo_likes').insert({ review_id: rid, user_id: uid }) : await supabase.from('photo_likes').delete().eq('review_id', rid).eq('user_id', uid);
    if (error) { flip(setPlikes, rid, !on); throw error; }
    if (on) track('act:photo_like');
    return on;
  }, [uid, plikes]);

  const reply = useCallback(async (rid: string, text: string) => {
    if (!uid || !me) return;
    const t = text.trim(); if (!t) return;
    const { data, error } = await supabase.from('replies').insert({ review_id: rid, user_id: uid, body: t.slice(0, 500) }).select('id').single();
    if (error) throw error;
    track('act:reply');
    setPosts((ps) => ps.map((p) => (p.id === rid ? { ...p, replies: [...p.replies, { id: (data as any)?.id || '', uid, a: me.name, t, av: me.av }] } : p)));
  }, [uid, me]);

  const addReview = useCallback(async (placeId: string, rating: number, text: string, img: Picked | null) => {
    if (!uid) return;
    const path = img ? await uploadImage(uid, img) : null;
    const { error } = await supabase.from('reviews').insert({ place_id: placeId, user_id: uid, rating, body: text.trim().slice(0, 1000), photo_path: path });
    if (error) { if (path) supabase.storage.from('photos').remove([path]).catch(() => {}); throw error; }
    track(path ? 'act:review_photo' : 'act:review');
    await Promise.all([loadReviews(), loadStats()]).catch(() => {});
  }, [uid, loadReviews, loadStats]);

  const addSuggestion = useCallback(async (f: { n: string; il: string; c: string; lat: number; lng: number; d: string; img: Picked }) => {
    if (!uid) return;
    const path = await uploadImage(uid, f.img);
    const { error } = await supabase.from('suggestions').insert({
      user_id: uid, name: f.n.trim(), province: f.il, category: f.c, lat: f.lat, lng: f.lng, description: f.d.trim(), photo_path: path, region: regionOf(f.il, places),
    });
    if (error) { supabase.storage.from('photos').remove([path]).catch(() => {}); throw error; }
    track('act:suggest');
    await loadSuggestions();
  }, [uid, places, loadSuggestions]);

  const vote = useCallback(async (id: string, val: 1 | -1) => {
    if (!uid) return 'ok' as const;
    const before = sugg.find((x) => x.id === id);
    const { error } = await supabase.from('suggestion_votes').insert({ suggestion_id: id, user_id: uid, vote: val });
    if (error) throw error;
    const { data } = await supabase.from('suggestions').select('status').eq('id', id).maybeSingle();
    await loadSuggestions();
    if (data?.status === 'ok' && before?.state !== 'ok') { await Promise.all([loadPlaces(), loadStats()]).catch(() => {}); return 'added' as const; }
    if (data?.status === 'mod') return 'mod' as const;
    return val < 0 ? 'reported' as const : 'ok' as const;
  }, [uid, sugg, loadSuggestions, loadPlaces, loadStats]);

  const moderate = useCallback(async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc('moderate_suggestion', { sid: id, approve });
    if (error) throw error;
    await reload();
  }, [reload]);

  /* şikâyet: 3 farklı kişi şikâyet edince içerik otomatik gizlenir (veritabanında) */
  const report = useCallback(async (type: ReportTarget, id: string, reason: string) => {
    if (!uid) return;
    const { error } = await supabase.from('reports').insert({ user_id: uid, target_type: type, target_id: id, reason });
    if (error) throw error;
    loadReviews().catch(() => {});
  }, [uid, loadReviews]);
  const sendFeedback = useCallback(async (f: { kind: FeedbackKind; rating: number | null; body: string; version: string }) => {
    if (!uid) return;
    const { error } = await supabase.from('feedback').insert({ user_id: uid, kind: f.kind, rating: f.rating, body: f.body.trim().slice(0, 2000), platform: 'android', version: f.version });
    if (error) throw error;
    track('act:feedback');
  }, [uid]);
  /* "bilgi yanlış": yer hakkında düzeltme önerisi → moderatör paneline düşer */
  const correct = useCallback(async (placeId: string, kind: CorrectionKind, note: string, lat?: number | null, lng?: number | null) => {
    if (!uid) return;
    const { error } = await supabase.from('corrections').insert({ place_id: placeId, kind, note: note.trim().slice(0, 600), lat: lat ?? null, lng: lng ?? null });
    if (error) throw error;
    track('act:correct');
  }, [uid]);

  const photos = useMemo<Photo[]>(() => posts.filter((p) => p.photo && !p.photoHidden && !p.hidden && index.has(p.pid)).map((p) => ({
    id: 'pp' + p.id, rid: p.id, pid: p.pid, by: p.author, uid: p.uid, av: p.av, cap: p.text.slice(0, 60), url: p.photo as string,
    likes: (photoBase[p.id] || 0) + (plikes.has(p.id) ? 1 : 0), at: p.at,
  })), [posts, index, photoBase, plikes]);

  // aynı nesne korunur: yalnızca veriler değişince ekranlar yeniden çizilir
  const byId = useCallback((id: string) => index.get(id), [index]);
  const stats = useCallback((id: string) => agg[id] || EMPTY_STATS, [agg]);
  const value: Store = useMemo(() => ({
    places, byId, stats,
    visited, faved, posts, liked, plikes, sugg, myVotes, mineToday, photos, loading, error, offline,
    reload, toggle, like, photoLike, reply, addReview, addSuggestion, vote, moderate, report, sendFeedback, correct,
  }), [places, byId, stats, visited, faved, posts, liked, plikes, sugg, myVotes, mineToday, photos, loading, error, offline,
    reload, toggle, like, photoLike, reply, addReview, addSuggestion, vote, moderate, report, sendFeedback, correct]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
