import { meters, PROVINCES, type Place, type Stats } from '../data/catalog';
import { LANDMARKS } from '../data/markers';
import { nearestOrder } from './routing';

/* "Nereye gitmeliyim?": seçilen türdeki yerlerin sayısına, popülerliğine ve puanlarına göre illeri sıralar */
export function weight(p: Place, s: Stats) {
  let w = 0.6 + 0.2 * (p.t || 3);
  if (s.count > 0) w += (s.rating - 3) * 0.3;
  w += Math.log10(1 + s.visits) * 0.4;
  if (LANDMARKS.has(p.id)) w += 0.8;
  return w;
}
export type CityPick = { il: string; score: number; matches: Place[]; avg: number; km: number | null };
export function rankCities(places: Place[], stats: (id: string) => Stats, subs: string[], near: { lat: number; lng: number } | null): CityPick[] {
  if (!subs.length) return [];
  const want = new Set(subs), by: Record<string, Place[]> = {};
  places.forEach((p) => { if (want.has(p.c)) (by[p.il] = by[p.il] || []).push(p); });
  return Object.entries(by).map(([il, ms]) => {
    const ws = ms.map((p) => weight(p, stats(p.id)));
    let score = ws.reduce((a, b) => a + b, 0) + 0.6 * (new Set(ms.map((p) => p.c)).size - 1);
    const pr = PROVINCES.find((x) => x.n === il);
    const km = near && pr ? meters(near.lat, near.lng, pr.lat, pr.lng) / 1000 : null;
    if (km != null) score /= 1 + km / 250;
    const rated = ms.map((p) => stats(p.id)).filter((s) => s.count > 0);
    const avg = rated.length ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : 0;
    const sorted = ms.map((p, i) => [p, ws[i]] as const).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    return { il, score, matches: sorted, avg, km };
  }).sort((a, b) => b.score - a.score);
}
/* gün gün gezi planı: önce seçtiğin türdekiler, sonra ilin öne çıkan diğer yerleri; en kısa sırayla günlere bölünür */
export function planCity(places: Place[], stats: (id: string) => Stats, il: string, subs: string[], days: number, start: { lat: number; lng: number } | null) {
  const want = new Set(subs), inIl = places.filter((p) => p.il === il);
  const byW = (xs: Place[]) => xs.map((p) => [p, weight(p, stats(p.id))] as const).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const target = Math.min(inIl.length, 4 * days);
  const pick = [...byW(inIl.filter((p) => want.has(p.c))), ...byW(inIl.filter((p) => !want.has(p.c)))].slice(0, target);
  const ordered = nearestOrder(pick, start && meters(start.lat, start.lng, pick[0]?.lat ?? 0, pick[0]?.lng ?? 0) < 150000 ? start : null);
  const d = Math.max(1, Math.min(days, Math.ceil(ordered.length / 2)));
  const per = Math.ceil(ordered.length / d), out: Place[][] = [];
  for (let i = 0; i < d; i++) out.push(ordered.slice(i * per, (i + 1) * per));
  return { days: out.filter((x) => x.length), total: inIl.length };
}
