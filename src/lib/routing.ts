import { supabase } from './supabase';
import { meters } from '../data/catalog';

/* Rota servisi (Supabase "route" fonksiyonu → OpenRouteService) ve canlı navigasyon hesapları */
export type Step = { i: string; d: number; t: number; w: number; e: number; y: number; k: number };
export type RouteRes = { geometry: GeoJSON.LineString; distance: number; duration: number; steps: Step[]; legs: { d: number; t: number }[]; lang: string };
export type Profile = 'driving-car' | 'foot-walking' | 'cycling-regular';

export class RouteError extends Error { constructor(public code: string) { super(code); } }

export async function fetchRoute(profile: Profile, coords: [number, number][], language: string): Promise<RouteRes> {
  let res;
  try { res = await supabase.functions.invoke('route', { body: { profile, coordinates: coords, language } }); }
  catch { throw new RouteError('network'); }
  const { data, error } = res;
  if (error) {
    let code = 'no_route';
    try { code = (await (error as any).context?.json())?.error || code; } catch { code = 'network'; }
    throw new RouteError(code);
  }
  const r = data as RouteRes;
  r.steps = (r.steps || []).map((s) => ({ ...s, w: s.w ?? 0, e: s.e ?? 0, y: s.y ?? -1, k: s.k ?? 0, i: s.i || '' }));
  r.legs = r.legs || []; r.lang = r.lang || language;
  return r;
}
export const routeErrorText = (code: string) =>
  code === 'no_key' ? 'Uygulama içi yol tarifi çok yakında açılacak. Şimdilik Google Haritalar ile devam edebilirsin.'
    : code === 'rate_limited' ? 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar dene.'
      : code === 'network' ? 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.' : 'Rota bulunamadı.';

/* manevra türü → ok işareti (ORS: 0 sol, 1 sağ, 2 keskin sol, 3 keskin sağ, 4 hafif sol, 5 hafif sağ, 6 düz,
   7 dönel kavşağa gir, 8 kavşaktan çık, 9 geri dön, 10 varış, 11 başlangıç, 12 soldan devam, 13 sağdan devam) */
export const ARROW: Record<number, string> = { 0: '←', 1: '→', 2: '↙', 3: '↘', 4: '↖', 5: '↗', 6: '↑', 7: '↻', 8: '↻', 9: '↶', 10: '⚑', 11: '↑', 12: '↖', 13: '↗' };

/* rota üzerindeki konum: en yakın parça, rota başından uzaklık, rotadan sapma */
export type Track = { cum: number[]; total: number; pts: [number, number][] };
export function prepTrack(geom: GeoJSON.LineString): Track {
  const pts = geom.coordinates as [number, number][], cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + meters(pts[i - 1][1], pts[i - 1][0], pts[i][1], pts[i][0]));
  return { cum, total: cum[cum.length - 1] || 0, pts };
}
export type Snap = { idx: number; along: number; off: number; lng: number; lat: number };
export function snap(tr: Track, lat: number, lng: number, hint = 0): Snap {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180), ky = 110540;
  let best: Snap = { idx: 0, along: 0, off: Infinity, lng: tr.pts[0][0], lat: tr.pts[0][1] };
  // önce son konumun çevresine, bulunamazsa tüm rotaya bak
  const scan = (a: number, b: number) => {
    for (let i = Math.max(0, a); i < Math.min(tr.pts.length - 1, b); i++) {
      const [x1, y1] = tr.pts[i], [x2, y2] = tr.pts[i + 1];
      const ax = (x1 - lng) * kx, ay = (y1 - lat) * ky, bx = (x2 - lng) * kx, by = (y2 - lat) * ky;
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const u = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
      const px = ax + u * dx, py = ay + u * dy, d = Math.hypot(px, py);
      if (d < best.off) best = { idx: i, along: tr.cum[i] + u * (tr.cum[i + 1] - tr.cum[i]), off: d, lng: x1 + u * (x2 - x1), lat: y1 + u * (y2 - y1) };
    }
  };
  scan(hint - 30, hint + 400);
  if (best.off > 60) scan(0, tr.pts.length);
  return best;
}
export const bearing = (a: [number, number], b: [number, number]) => {
  const toR = Math.PI / 180, y = Math.sin((b[0] - a[0]) * toR) * Math.cos(b[1] * toR);
  const x = Math.cos(a[1] * toR) * Math.sin(b[1] * toR) - Math.sin(a[1] * toR) * Math.cos(b[1] * toR) * Math.cos((b[0] - a[0]) * toR);
  return ((Math.atan2(y, x) / toR) + 360) % 360;
};
/* rotanın ileriye doğru yönü (kamera için) */
export function aheadBearing(tr: Track, s: Snap) {
  const target = s.along + 40;
  let j = s.idx + 1; while (j < tr.pts.length - 1 && tr.cum[j] < target) j++;
  return bearing([s.lng, s.lat], tr.pts[Math.min(j, tr.pts.length - 1)]);
}
/* adım: bulunduğun parçanın ait olduğu adım; sıradaki manevra bir sonraki adımın başı */
export function stepAt(steps: Step[], idx: number) {
  for (let k = 0; k < steps.length; k++) if (idx >= steps[k].w && idx < Math.max(steps[k].e, steps[k].w + 1)) return k;
  return Math.max(0, steps.length - 1);
}

/* en yakın komşu sırası (gezi listesi ve gezi planı için) */
export function nearestOrder<T extends { lat: number; lng: number }>(items: T[], start?: { lat: number; lng: number } | null): T[] {
  const rest = items.slice(), out: T[] = [];
  let cur = start || rest[0];
  if (!start && rest.length) out.push(rest.shift() as T);
  while (rest.length) {
    let bi = 0, bd = Infinity;
    rest.forEach((p, i) => { const d = meters(cur.lat, cur.lng, p.lat, p.lng); if (d < bd) { bd = d; bi = i; } });
    cur = rest[bi]; out.push(rest.splice(bi, 1)[0]);
  }
  return out;
}
