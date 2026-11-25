import { meters, type Place, type Stats } from '../data/catalog';
import { inSeason } from './season';

/* Hava durumuna göre öneri: bugünün havasına uygun, yakındaki yerler.
   Yağmur/kar → kapalı mekânlar, çok sıcak → su kenarı ve serin yerler, soğuk → müze/çarşı/kaplıca, güzel hava → açık hava. */
export type WxMode = 'rain' | 'snow' | 'hot' | 'cold' | 'nice';
export function wxMode(code: number, temp: number): WxMode {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (temp >= 32) return 'hot';
  if (temp <= 5) return 'cold';
  return 'nice';
}
export const WX_TEXT: Record<WxMode, string> = {
  rain: 'Bugün yağmur var: kapalı mekânları öneriyoruz',
  snow: 'Kar yağıyor: müzeler, kaplıcalar ve kayak merkezleri',
  hot: 'Hava çok sıcak: deniz, göl, mağara ve serin yerler',
  cold: 'Hava soğuk: müzeler, çarşılar ve kaplıcalar',
  nice: 'Hava gezmeye çok uygun: açık havada gezilecek yerler',
};
const CATS: Record<WxMode, Set<string>> = {
  rain: new Set(['muze', 'saray', 'cami', 'kilise', 'carsi', 'yapi', 'magara']),
  snow: new Set(['muze', 'kaplica', 'saray', 'cami', 'carsi']),
  hot: new Set(['plaj', 'ada', 'sahil', 'gol', 'selale', 'magara', 'kanyon']),
  cold: new Set(['muze', 'carsi', 'kaplica', 'saray', 'cami', 'kilise']),
  nice: new Set(['park', 'kanyon', 'selale', 'gol', 'dag', 'antik', 'kale', 'seyir', 'olusum', 'kasaba', 'mahalle', 'cadde', 'ada', 'sahil', 'plaj', 'kule']),
};
const SKI = /Kayak Merkezi|^(Uludağ|Erciyes Dağı|Palandöken|Sarıkamış)$/;

export function weatherPicks(places: Place[], stats: (id: string) => Stats, pos: { lat: number; lng: number }, mode: WxMode, n = 8) {
  const want = CATS[mode];
  const ok = (p: Place) => (want.has(p.c) || (mode === 'snow' && SKI.test(p.n))) && (mode !== 'nice' || !['plaj', 'ada', 'sahil'].includes(p.c) || inSeason(p))
    && !((mode === 'rain' || mode === 'cold' || mode === 'snow') && /Köprü|Su Kemeri|Kanalı/.test(p.n));   // köprü gibi açık yapılar kapalı mekân değil
  const score = (p: Place, km: number) => {
    const s = stats(p.id);
    return (0.6 + 0.2 * (p.t || 3) + Math.log10(1 + s.visits) * 0.4 + (s.count ? (s.rating - 3) * 0.3 : 0)) / (1 + km / 15);
  };
  const near = (r: number) => places.map((p) => ({ p, km: meters(pos.lat, pos.lng, p.lat, p.lng) / 1000 })).filter((x) => x.km <= r && ok(x.p));
  let list = near(40); if (list.length < 4) list = near(120);
  return list.sort((a, b) => score(b.p, b.km) - score(a.p, a.km)).slice(0, n);
}
