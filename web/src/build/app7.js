/* ---------- yatay çip satırlarında fare desteği: tekerlek ve sürükleme ---------- */
document.addEventListener('wheel', e => {
  const c = e.target.closest && e.target.closest('.chips');
  if (!c || c.scrollWidth <= c.clientWidth + 1 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const before = c.scrollLeft; c.scrollLeft += e.deltaY;
  if (c.scrollLeft !== before) e.preventDefault();
}, { passive: false });
let chipDrag = null;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  const c = e.target.closest('.chips');
  if (c && c.scrollWidth > c.clientWidth + 1) chipDrag = { c, x: e.clientX, left: c.scrollLeft, moved: 0 };
});
document.addEventListener('pointermove', e => {
  if (!chipDrag) return;
  const dx = e.clientX - chipDrag.x; chipDrag.moved = Math.max(chipDrag.moved, Math.abs(dx));
  if (chipDrag.moved > 5) { chipDrag.c.classList.add('dragging'); chipDrag.c.scrollLeft = chipDrag.left - dx; }
});
document.addEventListener('pointerup', () => {
  if (!chipDrag) return;
  const d = chipDrag; d.c.classList.remove('dragging'); chipDrag = null;
  if (d.moved > 5) { const stop = ev => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, true), 0); }
});
