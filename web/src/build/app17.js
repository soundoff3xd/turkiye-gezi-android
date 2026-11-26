/* ---------- panel geçiş animasyonları: görünüm değişince yöne göre kayarak gelir ---------- */
(() => {
  const RANK = { listv: 0, photov: 1, detailv: 2, profv: 2, pendv: 2, xv: 2 };
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shown = 'listv';
  /* sayfa değişirken kısa bir an beliren yükleme yıldızı */
  const rays = Array.from({ length: 12 }, (_, i) => `<rect x="-1.9" y="-27" width="3.8" height="11" rx="1.9" transform="rotate(${i * 30})" opacity="${(0.12 + 0.88 * i / 11).toFixed(2)}"/>`).join('');
  document.body.insertAdjacentHTML('beforeend', `<div id="ploader" aria-hidden="true"><div class="plcard"><svg viewBox="-30 -30 60 60" width="52" height="52"><g class="plrays">${rays}</g><g class="plpin"><path d="M0-9a7 7 0 0 1 7 7c0 5-7 11-7 11s-7-6-7-11a7 7 0 0 1 7-7z"/><circle cy="-2" r="2.4" fill="var(--surface)"/></g></svg></div></div>`);
  let plTimer = 0;
  const flash = () => {
    if (still()) return;
    const el = $('ploader'), panel = $('panel').getBoundingClientRect();
    el.style.left = (panel.left + panel.width / 2) + 'px';
    el.style.top = (panel.top + Math.min(panel.height, innerHeight - panel.top) / 2) + 'px';
    el.classList.remove('out'); el.classList.add('on');
    clearTimeout(plTimer);
    plTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.classList.remove('on', 'out'), 230); }, 480);
  };
  const play = (el, cls) => {
    el.classList.remove('vin-r', 'vin-l', 'vin-u');
    void el.offsetWidth;                       // animasyonu yeniden başlat
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  };
  const stagger = el => {
    el.querySelectorAll('.pgrid .pcard, #rows > li').forEach((c, i) => {
      if (i > 14) return;
      c.style.setProperty('--i', i);
      c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    });
  };
  new MutationObserver(ms => {
    for (const m of ms) {
      const el = m.target;
      if (el.hidden || !(el.id in RANK) || el.id === shown) continue;
      const prev = shown; shown = el.id;
      if (still()) continue;
      const d = RANK[el.id] - RANK[prev];
      play(el, d > 0 ? 'vin-r' : d < 0 ? 'vin-l' : 'vin-u');
      flash();
      if (el.id === 'photov' || (el.id === 'listv' && prev === 'photov')) stagger(el);
    }
  }).observe($('panel'), { subtree: true, attributes: true, attributeFilter: ['hidden'] });

  /* Yerler / Fotoğraf vitrini seçicisinde vurgu kayarak yer değiştirir */
  const slideSeg = (from, to) => {
    document.querySelectorAll('.seg').forEach(s => {
      if (s.offsetParent === null) return;
      s.dataset.m = from; void s.offsetWidth; s.dataset.m = to;
    });
  };
  const baseShowPhotos = showPhotos;
  showPhotos = function (on) {
    const from = S.pmode || 'places';
    baseShowPhotos(on);
    if (!still()) requestAnimationFrame(() => slideSeg(from, on ? 'photos' : 'places'));
    else document.querySelectorAll('.seg').forEach(s => { s.dataset.m = on ? 'photos' : 'places'; });
  };
  // ilk çizimde vurgu doğru tarafta dursun
  new MutationObserver(() => document.querySelectorAll('.seg:not([data-m])').forEach(s => { s.dataset.m = S.pmode || 'places'; }))
    .observe($('panel'), { subtree: true, childList: true });
})();
