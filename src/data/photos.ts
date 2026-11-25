import raw from './photos.json';
/* Yer fotoğrafları: Wikimedia Commons'tan serbest lisanslı (fotoğrafçı + lisans gösterilir).
   Görsel, Commons'un istenen genişlikte küçük kopya veren adresinden yüklenir. */
const D = raw as unknown as Record<string, [string, string, string]>;
export type PlacePhoto = { file: string; author: string; license: string; url: (w: number) => string; page: string };
/* Wikimedia, kendini tanıtmayan istemcileri (Android'in varsayılan okhttp kimliği) 403 ile reddediyor:
   https://w.wiki/4wJS — bu yüzden görsel isteklerine uygulamanın adını taşıyan bir User-Agent eklenir. */
export const PHOTO_HEADERS = { 'User-Agent': 'TurkiyeGeziRehberi/1.0 (https://turkiye-gezi-rehberi-yeb7.netlify.app; Android app)' };
export const photoSrc = (uri: string) => ({ uri, headers: PHOTO_HEADERS });
const STEPS = [120, 250, 330, 500, 960, 1280];   // Commons'un önbellekte tuttuğu standart genişlikler
export function photoOf(id: string): PlacePhoto | null {
  const d = D[id]; if (!d) return null;
  const [file, author, license] = d;
  const enc = encodeURIComponent(file.replace(/ /g, '_'));
  return {
    file, author, license,
    url: (w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}?width=${STEPS.find((s) => s >= w) || 1280}`,
    page: `https://commons.wikimedia.org/wiki/File:${enc}`,
  };
}
