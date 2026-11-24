import { Share } from 'react-native';
import { SITE_URL } from './supabase';
import type { Place } from '../data/catalog';

/* Paylaş: bağlantı web sitesinde doğrudan o yeri açar */
export const placeLink = (id: string) => `${SITE_URL.replace(/\/$/, '')}/?yer=${encodeURIComponent(id)}`;
export async function sharePlace(p: Place, t: (s: string, ...a: any[]) => string) {
  const url = placeLink(p.id);
  try { await Share.share({ message: `${p.n} (${p.il}) · ${t('Türkiye Gezi Rehberi')}\n${url}`, title: p.n }); } catch { /* vazgeçti */ }
}
