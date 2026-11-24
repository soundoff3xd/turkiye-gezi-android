import { LANDMARKS } from './markers';
import type { Place } from './catalog';

/* Rozetler: gezdiğin yerlere, yorumlarına ve fotoğraflarına göre kazanılır */
export type Badge = { id: string; icon: string; name: string; desc: string; need: number | ((c: BadgeCtx) => number); count: (c: BadgeCtx) => number };
export type BadgeCtx = { visited: Place[]; reviews: number; photos: number; all: Place[] };
export const needOf = (b: Badge, c: BadgeCtx) => (typeof b.need === 'function' ? b.need(c) : b.need);
const inRegion = (r: number) => (c: BadgeCtx) => c.visited.filter((p) => p.r === r).length;
const ofCat = (...cs: string[]) => (c: BadgeCtx) => c.visited.filter((p) => cs.includes(p.c)).length;
export const BADGES: Badge[] = [
  { id: 'ilk', icon: '👣', name: 'İlk Adım', desc: 'İlk yerini “Gittim” olarak işaretle', need: 1, count: (c) => c.visited.length },
  { id: 'gezgin', icon: '🎒', name: 'Gezgin Ruhu', desc: '10 yer gez', need: 10, count: (c) => c.visited.length },
  { id: 'usta', icon: '🧭', name: 'Usta Gezgin', desc: '50 yer gez', need: 50, count: (c) => c.visited.length },
  { id: 'efsane', icon: '🏆', name: 'Efsane Gezgin', desc: '100 yer gez', need: 100, count: (c) => c.visited.length },
  { id: 'unlu', icon: '⭐', name: 'Ünlüler Durağı', desc: 'Özel işaretli 5 ünlü yeri gez', need: 5, count: (c) => c.visited.filter((p) => LANDMARKS.has(p.id)).length },
  { id: 'antik', icon: '🏛', name: 'Antik Gezgin', desc: '5 antik kent ve ören yeri gez', need: 5, count: ofCat('antik') },
  { id: 'kale', icon: '🏰', name: 'Kale Avcısı', desc: '5 kale gez', need: 5, count: ofCat('kale') },
  { id: 'inanc', icon: '🕌', name: 'İnanç Yolcusu', desc: '5 cami, kilise veya manastır gez', need: 5, count: ofCat('cami', 'kilise') },
  { id: 'selale', icon: '💧', name: 'Şelale Avcısı', desc: '3 şelale gez', need: 3, count: ofCat('selale') },
  { id: 'deniz', icon: '🏖', name: 'Deniz Tutkunu', desc: '5 plaj, ada veya sahil kasabası gez', need: 5, count: ofCat('plaj', 'ada', 'sahil') },
  { id: 'doga', icon: '🌲', name: 'Doğa Kâşifi', desc: '10 doğa harikası gez', need: 10, count: ofCat('park', 'gol', 'selale', 'kanyon', 'dag', 'magara', 'olusum', 'kaplica') },
  { id: 'marmara', icon: '🌉', name: 'Marmara Kâşifi', desc: 'Marmara’da 10 yer gez', need: 10, count: inRegion(0) },
  { id: 'ege', icon: '🫒', name: 'Ege Kâşifi', desc: 'Ege’de 10 yer gez', need: 10, count: inRegion(1) },
  { id: 'akdeniz', icon: '🍊', name: 'Akdeniz Kâşifi', desc: 'Akdeniz’de 10 yer gez', need: 10, count: inRegion(2) },
  { id: 'icanadolu', icon: '🌾', name: 'İç Anadolu Kâşifi', desc: 'İç Anadolu’da 10 yer gez', need: 10, count: inRegion(3) },
  { id: 'karadeniz', icon: '🌿', name: 'Karadeniz Kâşifi', desc: 'Karadeniz’de 10 yer gez', need: 10, count: inRegion(4) },
  { id: 'dogu', icon: '🏔', name: 'Doğu Anadolu Kâşifi', desc: 'Doğu Anadolu’da 10 yer gez', need: 10, count: inRegion(5) },
  { id: 'guneydogu', icon: '🏺', name: 'Güneydoğu Kâşifi', desc: 'Güneydoğu Anadolu’da 10 yer gez', need: 10, count: inRegion(6) },
  { id: 'il10', icon: '🗺', name: '10 İl Gezgini', desc: '10 farklı ilde yer gez', need: 10, count: (c) => new Set(c.visited.map((p) => p.il)).size },
  { id: 'tur', icon: '🎯', name: 'Türkiye Turu', desc: 'Haritada yeri olan her ilde en az bir yer gez', need: (c) => new Set(c.all.map((p) => p.il)).size, count: (c) => new Set(c.visited.map((p) => p.il)).size },
  { id: 'yorum', icon: '✍️', name: 'Yorumcu', desc: '10 yorum yaz', need: 10, count: (c) => c.reviews },
  { id: 'foto', icon: '📸', name: 'Fotoğrafçı', desc: '10 fotoğraf paylaş', need: 10, count: (c) => c.photos },
];
export const earned = (c: BadgeCtx) => BADGES.filter((b) => b.count(c) >= needOf(b, c)).map((b) => b.id);
