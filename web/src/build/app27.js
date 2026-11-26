/* ===== aşama 7: destek paketleri (Shopier ürün bağlantıları) ve yasal sayfalar ===== */
/* app_settings:
   support_packages = [{"name":"Çay ısmarla","amount":50,"url":"https://www.shopier.com/..."}, ...]
   seller_name, seller_email, seller_address, seller_phone = yasal sayfalardaki satıcı bilgileri */
const PKG_DEF = [
  { icon: '☕', name: 'Çay ısmarla', amount: 50, note: 'Küçük ama çok değerli bir teşekkür' },
  { icon: '🎒', name: 'Destekçi paketi', amount: 150, note: 'Sunucu ve harita masraflarına katkı' },
  { icon: '🌟', name: 'Büyük destek', amount: 500, note: 'Yeni özelliklerin geliştirilmesine katkı' },
];
const SELLER = { name: '', email: '', address: '', phone: '' };
let PKGS = PKG_DEF.map(p => ({ ...p, url: '' }));
function applySupportSettings(m) {
  try {
    const raw = m.support_packages ? JSON.parse(m.support_packages) : null;
    if (Array.isArray(raw) && raw.length) PKGS = raw.slice(0, 6).map((p, i) => ({
      icon: String(p.icon || (PKG_DEF[i] || PKG_DEF[0]).icon).slice(0, 4), name: String(p.name || '').slice(0, 40), amount: +p.amount || 0,
      note: String(p.note || (PKG_DEF.find(d => d.name === p.name) || {}).note || '').slice(0, 120),
      url: /^https:\/\/(www\.)?shopier\.com\//.test(String(p.url || '')) || /^https:\/\//.test(String(p.url || '')) ? String(p.url) : '',
    })).filter(p => p.name && p.amount > 0);
  } catch (_) { }
  ['name', 'email', 'address', 'phone'].forEach(k => { if (m['seller_' + k]) SELLER[k] = String(m['seller_' + k]).slice(0, 300); });
  if (sdl.open) renderSupport();
}
function loadSupportSettings() {
  if (!ONLINE()) return;
  sb.from('app_settings').select('key,value').then(({ data }) => applySupportSettings(Object.fromEntries((data || []).map(r => [r.key, r.value]))), () => { });
}
setTimeout(loadSupportSettings, 1200);

