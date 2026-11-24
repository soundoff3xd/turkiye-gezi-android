import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { BASE_PLACES, EMPTY_STATS, type Place, type Stats } from '../data/catalog';

/* Yerler, istatistikler ve kullanıcının "Gittim / Favori" işaretleri — web sitesiyle aynı veritabanından */
export function usePlaceData(userId: string | null) {
  const [community, setCommunity] = useState<Place[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [faved, setFaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const places = useMemo(() => {
    const ids = new Set(BASE_PLACES.map((p) => p.id));
    return [...BASE_PLACES, ...community.filter((p) => !ids.has(p.id))];
  }, [community]);

  const reload = useCallback(async () => {
    setError(null);
    const tasks: Promise<unknown>[] = [
      (async () => {
        const { data, error } = await supabase.rpc('get_place_stats');
        if (error) throw error;
        const m: Record<string, Stats> = {};
        (data as any[]).forEach((r) => { m[r.place_id] = { visits: +r.visits, favs: +r.favs, count: +r.reviews, rating: r.rating ? +r.rating : 0 }; });
        setStats(m);
      })(),
      (async () => {
        const { data, error } = await supabase.from('places')
          .select('id,name,province,region,category,lat,lng,description,added_by,profiles!places_added_by_fkey(name)')
          .not('added_by', 'is', null);
        if (error) throw error;
        setCommunity((data as any[]).map((r) => ({
          id: r.id, n: r.name, il: r.province, r: r.region, c: r.category, lat: r.lat, lng: r.lng, d: r.description, t: 1,
          added: r.profiles?.name || '',
        })));
      })(),
    ];
    if (userId) tasks.push((async () => {
      const [v, f] = await Promise.all([supabase.from('visits').select('place_id'), supabase.from('favorites').select('place_id')]);
      if (v.error) throw v.error; if (f.error) throw f.error;
      setVisited(new Set((v.data as any[]).map((x) => x.place_id)));
      setFaved(new Set((f.data as any[]).map((x) => x.place_id)));
    })());
    const res = await Promise.allSettled(tasks);
    if (res.some((r) => r.status === 'rejected')) setError('Bazı bilgiler yüklenemedi. İnternet bağlantını kontrol et.');
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  /* İyimser güncelleme: önce ekranda değiştir, veritabanı reddederse geri al */
  const toggle = useCallback(async (kind: 'visits' | 'favorites', placeId: string): Promise<boolean | null> => {
    if (!userId) return null;
    const set = kind === 'visits' ? visited : faved, setSet = kind === 'visits' ? setVisited : setFaved;
    const field = kind === 'visits' ? 'visits' : 'favs';
    const on = !set.has(placeId);
    const apply = (add: boolean) => {
      setSet((s) => { const n = new Set(s); add ? n.add(placeId) : n.delete(placeId); return n; });
      setStats((m) => { const a = { ...(m[placeId] || EMPTY_STATS) }; a[field] = Math.max(0, a[field] + (add ? 1 : -1)); return { ...m, [placeId]: a }; });
    };
    apply(on);
    const { error } = on
      ? await supabase.from(kind).insert({ user_id: userId, place_id: placeId })
      : await supabase.from(kind).delete().eq('user_id', userId).eq('place_id', placeId);
    if (error) { apply(!on); throw error; }
    return on;
  }, [userId, visited, faved]);

  return { places, stats, visited, faved, error, reload, toggle };
}
