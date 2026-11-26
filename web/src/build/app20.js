/* ===== aşama 3: çevrimdışı kullanım (sw.js yayındaki sitede çalışır) ===== */
(function offline() {
  if ((location.protocol === 'https:' || location.hostname === 'localhost') && 'serviceWorker' in navigator) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
  }
  const bar = document.createElement('div'); bar.id = 'offbar'; bar.setAttribute('role', 'status'); bar.hidden = navigator.onLine !== false;
  bar.innerHTML = '<span aria-hidden="true">📴</span> <span>Çevrimdışısın. Daha önce açtığın harita bölgeleri ve yerler görünür; yorum ve paylaşım için internet gerekir.</span>';
  document.body.appendChild(bar);
  const upd = () => { bar.hidden = navigator.onLine !== false; };
  addEventListener('online', () => { upd(); try { notePoll(); } catch (_) { } }); addEventListener('offline', upd);
})();
