import { supabase } from './supabase';
import { meters, type Place } from '../data/catalog';
import { prepTrack, snap, type Track } from './routing';
import { lineBoxes, osmInBoxes } from './overpass';

/* Rota durakları: rehberdeki bir yer (id) ya da yol üstünden eklenen bir mola yeri (benzinlik, lokanta…).
   stay = durakta kalınacak dakika (varış saatlerine eklenir). */
export type Stop = { id?: string; n: string; lat: number; lng: number; stay?: number; k?: string };
export const fromPlace = (p: Place): Stop => ({ id: p.id, n: p.n, lat: p.lat, lng: p.lng });
export const stopKey = (s: Stop) => s.id || `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`;
export const MAX_STOPS = 23; // ORS en çok 25 nokta: başlangıç + 23 durak + pay

/* yol üstü mola türleri */
export const ALONG_KINDS: [string, string, string][] = [
  ['fuel', '⛽', 'Benzinlik'], ['food', '🍽', 'Yemek'], ['cafe', '☕', 'Kafe'], ['wc', '🚻', 'Tuvalet'], ['rest', '🅿', 'Dinlenme tesisi'],
];
export const kindIcon = (k?: string) => (ALONG_KINDS.find((x) => x[0] === k) || ['', '📍'])[1];

/* rota çizgisini eşit aralıklı en çok n noktaya indir (sunucuya gönderilecek) */
export function simplify(track: Track, n = 70, from = 0, to = Infinity): [number, number][] {
  const a = Math.max(0, from), b = Math.min(track.total, to);
  const out: [number, number][] = [];
  if (b <= a) return out;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = a + ((b - a) * i) / (n - 1);
    while (j < track.cum.length - 2 && track.cum[j + 1] < target) j++;
    const seg = track.cum[j + 1] - track.cum[j] || 1, u = Math.max(0, Math.min(1, (target - track.cum[j]) / seg));
    const [x1, y1] = track.pts[j], [x2, y2] = track.pts[Math.min(j + 1, track.pts.length - 1)];
    out.push([+(x1 + u * (x2 - x1)).toFixed(5), +(y1 + u * (y2 - y1)).toFixed(5)]);
  }
  return out;
}

export type AlongItem = Stop & { k: string; along: number; off: number; h?: number };
/* rotanın (ya da bir bölümünün) çevresindeki mola yerleri, yol boyunca sıralı */
export async function fetchAlong(track: Track, kinds: string[], from = 0, to = Infinity): Promise<AlongItem[]> {
  const line = simplify(track, Math.min(78, Math.max(12, Math.round((Math.min(track.total, to) - from) / 6000))), from, to);
  if (line.length < 2) return [];
  let raw: { k: string; n: string; lat: number; lng: number; h?: number }[];
  try {
    raw = await osmInBoxes(lineBoxes(line, 1200), kinds); // önce telefondan doğrudan
  } catch {
    const { data, error } = await supabase.functions.invoke('along', { body: { line, kinds, radius: 1200 } });
    if (error) throw error;
    raw = (data as { items?: any[] })?.items || [];
  }
  const items = raw.map((it) => {
    const s = snap(track, it.lat, it.lng);
    return { ...it, along: s.along, off: s.off } as AlongItem;
  }).filter((it) => it.off < 1300 && it.along >= from - 500 && it.along <= to + 500);
  // aynı yere yakın kopyaları ele (bir benzinliğin hem binası hem noktası olabiliyor)
  items.sort((x, y) => x.along - y.along);
  const out: AlongItem[] = [];
  for (const it of items) if (!out.some((o) => o.k === it.k && meters(o.lat, o.lng, it.lat, it.lng) < 120)) out.push(it);
  return out;
}

