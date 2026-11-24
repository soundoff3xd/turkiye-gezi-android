import raw from './places.json';

export type Place = {
  id: string; n: string; il: string; semt?: string; r: number; c: string;
  lat: number; lng: number; d?: string; h?: string; t?: number; added?: string;
};
export type Stats = { visits: number; favs: number; count: number; rating: number };

export const REGIONS = ['Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];
export const GROUPS: Record<string, string> = { kultur: 'Tarih ve kültür', doga: 'Doğa', deniz: 'Deniz ve kıyı', sehir: 'Şehir ve kasaba', manzara: 'Manzara' };
export const SUBS: Record<string, [string, string]> = {
  cami: ['kultur', 'Cami ve türbe'], kilise: ['kultur', 'Kilise ve manastır'], antik: ['kultur', 'Antik kent ve ören yeri'], kale: ['kultur', 'Kale ve sur'],
  saray: ['kultur', 'Saray ve köşk'], muze: ['kultur', 'Müze'], anit: ['kultur', 'Anıt'], yapi: ['kultur', 'Tarihi yapı'],
  park: ['doga', 'Park ve milli park'], gol: ['doga', 'Göl'], selale: ['doga', 'Şelale'], kanyon: ['doga', 'Kanyon ve vadi'], dag: ['doga', 'Dağ ve yayla'],
  magara: ['doga', 'Mağara ve obruk'], olusum: ['doga', 'Doğal oluşum'], kaplica: ['doga', 'Kaplıca'],
  plaj: ['deniz', 'Plaj ve koy'], ada: ['deniz', 'Ada'], sahil: ['deniz', 'Sahil kasabası'],
  carsi: ['sehir', 'Çarşı ve pazar'], mahalle: ['sehir', 'Tarihi mahalle'], kasaba: ['sehir', 'Kasaba ve köy'], cadde: ['sehir', 'Meydan ve cadde'],
  seyir: ['manzara', 'Seyir noktası'], kule: ['manzara', 'Kule'],
};
export const catName = (c: string) => (SUBS[c] ? SUBS[c][1] : GROUPS.manzara);
export const groupOf = (c: string) => (SUBS[c] ? SUBS[c][0] : 'manzara');

export const BASE_PLACES: Place[] = raw as Place[];
export const EMPTY_STATS: Stats = { visits: 0, favs: 0, count: 0, rating: 0 };

/* Türkçe karakterleri sadeleştirerek arama: "goreme" → "Göreme" */
export const fold = (s: string) =>
  s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/â/g, 'a');

export const fmt = (n: number) => n.toLocaleString('tr-TR');
export const rt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const BAD_WORDS = ['amk', 'aq', 'siktir', 'orospu', 'piç', 'pic', 'yarrak', 'göt', 'salak', 'aptal', 'gerizekal'];
