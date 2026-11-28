/* ===== aşama 12: yeni logo (konum iğnesi + ay-yıldız), açılış animasyonu, arka plansız "atom" yükleme animasyonu ===== */
const BRAND = { bg: '#1E1A1A', pin: '#E0453A', em: '#FFF6EE' };
const CRES_D = R => { const r = R * 0.8, d = R * 0.5, x = (R * R - r * r + d * d) / (2 * d), y = Math.sqrt(R * R - x * x); return `M${x.toFixed(3)},${(-y).toFixed(3)} A${R},${R} 0 1 0 ${x.toFixed(3)},${y.toFixed(3)} A${r},${r} 0 1 1 ${x.toFixed(3)},${(-y).toFixed(3)}Z`; };
const STAR_D = R => { const p = []; for (let i = 0; i < 10; i++) { const a = Math.PI + i * Math.PI / 5, rr = i % 2 ? R * 0.4 : R; p.push((rr * Math.cos(a)).toFixed(3) + ',' + (rr * Math.sin(a)).toFixed(3)); } return 'M' + p.join('L') + 'Z'; };
const PIN_D = 'M0,0 C-6,-8 -10,-12 -10,-18 A10,10 0 1 1 10,-18 C10,-12 6,-8 0,0Z', EM_R = 12.5 / 2.2;
const logoPinSVG = h => `<svg width="${(h * 20.5 / 28).toFixed(1)}" height="${h}" viewBox="-10.25 -28.1 20.5 28.2" aria-hidden="true"><path d="${PIN_D}" fill="${BRAND.pin}"/><g fill="${BRAND.em}"><path transform="translate(${(-EM_R * 0.16).toFixed(3)},-18)" d="${CRES_D(EM_R)}"/><path transform="translate(${(EM_R * 0.6).toFixed(3)},-18)" d="${STAR_D(EM_R * 0.37)}"/></g></svg>`;

/* --- sekme simgesi --- */
(function favicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${BRAND.bg}"/><g transform="translate(50,88) scale(2.55)"><path d="${PIN_D}" fill="${BRAND.pin}"/><g fill="${BRAND.em}"><path transform="translate(${(-EM_R * 0.16).toFixed(3)},-18)" d="${CRES_D(EM_R)}"/><path transform="translate(${(EM_R * 0.6).toFixed(3)},-18)" d="${STAR_D(EM_R * 0.37)}"/></g></g></svg>`;
  const href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  for (const rel of ['icon', 'apple-touch-icon']) { let l = document.querySelector(`link[rel="${rel}"]`); if (!l) { l = document.createElement('link'); l.rel = rel; document.head.appendChild(l); } l.href = href; }
})();

/* --- açılış ekranı: sayfa inerken görünen statik #intro0, betik çalışınca üstte kalabilmesi için <dialog>'a taşınır ---
   Logo zıplar, yere değince jöle gibi basılıp toparlanır; altından halka yayılır. */
(function intro() {
  const src = $('intro0'); if (!src) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { src.remove(); return; }
  const dlg = document.createElement('dialog'); dlg.id = 'intro'; dlg.setAttribute('aria-hidden', 'true');
  dlg.appendChild(src.firstElementChild); src.remove(); document.body.appendChild(dlg);
  try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); }
  dlg.addEventListener('cancel', e => e.preventDefault());
  let closing = false;
  const done = () => { if (closing) return; closing = true; const wait = Math.max(0, 1100 - performance.now()); setTimeout(() => { dlg.classList.add('out'); setTimeout(() => { try { dlg.close(); } catch (_) { } dlg.remove(); }, 420); }, wait); };
  if (document.readyState === 'complete') done(); else addEventListener('load', done, { once: true });
  setTimeout(done, 3000);
})();

/* giriş penceresindeki küçük logo */
document.querySelectorAll('.wlogo').forEach(el => { el.innerHTML = logoPinSVG(34); });

