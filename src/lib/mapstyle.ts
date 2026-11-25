import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* Harita stilini indirip katman ayarlarını uygular (web sitesindeki "Katmanlar" ile aynı):
   il sınırları, yer adları (seçili dilde), göller. İndirilemezse stil adresi olduğu gibi kullanılır. */
/* MapTiler anahtarı (uydu görüntüsü). Uygulamanın içinde herkese görünür; gizli değildir. */
export const MAPTILER_KEY = '1432NtK8GRDf4990fbxd';
export type MapLayers = { prov: boolean; labels: boolean; lakes: boolean };
export const DEFAULT_LAYERS: MapLayers = { prov: true, labels: true, lakes: true };
const cache: Record<string, any> = {};
const PROV_COLOR: Record<string, string> = { dark: '#C9A3BA', std: '#8E5A7A', plain: '#8E5A7A', sat: '#F3D6E6' };

export function useMapStyle(key: string, url: string, layers: MapLayers, lang: string) {
  const [base, setBase] = useState<any>(cache[url] || null);
  useEffect(() => {
    if (cache[url]) { setBase(cache[url]); return; }
    let live = true; setBase(null);
    const key = `gezi-style-${url}`;
    fetch(url).then((r) => r.json()).then((j) => { cache[url] = j; if (live) setBase(j); AsyncStorage.setItem(key, JSON.stringify(j)).catch(() => {}); })
      // çevrimdışı: en son indirilen stil
      .catch(() => AsyncStorage.getItem(key).then((v: string | null) => { if (v && live) { const j = JSON.parse(v); cache[url] = j; setBase(j); } }).catch(() => {}));
    return () => { live = false; };
  }, [url]);
  return useMemo(() => {
    if (!base || !Array.isArray(base.layers)) return url;
    const field = lang === 'tr' ? ['get', 'name'] : ['coalesce', ['get', `name:${lang}`], ['get', 'name:latin'], ['get', 'name']];
    const named = (l: any) => l.type === 'symbol' && /name/.test(JSON.stringify(l.layout?.['text-field'] || ''));
    const out: any[] = base.layers.map((l: any) => (named(l)
      ? { ...l, layout: { ...l.layout, 'text-field': field, visibility: layers.labels ? 'visible' : 'none' } } : l));
    const src = Object.keys(base.sources || {}).find((k) => base.sources[k].type === 'vector') || 'openmaptiles';
    const firstSym = out.findIndex((l) => l.type === 'symbol');
    const add: any[] = [];
    // uydu: OpenFreeMap'in yazı katmanları kalır, altına MapTiler uydu görüntüsü girer, diğer çizimler gizlenir
    if (key === 'sat') {
      out.forEach((l, i) => { if (l.type !== 'symbol' && l.type !== 'background') out[i] = { ...l, layout: { ...(l.layout || {}), visibility: 'none' } }; });
      add.push({ id: 'gz-sat', type: 'raster', source: 'gz-sat' });
    }
    if (layers.lakes && key !== 'sat') add.push({ id: 'gz-lakes', type: 'fill', source: src, 'source-layer': 'water', filter: ['==', ['get', 'class'], 'lake'], paint: { 'fill-color': key === 'dark' ? '#2F6F99' : '#5AAEE0', 'fill-opacity': 0.55 } });
    if (layers.prov) add.push({ id: 'gz-prov', type: 'line', source: src, 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': PROV_COLOR[key] || PROV_COLOR.std, 'line-opacity': 0.6, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 9, 1.6], 'line-dasharray': [3, 2] } });
    out.splice(firstSym < 0 ? out.length : firstSym, 0, ...add);
    const sources = key === 'sat'
      ? { ...base.sources, 'gz-sat': { type: 'raster', tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`], tileSize: 512, maxzoom: 20, attribution: '© MapTiler © OpenStreetMap' } }
      : base.sources;
    return { ...base, sources, layers: out };
  }, [base, url, key, layers.prov, layers.labels, layers.lakes, lang]);
}
