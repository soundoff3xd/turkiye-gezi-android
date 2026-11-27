import type { Place } from './catalog';

/* Koleksiyonlar: tamamlanacak yer listeleri. "groups" varsa her grup tek bir hedef sayılır
   (ör. UNESCO'da "İstanbul'un Tarihi Alanları" içindeki yerlerden birine gitmek yeter). */
export type Coll = { id: string; icon: string; name: string; desc: string; groups?: [string, string[]][]; pick?: (p: Place) => boolean; regions?: boolean };

export const REGION_NAMES = ['Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];

export const COLLECTIONS: Coll[] = [
  {
    id: 'unesco', icon: '🌍', name: 'UNESCO Dünya Mirası', desc: 'Türkiye’nin Dünya Mirası Listesi’ndeki 21 alanı',
    groups: [
      ['İstanbul’un Tarihi Alanları', ['ayasofya', 'mavi', 'topkapi', 'suleymaniye']],
      ['Göreme ve Kapadokya', ['goreme']],
      ['Divriği Ulu Camii ve Darüşşifası', ['divrigi']],
      ['Hattuşa', ['hattusa']],
      ['Nemrut Dağı', ['nemrutdagi']],
      ['Hierapolis-Pamukkale', ['pamukkale']],
      ['Ksanthos-Letoon', ['letoon', 'ksantos']],
      ['Safranbolu', ['safranbolu']],
      ['Truva Antik Kenti', ['truva']],
      ['Edirne Selimiye Camii', ['selimiye']],
      ['Çatalhöyük', ['catalhoyuk']],
      ['Bursa ve Cumalıkızık', ['cumalikizik', 'bursaulu']],
      ['Bergama', ['bergama', 'asklepion']],
      ['Efes', ['efes']],
      ['Ani', ['ani']],
      ['Afrodisias', ['afrodisias']],
      ['Göbeklitepe', ['gobeklitepe']],
      ['Diyarbakır Surları ve Hevsel Bahçeleri', ['diyarbakir', 'hevsel']],
      ['Arslantepe Höyüğü', ['arslantepe']],
      ['Gordion', ['gordion']],
      ['Ahşap direkli Selçuklu camileri', ['esrefoglu', 'mahmutbey', 'sivrihisar']],
    ],
  },
  { id: 'bolge', icon: '🧭', name: '7 bölge', desc: 'Her coğrafi bölgede en az bir yer', regions: true },
  { id: 'egeantik', icon: '🏛', name: 'Ege’nin antik kentleri', desc: 'Ege Bölgesi’ndeki antik kentler ve ören yerleri', pick: (p) => p.c === 'antik' && p.r === 1 },
  { id: 'istcami', icon: '🕌', name: 'İstanbul’un camileri', desc: 'Rehberdeki İstanbul camileri', pick: (p) => p.c === 'cami' && p.il === 'İstanbul' },
  { id: 'kapadokya', icon: '🎈', name: 'Kapadokya', desc: 'Nevşehir’deki vadiler, yeraltı şehirleri ve kasabalar', pick: (p) => p.il === 'Nevşehir' },
  { id: 'saray', icon: '👑', name: 'Saraylar', desc: 'Rehberdeki bütün saraylar', pick: (p) => p.c === 'saray' },
  { id: 'kule', icon: '🗼', name: 'Kuleler', desc: 'Rehberdeki bütün kuleler', pick: (p) => p.c === 'kule' },
  { id: 'kaplica', icon: '♨️', name: 'Kaplıcalar', desc: 'Rehberdeki bütün kaplıcalar', pick: (p) => p.c === 'kaplica' },
  { id: 'kanyon', icon: '🏞', name: 'Kanyonlar', desc: 'Rehberdeki bütün kanyonlar', pick: (p) => p.c === 'kanyon' },
  { id: 'magara', icon: '🦇', name: 'Mağaralar', desc: 'Rehberdeki bütün mağaralar', pick: (p) => p.c === 'magara' },
  { id: 'ada', icon: '🏝', name: 'Adalar', desc: 'Rehberdeki bütün adalar', pick: (p) => p.c === 'ada' },
];

export type CollProgress = { done: number; total: number; items: { label: string; ids: string[]; ok: boolean }[] };
export function progress(c: Coll, all: Place[], visited: Set<string>, byId: (id: string) => Place | undefined): CollProgress {
  let items: CollProgress['items'];
  if (c.groups) items = c.groups.map(([label, ids]) => { const real = ids.filter((id) => byId(id)); return { label, ids: real, ok: real.some((id) => visited.has(id)) }; }).filter((g) => g.ids.length);
  else if (c.regions) items = REGION_NAMES.map((label, r) => { const ids = all.filter((p) => p.r === r).map((p) => p.id); return { label, ids, ok: ids.some((id) => visited.has(id)) }; });
  else items = all.filter((p) => !p.closed && c.pick!(p)).map((p) => ({ label: p.n, ids: [p.id], ok: visited.has(p.id) }));
  return { done: items.filter((i) => i.ok).length, total: items.length, items };
}
