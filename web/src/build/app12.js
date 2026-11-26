/* ---------- gerçek harita (MapLibre + OpenFreeMap, uydu: MapTiler) ----------
   Yayındaki sitede gerçek sokak haritası açılır. Harita servislerine ulaşılamazsa
   (ör. claude.ai önizlemesi) sayfa içindeki vektör harita kullanılmaya devam eder.
   KURULUM: Uydu görüntüsü için MapTiler anahtarını aşağıya yazın (maptiler.com → Account → API keys).
   Anahtarı MapTiler panelinde yalnızca sitenizin adresine izin verecek şekilde kısıtlayın. */
const MAPTILER_KEY = (window.GEZI_CFG && window.GEZI_CFG.maptilerKey) || '1432NtK8GRDf4990fbxd';
const MLCFG = {
  js: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  css: 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  styles: { std: 'https://tiles.openfreemap.org/styles/liberty', dark: 'https://tiles.openfreemap.org/styles/dark', plain: 'https://tiles.openfreemap.org/styles/positron', sat: 'https://tiles.openfreemap.org/styles/liberty' },
  sat: k => `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${k}`
};
const ML = { on: false, map: null, styleUrl: '' };
const zoomOfS = s => Math.log2(s * 256 * Math.pow(2, GEO.z) / 512);
const sOfZoom = z => Math.pow(2, z) * 512 / (256 * Math.pow(2, GEO.z));

function mlSync() {
  const m = ML.map, c = m.getCenter(), p = m.project(c), [ux, uy] = proj(c.lng, c.lat);
  V.s = sOfZoom(m.getZoom()); V.tx = p.x - ux * V.s; V.ty = p.y - uy * V.s;
}
function mlPadding() {
  const r = viewRect(), W = MAP.clientWidth, H = MAP.clientHeight;
  return { top: r.y, left: r.x, right: Math.max(0, W - r.x - r.w), bottom: Math.max(0, H - r.y - r.h) };
}
const mlReduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
function mlLangField() {
  const l = window.LANG || 'tr';
  return l === 'tr' ? ['get', 'name'] : ['coalesce', ['get', 'name:' + l], ['get', 'name:latin'], ['get', 'name']];
}
function mlTune() {
  const m = ML.map; if (!m || !m.getStyle()) return;
  const layers = m.getStyle().layers || [], named = l => l.type === 'symbol' && /name/.test(JSON.stringify((l.layout || {})['text-field'] || ''));
  layers.forEach(l => {
    if (!named(l)) return;
    try { m.setLayoutProperty(l.id, 'text-field', mlLangField()); m.setLayoutProperty(l.id, 'visibility', MS.labels ? 'visible' : 'none'); } catch (_) { }
  });
  // göller katmanı (site ayarı: Katmanlar → Göller)
  try {
    const vsrc = Object.keys(m.getStyle().sources || {}).find(k => m.getStyle().sources[k].type === 'vector');
    if (vsrc && !m.getLayer('gz-lakes')) {
      const firstSym0 = layers.find(l => l.type === 'symbol');
      m.addLayer({ id: 'gz-lakes', type: 'fill', source: vsrc, 'source-layer': 'water', filter: ['==', ['get', 'class'], 'lake'], paint: { 'fill-color': MS.style === 'dark' ? '#2F6F99' : '#5AAEE0', 'fill-opacity': 0.55 } }, firstSym0 && firstSym0.id);
    }
    if (m.getLayer('gz-lakes')) m.setLayoutProperty('gz-lakes', 'visibility', MS.lakes ? 'visible' : 'none');
  } catch (_) { }
  const sat = MS.style === 'sat' && MAPTILER_KEY;
  if (sat && !m.getSource('sat')) {
    m.addSource('sat', { type: 'raster', tiles: [MLCFG.sat(MAPTILER_KEY)], tileSize: 512, maxzoom: 20, attribution: '© MapTiler © OpenStreetMap' });
    const firstSym = layers.find(l => l.type === 'symbol');
    m.addLayer({ id: 'sat', type: 'raster', source: 'sat' }, firstSym && firstSym.id);
  }
  layers.forEach(l => { if (l.type !== 'symbol' && l.id !== 'sat' && l.id !== 'gz-lakes' && l.type !== 'background') { try { m.setLayoutProperty(l.id, 'visibility', sat ? 'none' : 'visible'); } catch (_) { } } });
  $('credit').innerHTML = (sat ? '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">© MapTiler</a> ' : '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ')
    + '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
}
function mlApplyStyle() {
  if (!ML.on) return;
  if (MS.style === 'sat' && !MAPTILER_KEY) MS.style = 'std';
  const url = MLCFG.styles[MS.style] || MLCFG.styles.std;
  $('mapwrap').classList.toggle('ml-sat', MS.style === 'sat');
  if (url !== ML.styleUrl) { ML.styleUrl = url; ML.map.setStyle(url); } else mlTune();
}
function loadAsset(tag, attrs) {
  return new Promise((res, rej) => { const e = document.createElement(tag); Object.assign(e, attrs); e.onload = res; e.onerror = rej; document.head.appendChild(e); });
}