/* rehberdeki, rotaya en çok maxOff metre uzaklıktaki yerler (durak olmayanlar) */
export function placesAlong(track: Track, places: Place[], skip: Set<string>, maxOff = 8000) {
  const xs = track.pts.map((p) => p[0]), ys = track.pts.map((p) => p[1]);
  const pad = maxOff / 90000;
  const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  const out: { p: Place; along: number; off: number }[] = [];
  for (const p of places) {
    if (skip.has(p.id) || p.closed || p.lng < x0 || p.lng > x1 || p.lat < y0 || p.lat > y1) continue;
    const s = snap(track, p.lat, p.lng);
    if (s.off <= maxOff) out.push({ p, along: s.along, off: s.off });
  }
  return out.sort((a, b) => a.along - b.along);
}

/* en kısa sıra: en yakın komşu + 2-opt (başlangıç sabit; keepLast ise son durak da sabit) */
export function optimize(origin: { lat: number; lng: number } | null, stops: Stop[], keepLast: boolean): Stop[] {
  if (stops.length < 3 && !(origin && stops.length >= 2)) return stops;
  const fixedEnd = keepLast ? stops[stops.length - 1] : null;
  const pool = keepLast ? stops.slice(0, -1) : stops.slice();
  const start = origin || pool.shift()!;
  const head = origin ? [] : [start as Stop];
  const d = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => meters(a.lat, a.lng, b.lat, b.lng);
  // en yakın komşu
  const order: Stop[] = []; let cur: { lat: number; lng: number } = start; const rest = pool.slice();
  while (rest.length) { let bi = 0, bd = Infinity; rest.forEach((p, i) => { const x = d(cur, p); if (x < bd) { bd = x; bi = i; } }); cur = rest[bi]; order.push(rest.splice(bi, 1)[0]); }
  // 2-opt
  const pts = [start, ...order, ...(fixedEnd ? [fixedEnd] : [])];
  const len = (arr: { lat: number; lng: number }[]) => arr.slice(1).reduce((a, p, i) => a + d(arr[i], p), 0);
  let best = pts, improved = true, guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    const last = fixedEnd ? best.length - 2 : best.length - 1;
    for (let i = 1; i < last; i++) for (let k = i + 1; k <= last; k++) {
      const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
      if (len(cand) + 1 < len(best)) { best = cand; improved = true; }
    }
  }
  return [...head, ...(best.slice(1) as Stop[])];
}

/* paylaşım bağlantısı: ?rota=yer1~@41.01,28.97,Ad~yer2&m=a&k=t */
const MODE_C: Record<string, string> = { 'driving-car': 'a', 'foot-walking': 'y', 'cycling-regular': 'b' };
const AVOID_C: Record<string, string> = { tollways: 't', highways: 'h', ferries: 'f' };
export function encodeRoute(stops: Stop[], mode: string, avoid: string[]) {
  const r = stops.map((s) => (s.id ? s.id : `@${s.lat.toFixed(5)},${s.lng.toFixed(5)},${s.n.replace(/[~,]/g, ' ').slice(0, 40)}`)).join('~');
  const k = avoid.map((a) => AVOID_C[a]).filter(Boolean).join('');
  return `rota=${encodeURIComponent(r)}&m=${MODE_C[mode] || 'a'}${k ? `&k=${k}` : ''}`;
}
export function decodeRoute(rota: string, m: string | null, k: string | null, byId: (id: string) => Place | undefined) {
  const stops: Stop[] = [];
  for (const seg of rota.split('~').slice(0, MAX_STOPS)) {
    if (seg.startsWith('@')) {
      const [la, lo, ...nm] = seg.slice(1).split(',');
      const lat = +la, lng = +lo;
      if (isFinite(lat) && isFinite(lng) && lat > 34 && lat < 43 && lng > 24 && lng < 46) stops.push({ lat, lng, n: nm.join(',').slice(0, 40) || '📍' });
    } else if (/^[a-z0-9_-]{1,64}$/i.test(seg)) { const p = byId(seg); if (p) stops.push(fromPlace(p)); }
  }
  const mode = Object.keys(MODE_C).find((x) => MODE_C[x] === m) || 'driving-car';
  const avoid = Object.keys(AVOID_C).filter((x) => (k || '').includes(AVOID_C[x]));
  return { stops, mode, avoid };
}

export { prepTrack };
