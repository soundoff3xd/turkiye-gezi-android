import { useEffect, useMemo, useState } from 'react';

/* Harita stilini indirip katman ayarlarını uygular (web sitesindeki "Katmanlar" ile aynı):
   il sınırları, yer adları (seçili dilde), göller. İndirilemezse stil adresi olduğu gibi kullanılır. */
export type MapLayers = { prov: boolean; labels: boolean; lakes: boolean };
export const DEFAULT_LAYERS: MapLayers = { prov: true, labels: true, lakes: true };
const cache: Record<string, any> = {};
const PROV_COLOR: Record<string, string> = { dark: '#C9A3BA', std: '#8E5A7A', plain: '#8E5A7A' };

export function useMapStyle(key: string, url: string, layers: MapLayers, lang: string) {
  const [base, setBase] = useState<any>(cache[url] || null);
  useEffect(() => {
    if (cache[url]) { setBase(cache[url]); return; }
    let live = true; setBase(null);
    fetch(url).then((r) => r.json()).then((j) => { cache[url] = j; if (live) setBase(j); }).catch(() => {});
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
    if (layers.lakes) add.push({ id: 'gz-lakes', type: 'fill', source: src, 'source-layer': 'water', filter: ['==', ['get', 'class'], 'lake'], paint: { 'fill-color': key === 'dark' ? '#2F6F99' : '#5AAEE0', 'fill-opacity': 0.55 } });
    if (layers.prov) add.push({ id: 'gz-prov', type: 'line', source: src, 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': PROV_COLOR[key] || PROV_COLOR.std, 'line-opacity': 0.6, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 9, 1.6], 'line-dasharray': [3, 2] } });
    out.splice(firstSym < 0 ? out.length : firstSym, 0, ...add);
    return { ...base, layers: out };
  }, [base, url, key, layers.prov, layers.labels, layers.lakes, lang]);
}
