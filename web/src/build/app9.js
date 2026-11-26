/* ---------- hesap menüsü ve "Bize destek olun" ----------
   KURULUM: Bağış bilgilerinizi yalnızca buraya yazın.
   Kart bilgisi bu uygulamada asla alınmaz; ödeme, lisanslı bir ödeme kuruluşunun (ör. iyzico, PayTR, Shopier)
   güvenli ödeme sayfasında yapılır.
   url: kartla ödeme sayfanızın / ödeme linkinizin adresi. Adreste {amount} geçerse seçilen tutarla değiştirilir.
   monthlyUrl: aylık (abonelik) ödeme için ayrı bir link varsa (boşsa url kullanılır). */
const SUPPORT = { url: '', monthlyUrl: '', currency: '₺', amounts: [50, 100, 250, 500] };

/* hesap menüsü */
function toggleMenu(open) {
  const m = $('acctmenu'), on = open ?? m.hidden;
  m.hidden = !on; $('acct').setAttribute('aria-expanded', String(on));
  if (on) {
    $('amhead').innerHTML = CUR ? `${avHTML(CUR.name, CUR.av)}<div style="min-width:0"><b>${esc(CUR.name)}</b><div class="count" style="overflow:hidden;text-overflow:ellipsis">${esc(CUR.email)}</div></div>` : '';
    m.querySelector('[role="menuitem"]').focus();
  }
}
$('acct').setAttribute('aria-haspopup', 'menu'); $('acct').setAttribute('aria-controls', 'acctmenu'); $('acct').setAttribute('aria-expanded', 'false');
document.addEventListener('click', e => { if (!$('acctmenu').hidden && !e.target.closest('#acctmenu,#acct')) toggleMenu(false); });
$('acctmenu').addEventListener('keydown', e => {
  const items = [...$('acctmenu').querySelectorAll('[role="menuitem"]')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  if (e.key === 'Escape') { toggleMenu(false); $('acct').focus(); }
});

/* destek penceresi */
const sup = { amount: 100, custom: '', freq: 'once' };
const sdl = $('support');
const supAmount = () => sup.amount === 'custom' ? Math.max(0, Math.round(+sup.custom || 0)) : sup.amount;
function renderSupport() {
  const cur = SUPPORT.currency, a = supAmount();
  $('supamts').innerHTML = SUPPORT.amounts.map(v => `<button type="button" class="chip" data-a="supamt" data-v="${v}" aria-pressed="${sup.amount === v}">${fmt(v)} ${cur}</button>`).join('')
    + `<button type="button" class="chip" data-a="supamt" data-v="custom" aria-pressed="${sup.amount === 'custom'}">Diğer tutar</button>`;
  $('supcustom').hidden = sup.amount !== 'custom';
  document.querySelectorAll('#support [data-a="supfreq"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === sup.freq)));
  $('supgo').disabled = !a;
  $('supgo').textContent = a ? `${fmt(a)} ${cur} ile destek ol` : 'Bir tutar seç';
  $('supsetup').hidden = !!SUPPORT.url;
}
function openSupport() {
  toggleMenu(false); renderSupport();
  sdl.showModal ? sdl.showModal() : sdl.setAttribute('open', '');
}
$('supcustom').addEventListener('input', e => { sup.custom = e.target.value.replace(/[^\d]/g, '').slice(0, 6); e.target.value = sup.custom; renderSupport(); });

Object.assign(A, {
  acct: () => CUR ? toggleMenu() : openAuth('in'),
  mprofile: () => { toggleMenu(false); showProfile(true); },
  msupport: openSupport,
  mlogout: () => { toggleMenu(false); logout(); },
  supclose: () => { sdl.close ? sdl.close() : sdl.removeAttribute('open'); },
  supamt: v => { sup.amount = v === 'custom' ? 'custom' : +v; renderSupport(); if (v === 'custom') $('supcustom').focus(); },
  supfreq: v => { sup.freq = v; renderSupport(); },
  supgo: () => {
    const base = sup.freq === 'monthly' && SUPPORT.monthlyUrl ? SUPPORT.monthlyUrl : SUPPORT.url;
    if (!base) { $('supsetup').hidden = false; $('supsetup').scrollIntoView({ block: 'nearest' }); return; }
    const a = document.createElement('a');
    a.href = base.replace('{amount}', String(supAmount())); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Ödeme sayfası yeni sekmede açılıyor');
  }
});
