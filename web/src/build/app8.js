/* ---------- harita stilleri, katmanlar, ölçek çubuğu ---------- */
const MS = { style: 'std', prov: true, labels: true, lakes: true };
try { Object.assign(MS, JSON.parse(localStorage.getItem('gezi-mapstyle') || '{}')); } catch (_) { }
function applyMapStyle() {
  const w = $('mapwrap');
  w.classList.remove('st-std', 'st-dark', 'st-plain'); w.classList.add('st-' + MS.style);
  w.classList.toggle('no-prov', !MS.prov); w.classList.toggle('no-labels', !MS.labels); w.classList.toggle('no-lakes', !MS.lakes);
  document.querySelectorAll('#layerpanel input[name="mstyle"]').forEach(i => { i.checked = i.value === MS.style; });
  $('lyprov').checked = MS.prov; $('lylabels').checked = MS.labels; $('lylakes').checked = MS.lakes;
  try { localStorage.setItem('gezi-mapstyle', JSON.stringify(MS)); } catch (_) { }
}
function toggleLayers(open) {
  const p = $('layerpanel'), on = open ?? p.hidden;
  p.hidden = !on; $('layersbtn').setAttribute('aria-expanded', String(on));
  if (on) p.querySelector('input:checked')?.focus();
}
$('layerpanel').addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'mstyle') MS.style = t.value;
  if (t.id === 'lyprov') MS.prov = t.checked;
  if (t.id === 'lylabels') MS.labels = t.checked;
  if (t.id === 'lylakes') MS.lakes = t.checked;
  applyMapStyle();
});
document.addEventListener('click', e => {
  const p = $('layerpanel');
  if (!p.hidden && !e.target.closest('#layerpanel,#layersbtn')) toggleLayers(false);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('layerpanel').hidden) { toggleLayers(false); $('layersbtn').focus(); } });

/* ölçek çubuğu: ekranın ortasındaki enlemde 1 piksel kaç metre */
function renderScale() {
  const r = viewRect(), uy = (r.y + r.h / 2 - V.ty) / V.s;
  const lat = toLatLng(0, uy)[0];
  const mPerPx = 156543.03 * Math.cos(lat * Math.PI / 180) / Math.pow(2, GEO.z) / V.s;
  const maxM = mPerPx * 110, p10 = Math.pow(10, Math.floor(Math.log10(maxM)));
  const nice = [5, 2, 1].map(k => k * p10).find(v => v <= maxM) || p10;
  const label = nice >= 1000 ? fmt(nice / 1000) + ' km' : fmt(nice) + ' m';
  $('scale').style.width = Math.round(nice / mPerPx) + 'px';
  $('scale').firstChild.nodeValue = label;
}
const baseRender3 = render;
render = function () { baseRender3(); renderScale(); };

Object.assign(A, {
  layers: () => toggleLayers(),
  home: () => fitTurkey(true)
});
applyMapStyle();