/* destek penceresi: paket kartları; her biri ödeme sayfasını yeni sekmede açar */
renderSupport = function () {
  const seg = sdl.querySelector('.seg'); if (seg) seg.hidden = true;
  $('supcustom').hidden = true;
  const cur = SUPPORT.currency || '₺', ready = PKGS.some(p => p.url);
  $('supamts').className = 'pkgs';
  $('supamts').innerHTML = PKGS.map((p, i) => `<button type="button" class="pkg" data-a="suppkg" data-v="${i}"${p.url ? '' : ' disabled'}><span class="pkic" aria-hidden="true">${esc(p.icon)}</span><span class="pkt"><b>${esc(p.name)}</b>${p.note ? `<span class="count">${esc(p.note)}</span>` : ''}</span><span class="pka">${fmt(p.amount)} ${esc(cur)}</span></button>`).join('');
  const lab = sdl.querySelector('.lab'); if (lab) lab.textContent = tx('Destek paketini seç');
  $('supgo').hidden = true;
  $('supsetup').hidden = ready; $('supsetup').textContent = tx('Kartla ödeme sayfası çok yakında burada açılacak.');
  let lg = $('suplegal');
  if (!lg) { lg = document.createElement('p'); lg.id = 'suplegal'; lg.className = 'note legal-links'; sdl.querySelector('.dlg').appendChild(lg); }
  lg.innerHTML = `<span>Destek gönüllüdür; karşılığında ürün gönderilmez.</span> <button type="button" class="linkbtn" data-a="legal" data-v="mesafeli">Mesafeli satış sözleşmesi</button> · <button type="button" class="linkbtn" data-a="legal" data-v="iade">İptal ve iade</button> · <button type="button" class="linkbtn" data-a="legal" data-v="iletisim">İletişim</button>`;
};
A.suppkg = v => {
  const p = PKGS[+v]; if (!p || !p.url) return;
  track('act:support_pkg');
  const a = document.createElement('a'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  toast('Ödeme sayfası yeni sekmede açılıyor');
};

/* yasal sayfalar (avukat kontrolü önerilir) */
const SV = k => SELLER[k] ? `<b translate="no">${esc(SELLER[k])}</b>` : `<i>[${k === 'name' ? 'Satıcı adı soyadı' : k === 'email' ? 'E-posta' : k === 'address' ? 'Adres' : 'Telefon'}]</i>`;
const SITE = () => `${location.origin}${location.pathname}`;
function legalHTML(kind) {
  const who = `<p>${SV('name')}<br>${SV('address')}<br>${SV('email')}${SELLER.phone ? '<br>' + SV('phone') : ''}</p>`;
  if (kind === 'iletisim') return `<h1 class="xh">İletişim</h1><p>Türkiye Gezi Rehberi bağımsız bir projedir. Soru, öneri, ödeme veya iade talepleri için bize yazabilirsin:</p>${who}<p class="note">Uygulama içinden “Görüş ve öneri gönder” bölümünü de kullanabilirsin. Genellikle 3 iş günü içinde dönüş yaparız.</p>`;
  if (kind === 'hesapsil') return `<h1 class="xh">Hesabını ve verilerini silme</h1>
    <p>Türkiye Gezi Rehberi hesabını ve hesabına bağlı tüm verileri istediğin zaman silebilirsin.</p>
    <h2 class="xh2">Uygulamadan veya siteden</h2><ol><li>Hesabına giriş yap.</li><li>Sağ üstteki hesap düğmesinden <b>Profilim</b>'i aç.</li><li>En alttaki <b>Hesabı sil</b> düğmesine dokun ve onayla.</li></ol>
    <h2 class="xh2">Giriş yapamıyorsan</h2><p>Hesabına kayıtlı e-posta adresinden ${SV('email')} adresine “Hesabımı silin” konulu bir e-posta gönder. Talebin en geç 30 gün içinde yerine getirilir.</p>
    <h2 class="xh2">Silinen veriler</h2><p>Profilin, yorumların, fotoğrafların, yanıtların, beğenilerin, gittiğin ve favori yerlerin, gezi günlüklerin, bildirimlerin ve bildirim kayıtların kalıcı olarak silinir.</p>
    <h2 class="xh2">Saklanabilecek veriler</h2><p>Hesaba bağlı olmayan, kimliği belirsiz kullanım sayıları (ör. bir ekranın kaç kez açıldığı) ve yasal yükümlülükler gereği tutulması gereken ödeme kayıtları (ödeme kuruluşunda, en fazla 10 yıl) silinmeyebilir.</p>`;
  if (kind === 'iade') return `<h1 class="xh">İptal ve iade koşulları</h1>
    <p>Türkiye Gezi Rehberi ücretsiz bir uygulamadır. “Bize destek olun” bölümündeki paketler projeye <b>gönüllü destek</b> ödemesidir; karşılığında fiziksel bir ürün gönderilmez ve uygulamadaki hiçbir özellik ücretli değildir.</p>
    <h2 class="xh2">İade</h2>
    <p>Yanlışlıkla, hatalı tutarla veya birden fazla kez ödeme yaptıysan, ödeme tarihinden itibaren <b>14 gün içinde</b> aşağıdaki e-posta adresine yazman yeterlidir. Talebin onaylandıktan sonra ücret, ödemeyi yaptığın karta <b>en geç 14 gün içinde</b> iade edilir. İadenin hesabına yansıma süresi bankana göre değişebilir.</p>
    <p>Talebinde ödeme tarihini, tutarı ve ödeme sayfasındaki sipariş numarasını belirtmen işlemi hızlandırır.</p>
    <h2 class="xh2">İptal</h2><p>Aylık veya otomatik yenilenen bir ödeme yoktur; her destek tek seferliktir.</p>
    <h2 class="xh2">Başvuru</h2>${who}`;
  return `<h1 class="xh">Mesafeli satış sözleşmesi</h1>
    <h2 class="xh2">1. Taraflar</h2><p><b>Satıcı:</b></p>${who}<p><b>Alıcı:</b> Ödeme sayfasında adını, e-posta adresini ve fatura bilgilerini giren kişi.</p>
    <h2 class="xh2">2. Konu</h2><p>Bu sözleşmenin konusu, Alıcının ${esc(SITE())} adresindeki Türkiye Gezi Rehberi projesine “Bize destek olun” bölümünden seçtiği destek paketinin bedelini ödemesi ve tarafların 6502 sayılı Tüketicinin Korunması Hakkında Kanun ile Mesafeli Sözleşmeler Yönetmeliği kapsamındaki hak ve yükümlülükleridir.</p>
    <h2 class="xh2">3. Hizmetin niteliği ve bedeli</h2><p>Destek paketleri projenin sunucu, harita servisi ve geliştirme masraflarına gönüllü katkıdır. Karşılığında fiziksel ürün teslim edilmez; uygulamanın tüm özellikleri ödeme yapmayanlar için de ücretsizdir. Paketin adı ve vergiler dahil toplam bedeli ödeme sayfasında gösterilir. Ödeme, lisanslı ödeme kuruluşunun güvenli sayfasında kredi veya banka kartıyla yapılır; kart bilgileri Satıcı tarafından görülmez ve saklanmaz.</p>
    <h2 class="xh2">4. İfa</h2><p>Destek, ödemenin onaylanmasıyla anında gerçekleşmiş sayılır; ödeme onayı Alıcının e-posta adresine gönderilir.</p>
    <h2 class="xh2">5. Cayma hakkı</h2><p>Mesafeli Sözleşmeler Yönetmeliğinin 15. maddesi uyarınca elektronik ortamda anında ifa edilen hizmetlerde cayma hakkı kullanılamaz. Buna rağmen Satıcı, “İptal ve iade koşulları” sayfasında belirtilen durumlarda ödemenin 14 gün içinde talep edilmesi hâlinde bedeli iade etmeyi kabul eder.</p>
    <h2 class="xh2">6. Kişisel veriler</h2><p>Ödeme sırasında paylaşılan bilgiler yalnızca ödemenin yapılması, faturalandırma ve yasal yükümlülükler için işlenir. Ayrıntılar için “Gizlilik ve KVKK” sayfasına bakabilirsin.</p>
    <h2 class="xh2">7. Uyuşmazlıklar</h2><p>Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığınca her yıl ilan edilen parasal sınırlar dahilinde Alıcının yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.</p>
    <h2 class="xh2">8. Yürürlük</h2><p>Alıcı, ödeme sayfasında ödemeyi onayladığında bu sözleşmenin tüm koşullarını okuduğunu ve kabul ettiğini beyan eder.</p>`;
}
const LEGAL_KINDS = ['mesafeli', 'iade', 'iletisim', 'hesapsil', 'gizlilik'];
function showPubPage(html) {
  let d = $('pubdlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'pubdlg'; document.body.appendChild(d); d.addEventListener('close', () => { if (PUBHOLD) { PUBHOLD = false; if (!CUR) gate27(); } }); }
  d.innerHTML = `<div class="dlg"><div class="dh"><span></span><button type="button" class="xb" data-a="pubclose" aria-label="Kapat">✕</button></div><div class="legal">${html}</div></div>`;
  if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
}
A.legal = v => { if (!LEGAL_KINDS.includes(v)) return; if (v === 'gizlilik') { A.mprivacy(); return; } showPubPage(legalHTML(v)); };
let PUBHOLD = false;
const gate27 = gate;
const pubOpen = () => ['pubdlg', 'privdlg'].some(id => { const d = $(id); return d && d.open; });
gate = function () { if (PUBHOLD && !CUR && pubOpen()) return; gate27(); };
A.pubclose = () => { const d = $('pubdlg'); if (d) { if (d.close) d.close(); else { d.removeAttribute('open'); if (PUBHOLD) { PUBHOLD = false; if (!CUR) gate27(); } } } };

/* gizlilik bölümüne ve hesap menüsüne bağlantılar; ?sayfa=mesafeli|iade|iletisim doğrudan açılır (giriş gerekmez) */
$('acctmenu').querySelector('[data-a="mprivacy"]').insertAdjacentHTML('afterend', `<button role="menuitem" data-a="legal" data-v="iletisim"><span class="emi" aria-hidden="true">✉</span><span>İletişim</span></button>`);
(function openLegalLink() {
  let k = null; try { k = new URLSearchParams(location.search).get('sayfa'); } catch (_) { }
  if (!LEGAL_KINDS.includes(k)) return;
  PUBHOLD = true;
  const go = () => { try { if (adlg.open && !CUR) adlg.close(); } catch (_) { } A.legal(k); };
  setTimeout(go, 300);
  // satıcı bilgileri gelince sayfayı tazele
  let n = 0; const re = () => { if (k === 'gizlilik') return; if (SELLER.name || n++ > 20) { const d = $('pubdlg'); if (d && d.open) d.querySelector('.legal').innerHTML = legalHTML(k); return; } setTimeout(re, 500); }; setTimeout(re, 1500);
})();
// gizlilik penceresi kapanınca da girişe dön
$('privdlg').addEventListener('close', () => { if (PUBHOLD) { PUBHOLD = false; if (!CUR) gate27(); } });
