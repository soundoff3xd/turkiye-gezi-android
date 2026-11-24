import raw from './places.json';
import provRaw from './provinces.json';
import trRaw from './turkey.json';

export type Place = {
  id: string; n: string; il: string; semt?: string; r: number; c: string;
  lat: number; lng: number; d?: string; h?: string; t?: number; added?: string;
};
export type Stats = { visits: number; favs: number; count: number; rating: number };

export const REGIONS = ['Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];
export const GROUPS: [string, string][] = [['kultur', 'Tarih ve kültür'], ['doga', 'Doğa'], ['deniz', 'Deniz ve kıyı'], ['sehir', 'Şehir ve kasaba'], ['manzara', 'Manzara']];
export const SUBS: Record<string, [string, string]> = {
  cami: ['kultur', 'Cami ve türbe'], kilise: ['kultur', 'Kilise ve manastır'], antik: ['kultur', 'Antik kent ve ören yeri'], kale: ['kultur', 'Kale ve sur'],
  saray: ['kultur', 'Saray ve köşk'], muze: ['kultur', 'Müze'], anit: ['kultur', 'Anıt'], yapi: ['kultur', 'Tarihi yapı'],
  park: ['doga', 'Park ve milli park'], gol: ['doga', 'Göl'], selale: ['doga', 'Şelale'], kanyon: ['doga', 'Kanyon ve vadi'], dag: ['doga', 'Dağ ve yayla'],
  magara: ['doga', 'Mağara ve obruk'], olusum: ['doga', 'Doğal oluşum'], kaplica: ['doga', 'Kaplıca'],
  plaj: ['deniz', 'Plaj ve koy'], ada: ['deniz', 'Ada'], sahil: ['deniz', 'Sahil kasabası'],
  carsi: ['sehir', 'Çarşı ve pazar'], mahalle: ['sehir', 'Tarihi mahalle'], kasaba: ['sehir', 'Kasaba ve köy'], cadde: ['sehir', 'Meydan ve cadde'],
  seyir: ['manzara', 'Seyir noktası'], kule: ['manzara', 'Kule'],
};
export const catName = (c: string) => (SUBS[c] ? SUBS[c][1] : 'Manzara');
export const groupOf = (c: string) => (SUBS[c] ? SUBS[c][0] : 'manzara');
export const SORTS: [SortKey, string][] = [['visits', 'En çok gidilen'], ['favs', 'En favori'], ['rating', 'En yüksek puan'], ['reviews', 'En çok yorum']];
export type SortKey = 'visits' | 'favs' | 'rating' | 'reviews';

export const BASE_PLACES: Place[] = raw as Place[];
export const EMPTY_STATS: Stats = { visits: 0, favs: 0, count: 0, rating: 0 };

/* öneri kuralları: web sitesi ve veritabanıyla aynı */
export const NEED = 3, REPORT_LIMIT = 2, DAILY = 3;
export const STATUS_TXT: Record<string, string> = { wait: 'Topluluk onayı bekliyor', mod: 'Şikâyet aldı, moderatörde', ok: 'Onaylandı, haritada', no: 'Reddedildi' };
export const LEVELS: [number, string][] = [[0, 'Yeni gezgin'], [10, 'Gezgin'], [30, 'Deneyimli gezgin'], [60, 'Güvenilir rehber']];
export function level(points: number) {
  let i = 0; LEVELS.forEach((l, j) => { if (points >= l[0]) i = j; });
  return { i, name: LEVELS[i][1], p: points, next: LEVELS[i + 1] as [number, string] | undefined };
}

/* Türkçe karakterleri sadeleştirerek arama: "goreme" → "Göreme" */
export const fold = (s: string) =>
  s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/â/g, 'a');
export const BAD_WORDS = ['amk', 'aq', 'siktir', 'orospu', 'piç', 'pic', 'yarrak', 'göt', 'salak', 'aptal', 'gerizekal'];

/* coğrafya: 81 il ve Türkiye sınırı (web sitesindeki haritadan) */
export const PROVINCES = (provRaw as [string, number, number][]).map(([n, lat, lng]) => ({ n, lat, lng })).sort((a, b) => a.n.localeCompare(b.n, 'tr'));
const TR_RINGS = trRaw as [number, number][][];
function inRing(x: number, y: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const inTurkey = (lat: number, lng: number) => TR_RINGS.some((r) => inRing(lng, lat, r));
export const meters = (a: number, b: number, c: number, d: number) => {
  const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
  return Math.hypot(x, y) * R;
};
export const nearestProvince = (lat: number, lng: number) =>
  PROVINCES.reduce((m, p) => { const d = meters(lat, lng, p.lat, p.lng); return d < m[1] ? [p.n, d] as [string, number] : m; }, ['', Infinity] as [string, number])[0];
export function regionOf(il: string, places: Place[]) {
  const hit = places.find((p) => p.il === il);
  if (hit) return hit.r;
  const g = PROVINCES.find((p) => p.n === il), lat = g ? g.lat : 39, lng = g ? g.lng : 35;
  return lng > 39.5 ? (lat > 38.5 ? 5 : 6) : lat > 40.7 ? (lng < 31 ? 0 : 4) : lng < 30 ? (lat > 39.8 ? 0 : 1) : lat < 37.3 ? 2 : 3;
}
