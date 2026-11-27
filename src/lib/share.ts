import { Share } from 'react-native';
import { SITE_URL } from './supabase';
import type { Place } from '../data/catalog';

/* Paylaş: bağlantı web sitesinde doğrudan o yeri açar */
export const placeLink = (id: string) => `${SITE_URL.replace(/\/$/, '')}/?yer=${encodeURIComponent(id)}`;
export async function sharePlace(p: Place, t: (s: string, ...a: any[]) => string) {
  const url = placeLink(p.id);
  try { await Share.share({ message: `${p.n} (${p.il}) · ${t('Türkiye Gezi Rehberi')}\n${url}`, title: p.n }); } catch { /* vazgeçti */ }
}

/* Gezi listesini bağlantıyla paylaş: ?gezi=id1,id2… açılınca "Listeme ekle" çıkar (site ve uygulama) */
export const tripLink = (ids: string[]) => `${SITE_URL.replace(/\/$/, '')}/?gezi=${ids.map(encodeURIComponent).join(',')}`;
export async function shareTrip(ids: string[], t: (s: string, ...a: any[]) => string, num: (n: number) => string) {
  try { await Share.share({ message: `${t('Gezi listem')} · ${t('{1} durak', num(ids.length))} · ${t('Türkiye Gezi Rehberi')}\n${tripLink(ids)}`, title: t('Gezi listem') }); } catch { /* vazgeçti */ }
}
/* gelen bağlantıyı çöz: site adresi veya turkiyegezi:// */
export function parseLink(url: string): { yer?: string; gezi?: string[]; gunluk?: string; rota?: { r: string; m: string | null; k: string | null } } | null {
  try {
    const u = new URL(url);
    const rota = u.searchParams.get('rota');
    if (rota) return { rota: { r: rota.slice(0, 2000), m: u.searchParams.get('m'), k: u.searchParams.get('k') } };
    const yer = u.searchParams.get('yer'), gezi = u.searchParams.get('gezi'), gl = u.searchParams.get('gunluk');
    if (gl && /^[0-9a-f-]{36}$/i.test(gl)) return { gunluk: gl };
    if (gezi) return { gezi: gezi.split(',').map((x) => x.trim()).filter((x) => /^[a-z0-9_-]{1,64}$/i.test(x)).slice(0, 24) };
    if (yer && /^[a-z0-9_-]{1,64}$/i.test(yer)) return { yer };
  } catch { /* geçersiz */ }
  return null;
}
