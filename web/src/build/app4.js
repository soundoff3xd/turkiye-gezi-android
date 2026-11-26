/* ---------- dil desteği: Türkçe kaynak metin anahtar, çeviriler I18N içinde ---------- */
const LANGS = { tr: 'Türkçe', en: 'English', de: 'Deutsch', ru: 'Русский', ar: 'العربية', fa: 'فارسی', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', ro: 'Română', el: 'Ελληνικά', uk: 'Українська', bg: 'Български', az: 'Azərbaycanca', zh: '中文', ja: '日本語', ko: '한국어', ku: 'Kurdî', ka: 'ქართული', kk: 'Қазақша', uz: 'Oʻzbekcha', sq: 'Shqip', sr: 'Српски', hr: 'Hrvatski', cs: 'Čeština', hu: 'Magyar', sv: 'Svenska', no: 'Norsk', da: 'Dansk', fi: 'Suomi', he: 'עברית', hi: 'हिन्दी', ur: 'اردو', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', th: 'ไทย', vi: 'Tiếng Việt' };
const LIDX = Object.fromEntries(['en', 'de', 'ru', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ro', 'el', 'uk', 'bg', 'az', 'ar', 'fa', 'zh', 'ja', 'ko', 'ku', 'ka', 'kk', 'uz', 'sq', 'sr', 'hr', 'cs', 'hu', 'sv', 'no', 'da', 'fi', 'he', 'hi', 'ur', 'id', 'ms', 'th', 'vi'].map((l, i) => [l, i]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATS = Object.keys(I18N).filter(k => /\{\d\}/.test(k)).map(k => [
  new RegExp('^' + k.split(/\{\d\}/).map(escRe).join('(.+?)') + '$'),
  [...k.matchAll(/\{(\d)\}/g)].map(m => m[1]), k
]).sort((a, b) => b[2].length - a[2].length);
function lookPat(s) {
  const i = LIDX[window.LANG];
  for (const [re, order, k] of PATS) {
    const m = s.match(re);
    if (m) { let out = I18N[k][i] ?? I18N[k][0]; order.forEach((n, j) => { const c = m[j + 1]; out = out.replace('{' + n + '}', /\d/.test(c) ? tx1(c) : c); }); return out; }
  }
  return null;
}
function tx1(core) {
  const e = I18N[core];
  if (e) return e[LIDX[window.LANG]] ?? e[0];
  if (core.includes(' · ')) return core.split(' · ').map(tx1).join(' · ');
  return lookPat(core) ?? core;
}
function tx(s) {
  if (window.LANG === 'tr' || !s) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return m[2] ? m[1] + tx1(m[2]) + m[3] : s;
}
const ORIG = new WeakMap(), LAST = new WeakMap(), TATTR = ['placeholder', 'aria-label', 'alt', 'title', 'label'];
function trText(n) {
  let o = ORIG.get(n);
  if (o === undefined || (n.nodeValue !== o && n.nodeValue !== LAST.get(n))) { o = n.nodeValue; ORIG.set(n, o); }
  const v = tx(o); LAST.set(n, v);
  if (n.nodeValue !== v) n.nodeValue = v;
}
function trAttrs(el) {
  for (const a of TATTR) {
    if (!el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a); let o = el.getAttribute('data-o-' + a);
    if (o === null || (cur !== o && cur !== el.getAttribute('data-l-' + a))) { o = cur; el.setAttribute('data-o-' + a, o); }
    const v = tx(o); el.setAttribute('data-l-' + a, v);
    if (cur !== v) el.setAttribute(a, v);
  }
}
function trTree(root) {
  if (root.nodeType === 3) { const pe = root.parentElement; if (pe && !pe.closest('script,style,#map,[translate="no"]')) trText(root); return; }
  if (root.nodeType !== 1 || !root.isConnected || root.closest('script,style,#map,[translate="no"]')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) if (!n.parentElement.closest('script,style,#map,[translate="no"]')) trText(n);
  trAttrs(root); root.querySelectorAll('*').forEach(el => { if (!el.closest('#map')) trAttrs(el); });
}
let busy = false;
new MutationObserver(ms => {
  if (busy) return; busy = true;
  try {
    for (const m of ms) {
      if (m.type === 'attributes') { if (!m.target.closest('#map,[translate="no"]')) trAttrs(m.target); }
      else if (m.type === 'characterData') trTree(m.target);
      else m.addedNodes.forEach(trTree);
    }
  } finally { busy = false; }
}).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TATTR });

const LALIAS = { nb: 'no', nn: 'no', iw: 'he', in: 'id', ckb: 'ku', kmr: 'ku', bs: 'hr' };
function setLang(l) {
  l = LALIAS[l] || l;
  window.LANG = LANGS[l] ? l : 'tr';
  document.documentElement.lang = window.LANG;
  document.documentElement.dir = ['ar', 'fa', 'he', 'ur'].includes(window.LANG) ? 'rtl' : 'ltr';
  try { localStorage.setItem('gezi-lang', window.LANG); } catch (_) { }
  $('lang').value = window.LANG; $('lang2').value = window.LANG;
  renderChips(); renderList(); renderPending();
  if (S.sel) renderDetail();
  trTree(document.body);
}
$('lang').innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('lang2').innerHTML = $('lang').innerHTML;
$('lang').addEventListener('change', e => setLang(e.target.value));
$('lang2').addEventListener('change', e => setLang(e.target.value));
let saved = null;
try { saved = localStorage.getItem('gezi-lang'); } catch (_) { }
setLang(saved || (navigator.language || 'tr').slice(0, 2).toLowerCase());
