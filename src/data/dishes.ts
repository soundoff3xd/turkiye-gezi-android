import raw from './dishes.json';
/* il → yöresel lezzetler: [Türkçe adı, İngilizce kısa açıklama] */
const D = raw as unknown as Record<string, [string, string][]>;
export const dishesOf = (il: string): [string, string][] => D[il] || [];
