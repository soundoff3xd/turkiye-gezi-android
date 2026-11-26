/* ---------- mobil alt panel: parmakla sürükle, bırakınca en yakın konuma otur ---------- */
(function sheetDrag() {
  const grip = $('grip'), panel = $('panel');
  let drag = null;
  const snaps = () => {
    const full = Math.round(innerHeight - ($('top').offsetHeight || 60) - 24);
    const half = Math.round(innerHeight * (S.sel ? 0.62 : 0.46));
    return [[64, 'c'], [half, 'h'], [full, 'f']];
  };
  const start = e => {
    if (wide() || (e.button != null && e.button !== 0)) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    drag = { y0: y, h0: panel.getBoundingClientRect().height, t0: performance.now(), moved: false, last: [[performance.now(), y]] };
  };
  const move = e => {
    if (!drag) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY, dy = y - drag.y0;
    if (!drag.moved && Math.abs(dy) < 6) return;
    if (!drag.moved) { drag.moved = true; panel.classList.add('dragging'); }
    if (e.cancelable) e.preventDefault();
    const [[mn], , [mx]] = snaps();
    let h = drag.h0 - dy;
    if (h < mn) h = mn - (mn - h) * 0.3; else if (h > mx) h = mx + (h - mx) * 0.3;   // kenarda yumuşak direnç
    S.dragH = Math.round(h);
    document.documentElement.style.setProperty('--sheet', S.dragH + 'px');
    drag.last.push([performance.now(), y]); if (drag.last.length > 5) drag.last.shift();
  };
  const end = () => {
    if (!drag) return;
    const d = drag; drag = null;
    panel.classList.remove('dragging');
    if (!d.moved) return;
    S.gripDragged = true; setTimeout(() => { S.gripDragged = false; }, 350);
    const [a, b] = [d.last[0], d.last[d.last.length - 1]];
    const v = (b[1] - a[1]) / Math.max(1, b[0] - a[0]);          // px/ms, + aşağı
    const h = S.dragH || d.h0, ss = snaps();
    let pick;
    const sorted = ss.slice().sort((x, y) => x[0] - y[0]), dy = h - d.h0;
    if (Math.abs(v) > 0.6) {                                         // hızlı fırlatma: o yöndeki bir sonraki konum
      pick = v < 0 ? (sorted.find(x => x[0] > h + 10) || sorted[sorted.length - 1]) : (sorted.slice().reverse().find(x => x[0] < h - 10) || sorted[0]);
    } else if (Math.abs(dy) > 60) {                                  // yavaş ama belirgin sürükleme: başlangıçtan o yöndeki bir sonraki konum
      pick = dy > 0 ? (sorted.find(x => x[0] > d.h0 + 10) || sorted[sorted.length - 1]) : (sorted.slice().reverse().find(x => x[0] < d.h0 - 10) || sorted[0]);
    } else pick = ss.reduce((best, x) => Math.abs(x[0] - h) < Math.abs(best[0] - h) ? x : best, ss[0]);
    S.dragH = 0;
    S.collapsed = pick[1] === 'c'; S.full = pick[1] === 'f';
    setSheet(); setTimeout(draw, 320);
  };
  grip.addEventListener('touchstart', start, { passive: true });
  grip.addEventListener('touchmove', move, { passive: false });
  grip.addEventListener('touchend', end); grip.addEventListener('touchcancel', end);
  grip.addEventListener('mousedown', start);
  addEventListener('mousemove', e => { if (drag && !e.touches) move(e); });
  addEventListener('mouseup', () => { if (drag) end(); });
  // panelin üst kısmından (başlık, sekmeler) da sürüklenebilsin: içerik en üstteyken aşağı çekince panel iner
  panel.addEventListener('touchstart', e => {
    if (wide() || e.target.closest('#grip')) return;
    const sc = e.target.closest('.vs, #list, #detail, #prof, #pend, #photos, #xbody');
    if (sc && sc.scrollTop > 0) return;
    if (e.target.closest('input,textarea,select,button,a,label,.chips,.wrapc')) return;
    start(e); if (drag) drag.soft = true;
  }, { passive: true });
  panel.addEventListener('touchmove', e => {
    if (!drag || !drag.soft) return;
    const dy = e.touches[0].clientY - drag.y0;
    if (!drag.moved && dy < 0 && S.full) { drag = null; return; }   // tam boyda yukarı kaydırma içeriği kaydırır
    move(e);
  }, { passive: false });
  panel.addEventListener('touchend', () => { if (drag && drag.soft) end(); });
  const sel0 = select; select = function (id) { S.full = false; S.dragH = 0; return sel0(id); };
  addEventListener('resize', () => { if (!wide()) setSheet(); });
})();
