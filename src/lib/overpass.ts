/* OpenStreetMap Overpass sorgusu doğrudan telefondan: bulut sunucularının IP'leri Overpass'ta sık sık engelleniyor (406),
   telefonun kendi bağlantısı engellenmiyor. Kurallara uygun olarak tanıtıcı User-Agent ve Referer gönderilir. */
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
export const OSM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'User-Agent': 'TurkiyeGeziRehberi/1.0 (https://turkiye-gezi-rehberi-yeb7.netlify.app; Android app)',
  Referer: 'https://turkiye-gezi-rehberi-yeb7.netlify.app/',
};

export async function overpass(q: string, timeoutMs = 15000): Promise<any[]> {
  let last: unknown = null;
  for (const u of MIRRORS) {
    const ctl = new AbortController();
    const h = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(u, { method: 'POST', headers: OSM_HEADERS, body: 'data=' + encodeURIComponent(q), signal: ctl.signal });
      if (r.ok) { const j = await r.json(); return j.elements || []; }
      last = new Error(`overpass ${r.status}`);
    } catch (e) { last = e; } finally { clearTimeout(h); }
  }
  throw last || new Error('overpass');
}

/* çizgiyi parçalara böl, her parçanın kutusunu (yarıçap kadar genişletilmiş) döndür: "güney,batı,kuzey,doğu" */
export function lineBoxes(line: [number, number][], r: number, per = 5) {
  const boxes: string[] = [];
  const pts = line.length === 1 ? [line[0], line[0]] : line;
  for (let i = 0; i < pts.length - 1; i += per) {
    const part = pts.slice(i, i + per + 1), xs = part.map((p) => p[0]), ys = part.map((p) => p[1]);
    const py = r / 110540, px = r / (111320 * Math.cos((ys[0] * Math.PI) / 180));
    boxes.push(`${(Math.min(...ys) - py).toFixed(5)},${(Math.min(...xs) - px).toFixed(5)},${(Math.max(...ys) + py).toFixed(5)},${(Math.max(...xs) + px).toFixed(5)}`);
  }
  return boxes;
}

export const OSM_Q: Record<string, string> = {
  fuel: '[amenity=fuel]',
  food: '[amenity~"^(restaurant|fast_food)$"]',
  cafe: '[amenity=cafe]',
  wc: '[amenity=toilets]',
  rest: '[highway~"^(rest_area|services)$"]',
  hospital: '[amenity~"^(hospital|clinic)$"]',
  pharmacy: '[amenity=pharmacy]',
  police: '[amenity=police]',
};
export function osmKind(t: Record<string, string>) {
  const a = t.amenity;
  return a === 'fuel' ? 'fuel' : a === 'toilets' ? 'wc' : a === 'cafe' ? 'cafe' : a === 'restaurant' || a === 'fast_food' ? 'food'
    : a === 'hospital' || a === 'clinic' ? 'hospital' : a === 'pharmacy' ? 'pharmacy' : a === 'police' ? 'police'
    : t.highway === 'rest_area' || t.highway === 'services' ? 'rest' : '';
}
export type OsmItem = { k: string; n: string; lat: number; lng: number; h?: number; ph?: string; em?: number };
/* kutulardaki istenen türler; tekrarları ve kapalı/özel olanları eler */
export async function osmInBoxes(boxes: string[], kinds: string[]): Promise<OsmItem[]> {
  const q = `[out:json][timeout:20];(${boxes.map((bb) => kinds.map((k) => `nwr${OSM_Q[k]}(${bb});`).join('')).join('')});out center 4000;`;
  const els = await overpass(q, 20000);
  const seen = new Set<string>(), out: OsmItem[] = [];
  for (const e of els) {
    const key = `${e.type}${e.id}`; if (seen.has(key)) continue; seen.add(key);
    const t = e.tags || {}, la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la == null || lo == null || t.access === 'private' || t.access === 'no') continue;
    const k = osmKind(t);
    if (!k || !kinds.includes(k)) continue;
    out.push({ k, n: String(t.name || t.brand || t.operator || '').slice(0, 80), lat: +la, lng: +lo, h: t.opening_hours === '24/7' ? 1 : undefined, ph: t.phone || t['contact:phone'] || undefined, em: t.emergency === 'yes' ? 1 : undefined });
  }
  return out;
}
