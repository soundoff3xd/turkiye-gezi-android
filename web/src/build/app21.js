/* ===== aşama 4: yer fotoğrafları (Wikimedia Commons; PHOTOS derlemede başa eklenir) ===== */
const PH_STEPS = [120, 250, 330, 500, 960, 1280];
function photoOf(id) {
  const d = PHOTOS[id]; if (!d) return null;
  const enc = encodeURIComponent(d[0].replace(/ /g, '_'));
  return { file: d[0], author: d[1], license: d[2], page: `https://commons.wikimedia.org/wiki/File:${enc}`,
    url: w => `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}?width=${PH_STEPS.find(s => s >= w) || 1280}` };
}
const heroHTML = id => { const ph = photoOf(id); if (!ph) return '';
  return `<figure class="hero"><div class="hph"><img src="${esc(ph.url(Math.min(1280, (innerWidth > 900 ? 420 : innerWidth) * (devicePixelRatio || 1))))}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></div>
    <figcaption><a href="${esc(ph.page)}" target="_blank" rel="noopener" translate="no">📷 ${esc(ph.author)} · ${esc(ph.license)} · Wikimedia Commons</a></figcaption></figure>`; };
const rd21 = renderDetail;
renderDetail = function () {
  rd21();
  const back = $('detail').querySelector(':scope > .back'), h = S.sel && heroHTML(S.sel);
  if (back && h) back.insertAdjacentHTML('afterend', h);
};
const rl21 = renderList;
renderList = function () {
  rl21();
  $('rows').querySelectorAll('.row[data-v]').forEach(b => {
    const ph = photoOf(b.dataset.v), rank = b.querySelector('.rank');
    if (ph && rank && !b.querySelector('.rthumb')) rank.insertAdjacentHTML('afterend', `<img class="rthumb" src="${esc(ph.url(120))}" alt="" loading="lazy" decoding="async">`);
  });
};