async function mlStart() {
  if (!window.fetch || !window.WebGLRenderingContext) return;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(MLCFG.styles.std, { signal: ctl.signal }); clearTimeout(t);
    if (!r.ok) return;
    await Promise.all([loadAsset('script', { src: MLCFG.js, crossOrigin: 'anonymous' }), loadAsset('link', { rel: 'stylesheet', href: MLCFG.css, crossOrigin: 'anonymous' })]);
  } catch (_) { return; }
  if (!window.maplibregl) return;
  if (MS.style === 'sat' && !MAPTILER_KEY) MS.style = 'std';
  const box = document.createElement('div'); box.id = 'ml'; MAP.prepend(box);
  const W = MAP.clientWidth, H = MAP.clientHeight, [lat, lng] = toLatLng((W / 2 - V.tx) / V.s, (H / 2 - V.ty) / V.s);
  let map;
  try {
    ML.styleUrl = MLCFG.styles[MS.style] || MLCFG.styles.std;
    map = new maplibregl.Map({
      container: box, style: ML.styleUrl, center: [lng, lat], zoom: zoomOfS(V.s), minZoom: 3.5, maxZoom: 19,
      dragRotate: false, pitchWithRotate: false, touchPitch: false, attributionControl: false, fadeDuration: 150
    });
  } catch (_) { box.remove(); return; }
  map.touchZoomRotate.disableRotation(); map.keyboard.disableRotation();
  ML.map = map;
  const giveUp = setTimeout(() => { if (!ML.on) { try { map.remove(); } catch (_) { } box.remove(); ML.map = null; } }, 15000);
  map.on('style.load', () => mlTune());
  map.once('load', () => {
    clearTimeout(giveUp);
    ML.on = true; window.ML_ON = true;
    MAP.classList.add('ml'); $('mapwrap').classList.add('ml');
    $('soptsat').hidden = !MAPTILER_KEY;
    mlTune(); mlApplyStyle(); mlSync(); render();
  });
  map.on('move', () => { if (!ML.on) return; mlSync(); render(); });
  map.on('movestart', e => { if (e.originalEvent) moved = 99; });
  map.on('resize', () => { if (ML.on) { mlSync(); render(); } });
}

/* mevcut harita işlemlerini gerçek haritaya yönlendir */
const flyTo0 = flyTo, zoomAt0 = zoomAt;
flyTo = function (ux, uy, s, animate = true) {
  if (!ML.on) return flyTo0(ux, uy, s, animate);
  const [lat, lng] = toLatLng(ux, uy);
  const opt = { center: [lng, lat], zoom: Math.min(19, Math.max(3.5, zoomOfS(s))), padding: mlPadding() };
  if (!animate || mlReduced()) ML.map.jumpTo(opt); else ML.map.easeTo({ ...opt, duration: 650 });
};
zoomAt = function (px, py, f) {
  if (!ML.on) return zoomAt0(px, py, f);
  ML.map.easeTo({ zoom: ML.map.getZoom() + Math.log2(f), around: ML.map.unproject([px, py]), duration: mlReduced() ? 0 : 250 });
};
const applyMapStyle0 = applyMapStyle;
applyMapStyle = function () { applyMapStyle0(); mlApplyStyle(); };
new MutationObserver(() => { if (ML.on) mlTune(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
MAP.addEventListener('pointerdown', () => { if (ML.on) moved = 0; }, true);
mlStart();