/* --- yükleme: yandan görülen atom, hilal ve yıldızlar yörüngede döner ve yaylanarak esner; arkasında kart yok --- */
const ATOM = [
  { rx: 32, tilt: 0.34, roll: -25, speed: 0.42, bodies: [{ k: 'c', s: 8.5, ph: 0 }, { k: 's', s: 6, ph: 0.5 }] },
  { rx: 32, tilt: 0.34, roll: 30, speed: 0.34, bodies: [{ k: 's', s: 7, ph: 0.2 }, { k: 'c', s: 7.5, ph: 0.7 }] },
  { rx: 22, tilt: 0.4, roll: 90, speed: 0.55, bodies: [{ k: 's', s: 5.5, ph: 0.35 }] },
];
function mountAtom(el, size) {
  const NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', size); svg.setAttribute('height', size); svg.setAttribute('viewBox', '-50 -50 100 100'); svg.setAttribute('aria-hidden', 'true');
  const world = document.createElementNS(NS, 'g'), back = document.createElementNS(NS, 'g'), front = document.createElementNS(NS, 'g');
  world.append(back, front); svg.appendChild(world); el.appendChild(svg);
  const items = [];
  ATOM.forEach((o, oi) => o.bodies.forEach((b, bi) => {
    const g = document.createElementNS(NS, 'g'), p = document.createElementNS(NS, 'path');
    p.setAttribute('d', b.k === 's' ? STAR_D(b.s) : CRES_D(b.s)); g.appendChild(p);
    items.push({ o, b, g, seed: oi * 1.7 + bi * 2.3, spin: b.k === 's' ? 1 : -0.6, str: { x: 0, v: 0 }, lean: { x: 0, v: 0 }, px: null, dir: 0, rot: (oi * 1.7 + bi * 2.3) * 40, layer: null });
  }));
  const spring = (st, target, dt, k, c) => { st.v += (k * (target - st.x) - c * st.v) * dt; st.x += st.v * dt; return st.x; };
  const wobS = { x: 0, v: 0 }; let last = null;
  return {
    color(c) { svg.style.fill = c; },
    tick(t) {
      const dt = Math.min(0.05, last == null ? 0.016 : t - last); last = t;
      const wob = spring(wobS, Math.sin(t * 0.9) * 5, dt, 6, 3.5);
      world.setAttribute('transform', `rotate(${wob.toFixed(3)}) translate(0,${(Math.sin(t * 1.1) * 1.4).toFixed(3)})`);
      for (const it of items) {
        const { o, b } = it;
        let a = (t * o.speed + b.ph) * TAU; a += 0.3 * Math.sin(a);
        const x0 = Math.cos(a) * o.rx, y0 = Math.sin(a) * o.rx * o.tilt, z = Math.sin(a);
        const rr = o.roll * Math.PI / 180, x = x0 * Math.cos(rr) - y0 * Math.sin(rr), y = x0 * Math.sin(rr) + y0 * Math.cos(rr);
        const d0 = (z + 1) / 2, depth = d0 * d0 * (3 - 2 * d0), sc = 0.6 + 0.5 * depth;
        let spd = 0;
        if (it.px) { const vx = (x - it.px[0]) / dt, vy = (y - it.px[1]) / dt; spd = Math.hypot(vx, vy); if (spd > 0.5) { let dd = Math.atan2(vy, vx) - it.dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); it.dir += dd * Math.min(1, dt * 10); } }
        it.px = [x, y];
        const stretch = spring(it.str, Math.min(0.3, spd / 380), dt, 70, 7), lean = spring(it.lean, Math.sin(a) * 0.25, dt, 40, 5);
        it.rot += dt * 70 * it.spin;
        const dirDeg = it.dir * 57.2958;
        it.g.setAttribute('transform', `translate(${x.toFixed(3)},${y.toFixed(3)}) rotate(${dirDeg.toFixed(2)}) scale(${(sc * (1 + stretch)).toFixed(4)},${(sc * (1 - stretch * 0.6)).toFixed(4)}) rotate(${(it.rot + lean * 57.3 - dirDeg).toFixed(2)})`);
        it.g.setAttribute('opacity', (0.32 + 0.68 * depth).toFixed(3));
        const layer = z < 0 ? back : front; if (layer !== it.layer) { layer.appendChild(it.g); it.layer = layer; }
      }
    },
  };
}
const darkBg = () => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+/g); if (!c) return false; const [r, g, b] = c.map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) < 128; };
(function pageLoaderAtom() {
  const pl = $('ploader'); if (!pl) return;
  pl.innerHTML = '<div class="plcard"></div>';
  const atom = mountAtom(pl.firstChild, 72);
  let raf = 0;
  const loop = now => { atom.tick(now / 1000); raf = pl.classList.contains('on') ? requestAnimationFrame(loop) : 0; };
  new MutationObserver(() => {
    if (pl.classList.contains('on') && !raf) { atom.color(darkBg() ? '#F0806B' : '#C0392B'); raf = requestAnimationFrame(loop); }
  }).observe(pl, { attributes: true, attributeFilter: ['class'] });
})();
