import type { Place } from '../data/catalog';

/* Bir yeri gezmek için en iyi aylar (1–12). Kategori + bölge iklimine göre kaba kurallar;
   yaz sıcağı (Ege, Akdeniz, Güneydoğu), kısa yaz (Doğu, Karadeniz yaylaları) ve kayak sezonu hesaba katılır.
   Bölgeler: 0 Marmara, 1 Ege, 2 Akdeniz, 3 İç Anadolu, 4 Karadeniz, 5 Doğu Anadolu, 6 Güneydoğu */
const SKI = new Set(['uludag', 'erciyes', 'palandoken', 'sarikamis', 'yedikuyular', 'kartepe', 'kartalkaya', 'saklikentkayak', 'hesarek']);
const span = (a: number, b: number) => { const r: number[] = []; for (let m = a; ; m = (m % 12) + 1) { r.push(m); if (m === b) break; } return r; };
const NATURE = new Set(['gol', 'selale', 'kanyon', 'park', 'doga', 'olusum']);
const SEA = new Set(['plaj', 'ada', 'sahil']);

export function bestMonths(p: Pick<Place, 'id' | 'n' | 'c' | 'r'>): number[] {
  const r = p.r, c = p.c;
  if (SKI.has(p.id) || /Kayak Merkezi/.test(p.n)) return span(12, 3);
  if (SEA.has(c)) return r === 1 || r === 2 ? span(5, 10) : r === 4 ? span(7, 8) : span(6, 9);
  if (c === 'kaplica') return span(10, 4);
  if (c === 'dag') return r === 4 || r === 5 ? span(6, 9) : r === 1 || r === 2 ? span(5, 10) : span(5, 9);
  if (c === 'magara') return span(4, 10);
  if (NATURE.has(c)) return r === 4 || r === 5 ? span(5, 9) : r === 1 || r === 2 || r === 6 ? [...span(3, 6), ...span(9, 11)] : span(4, 10);
  // tarih, kültür, şehir, manzara: ılık aylar
  if (r === 1 || r === 2 || r === 6) return [...span(3, 5), ...span(10, 11)];
  if (r === 5) return span(5, 10);
  if (r === 4) return span(5, 9);
  return [...span(4, 6), ...span(9, 10)];
}
export const inSeason = (p: Pick<Place, 'id' | 'n' | 'c' | 'r'>, month = new Date().getMonth() + 1) => bestMonths(p).includes(month);

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function monthName(m: number, lang: string) {
  if (lang === 'tr') return TR_MONTHS[m - 1];
  try { return new Date(2026, m - 1, 15).toLocaleDateString(lang, { month: 'long' }); } catch { return TR_MONTHS[m - 1]; }
}
/* [5,6,7,9,10] → "Mayıs–Temmuz, Eylül–Ekim" (dile göre ay adları) */
export function monthsText(ms: number[], lang: string) {
  const set = new Set(ms), runs: [number, number][] = [];
  if (set.size === 12) return null;
  // yılın başına sarkan dizileri (Aralık–Mart) bir arada tutmak için boş bir aydan başla
  let start = 1; while (set.has(start)) start = (start % 12) + 1;
  let cur: [number, number] | null = null;
  for (let i = 0, m = start; i < 12; i++, m = (m % 12) + 1) {
    if (set.has(m)) { if (cur) cur[1] = m; else cur = [m, m]; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.map(([a, b]) => (a === b ? monthName(a, lang) : `${monthName(a, lang)}–${monthName(b, lang)}`)).join(', ');
}
