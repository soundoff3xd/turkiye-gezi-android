import { OfflineManager } from '@maplibre/maplibre-react-native';
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/* Gezi listesindeki yerlerin çevresini çevrimdışı kullanmak için indir (MapLibre çevrimdışı paketi).
   Alan büyüdükçe en yüksek yakınlaştırma düşürülür; karo sayısı ~6000 ile sınırlı tutulur. */
export type Box = [number, number, number, number]; // batı, güney, doğu, kuzey
export function tripBox(pts: { lat: number; lng: number }[]): Box | null {
  if (!pts.length) return null;
  let w = 180, s = 90, e = -180, n = -90;
  pts.forEach((p) => { w = Math.min(w, p.lng); e = Math.max(e, p.lng); s = Math.min(s, p.lat); n = Math.max(n, p.lat); });
  const pad = 0.08; return [w - pad, s - pad, e + pad, n + pad];
}
const tiles = (b: Box, z: number) => {
  const x = (lng: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
  const y = (lat: number) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z); };
  return (x(b[2]) - x(b[0]) + 1) * (y(b[1]) - y(b[3]) + 1);
};
export function pickZoom(b: Box) {
  let z = 15, total = 0;
  while (z > 8) { total = 0; for (let i = 5; i <= z; i++) total += tiles(b, i); if (total <= 6000) break; z--; }
  return z;
}
const NAME = 'gezi-trip';
export async function packInfo(): Promise<{ state: string; pct: number } | null> {
  try {
    const packs: any[] = await (OfflineManager as any).getPacks();
    const p = packs.find((x) => (x.name || x.metadata?.name) === NAME);
    if (!p) return null;
    const st = p.status ? await p.status() : null;
    return { state: st?.state ?? 'complete', pct: Math.round(st?.percentage ?? 100) };
  } catch { return null; }
}
export async function deletePack() {
  try {
    const packs: any[] = await (OfflineManager as any).getPacks();
    for (const p of packs) if ((p.name || p.metadata?.name) === NAME) await (OfflineManager as any).deletePack(p.id ?? p.name);
  } catch { /* yok */ }
}
export async function downloadTrip(b: Box, onProgress: (pct: number, done: boolean) => void, onError: (m: string) => void) {
  await deletePack();
  const maxZoom = pickZoom(b);
  await (OfflineManager as any).createPack(
    { name: NAME, mapStyle: MAP_STYLE, bounds: b, minZoom: 5, maxZoom, metadata: { name: NAME, at: Date.now() } },
    (_pack: any, st: any) => { const pct = Math.round(st?.percentage ?? 0); onProgress(pct, st?.state === 'complete' || pct >= 100); },
    (_pack: any, err: any) => onError(String(err?.message || err || 'error')),
  );
}
