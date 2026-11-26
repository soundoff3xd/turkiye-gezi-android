/* ===== aşama 4: tema sistemi (uygulamadaki src/theme.ts ile aynı kurallar; sitede anında uygulanır) ===== */
const TH_PRESETS = [
  { id: 'system', name: 'Telefonun ayarı', base: 'system' }, { id: 'light', name: 'Açık tema', base: 'light' }, { id: 'dark', name: 'Koyu tema', base: 'dark' },
  { id: 'ege', name: 'Ege', base: 'light', accent: '#0369A1', grad: ['#E0F2FE', '#BAE6FD'] },
  { id: 'kapadokya', name: 'Kapadokya', base: 'light', accent: '#C2410C', grad: ['#FFF1E6', '#F8C9A6'] },
  { id: 'lavanta', name: 'Lavanta', base: 'light', accent: '#7C3AED', grad: ['#F5F0FF', '#DDD0FB'] },
  { id: 'gunbatimi', name: 'Gün batımı', base: 'dark', accent: '#FF8A5B', grad: ['#2B1055', '#A3426F'] },
  { id: 'gece', name: 'Gece mavisi', base: 'dark', accent: '#60A5FA', grad: ['#0B1224', '#1E3A8A'] },
  { id: 'orman', name: 'Orman', base: 'dark', accent: '#6EE7A0', grad: ['#071F18', '#1B5440'] },
  { id: 'karadeniz', name: 'Karadeniz', base: 'dark', accent: '#4FD1C5', grad: ['#0F2027', '#2C5364'] },
];
const TH_SW = ['#B8321F', '#E2573F', '#C2410C', '#B7791F', '#15803D', '#0F766E', '#0369A1', '#1D4ED8', '#4F46E5', '#7C3AED', '#A21CAF', '#BE185D', '#475569', '#14313A'];
const TH_TINTS = ['#FBF8F1', '#F1F5F9', '#ECFDF5', '#EFF6FF', '#F5F3FF', '#FDF2F8', '#FFF7ED', '#11191C', '#0F172A', '#1E1B2E', '#052E2B', '#2A1215'];
const TH_FONTS = [['system', 'Sistem', ''], ['nunito', 'Yuvarlak', 'Nunito'], ['montserrat', 'Modern', 'Montserrat'], ['lora', 'Klasik', 'Lora'], ['comfortaa', 'Eğlenceli', 'Comfortaa']];
const TH_SIZES = [[0.9, 'Küçük'], [1, 'Normal'], [1.12, 'Büyük'], [1.25, 'Çok büyük']];
const thHex = h => { const m = h.replace('#', ''); const n = parseInt(m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const thToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const thLum = h => { const [r, g, b] = thHex(h).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const thMix = (a, b, t) => { const x = thHex(a), y = thHex(b); return thToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const thRgba = (h, a) => { const [r, g, b] = thHex(h); return `rgba(${r},${g},${b},${a})`; };
const thIsHex = s => /^#?[0-9a-fA-F]{6}$/.test(String(s || '').trim());
function thSafe(h, dark) { let c = h.startsWith('#') ? h : '#' + h; for (let i = 0; i < 12 && thLum(c) > (dark ? 0.42 : 0.3); i++) c = thMix(c, '#000000', 0.12); return c.toUpperCase(); }
const sysDark = () => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (_) { return false; } };
/* seçimden: taban (açık/koyu) + değiştirilecek CSS değişkenleri + degrade */
function thBuild(cfg) {
  const pr = TH_PRESETS.find(p => p.id === cfg.preset) || TH_PRESETS[0], custom = cfg.preset === 'custom';
  const dark = custom ? cfg.base === 'dark' : pr.base === 'system' ? sysDark() : pr.base === 'dark';
  const base = dark ? { bg: '#0F1C21', surface: '#17262C', ink: '#EEF2F2', muted: '#A9B8BC', accent: '#E8735E' } : { bg: '#FBF8F1', surface: '#FFFFFF', ink: '#14313A', muted: '#4F6168', accent: '#B8321F' };
  const v = {}; const acc = custom ? cfg.accent : pr.accent;
  if (acc && thIsHex(acc)) { const a = thSafe(acc, dark); Object.assign(v, { '--accent': a, '--on-accent': '#FFFFFF', '--soft': thMix(base.bg, a, dark ? 0.22 : 0.14) }); base.accent = a; }
  let grad = pr.grad && !custom ? pr.grad : null;
  if (custom && cfg.tint && thIsHex(cfg.tint)) {
    const t = cfg.tint.startsWith('#') ? cfg.tint : '#' + cfg.tint;
    const bg = dark ? (thLum(t) > 0.2 ? thMix(t, '#0B0F14', 0.8) : t) : (thLum(t) < 0.6 ? thMix(t, '#FFFFFF', 0.85) : t);
    if (cfg.grad) grad = [bg, thMix(bg, base.accent, dark ? 0.35 : 0.22)];
    else Object.assign(v, { '--bg': bg, '--surface': dark ? thMix(bg, '#FFFFFF', 0.06) : thMix(bg, '#FFFFFF', 0.7) });
  }
  if (grad) {
    const mid = thMix(grad[0], grad[1], 0.5);
    Object.assign(v, { '--bg': mid, '--surface': dark ? thRgba(thMix(grad[0], '#000000', 0.2), 0.72) : thRgba('#FFFFFF', 0.82),
      '--line': dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', '--chip-line': dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)' });
    if (!dark && thLum(mid) < 0.55) Object.assign(v, { '--ink': '#0B1B22', '--muted': '#2E4148' });
  }
  return { dark, vars: v, grad, accent: base.accent, bg: v['--bg'] || base.bg, surface: v['--surface'] || base.surface, ink: v['--ink'] || base.ink, muted: v['--muted'] || base.muted };
}
const THEME = { cfg: { preset: 'system' }, applied: [] };
try { const s = JSON.parse(localStorage.getItem('gezi-theme2') || 'null'); if (s && s.preset) THEME.cfg = s; } catch (_) { }
const fontLoaded = {};
function thFont(fam) {
  if (!fam || fontLoaded[fam]) return;
  fontLoaded[fam] = 1;
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@400;700;800&display=swap`;
  document.head.appendChild(l);
}
function applySiteTheme(cfg) {
  const r = document.documentElement, b = thBuild(cfg);
  THEME.applied.forEach(k => r.style.removeProperty(k)); THEME.applied = Object.keys(b.vars);
  Object.entries(b.vars).forEach(([k, v]) => r.style.setProperty(k, v));
  const explicit = cfg.preset !== 'system';
  if (explicit) r.setAttribute('data-theme', b.dark ? 'dark' : 'light'); else r.removeAttribute('data-theme');
  if (b.grad) { r.setAttribute('data-grad', ''); r.style.setProperty('--grad', `linear-gradient(160deg, ${b.grad[0]}, ${b.grad[1]})`); } else { r.removeAttribute('data-grad'); r.style.removeProperty('--grad'); }
  const fam = (TH_FONTS.find(f => f[0] === cfg.font) || [])[2];
  if (fam) { thFont(fam); r.style.setProperty('--body', `"${fam}",system-ui,sans-serif`); r.style.setProperty('--display', `"${fam}",system-ui,sans-serif`); }
  else { r.style.removeProperty('--body'); r.style.removeProperty('--display'); }
  r.style.setProperty('--ui-zoom', String(cfg.size && cfg.size > 0.8 && cfg.size < 1.4 ? cfg.size : 1));
  const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', b.bg);
}
applySiteTheme(THEME.cfg);
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applySiteTheme(THEME.cfg)); } catch (_) { }
function saveSiteTheme(cfg, toProfile = true) {
  THEME.cfg = cfg; applySiteTheme(cfg);
  try { localStorage.setItem('gezi-theme2', JSON.stringify(cfg)); } catch (_) { }
  if (toProfile && ONLINE() && ME) sb.from('profiles').update({ theme: cfg }).eq('id', ME.id).then(() => { }, () => { });
}
/* girişte hesaptaki temayı al */
async function pullProfileTheme() {
  if (!ONLINE() || !ME) return;
  try { const { data } = await sb.from('profiles').select('theme').eq('id', ME.id).maybeSingle();
    if (data && data.theme && data.theme.preset && JSON.stringify(data.theme) !== JSON.stringify(THEME.cfg)) saveSiteTheme(data.theme, false); } catch (_) { }
}
const ra22 = renderAcct; let lastMe22 = null;
renderAcct = function () { ra22(); const id = ME && ME.id; if (id && id !== lastMe22) { lastMe22 = id; pullProfileTheme(); } if (!id) lastMe22 = null; };

/* ---- Görünüm ekranı ---- */
const TH = { draft: null };
const sw = (a, b, sz = 48) => `<span class="thsw" style="width:${sz}px;height:${sz}px;background:linear-gradient(160deg,${a},${b || a})"></span>`;
function themeHTML() {
  const c = TH.draft || (TH.draft = { ...THEME.cfg }), custom = c.preset === 'custom', bb = thBuild(c), sz = c.size || 1;
  const fam = (TH_FONTS.find(f => f[0] === c.font) || [])[2];
  const prev = `<div class="thprev" style="background:${bb.grad ? `linear-gradient(160deg,${bb.grad[0]},${bb.grad[1]})` : bb.bg}">
    <div class="thcard" style="background:${bb.surface};color:${bb.ink};${fam ? `font-family:'${fam}',sans-serif;` : ''}font-size:${15 * sz}px">
      <div style="color:${bb.accent};font-size:${11 * sz}px;font-weight:800;letter-spacing:.06em" translate="no">NEVŞEHİR</div>
      <div style="font-size:${22 * sz}px;font-weight:800" translate="no">Göreme</div>
      <div style="color:${bb.muted};font-size:${13 * sz}px">★ 4,8 · <span>1.204 kişi gitti</span></div>
      <div class="thbtns"><span style="background:${bb.dark ? '#2C4851' : '#14313A'}">✓ <span>Gittim</span></span><span style="background:${bb.accent}">Yol tarifi</span></div></div></div>`;
  const presets = TH_PRESETS.map(p => { const x = thBuild({ preset: p.id }), g = x.grad || [x.bg, x.bg];
    return `<button class="thp" data-a="thpre" data-v="${p.id}" aria-pressed="${c.preset === p.id}"><span class="thpw">${sw(g[0], g[1], 52)}<i style="background:${x.accent}"></i></span><span>${p.name}</span></button>`; }).join('');
  const sws = TH_SW.map(x => `<button class="thdot" data-a="thacc" data-v="${x}" aria-pressed="${custom && c.accent === x}" aria-label="${x}" style="background:${x}"></button>`).join('');
  const tints = TH_TINTS.map(x => `<button class="thdot sq" data-a="thtint" data-v="${x}" aria-pressed="${custom && c.tint === x}" aria-label="${x}" style="background:${x}"></button>`).join('');
  const fonts = TH_FONTS.map(([k, n, f]) => { if (f) thFont(f); return `<button class="row thf" data-a="thfont" data-v="${k}" aria-pressed="${(c.font || 'system') === k}"><span class="rb"><span class="rn" style="${f ? `font-family:'${f}',sans-serif;font-weight:700` : ''}"><span>${n}</span> · Aa Çç Ğğ</span></span>${(c.font || 'system') === k ? '<b style="color:var(--accent)">✓</b>' : ''}</button>`; }).join('');
  const sizes = TH_SIZES.map(([v, l]) => `<button class="chip" data-a="thsize" data-v="${v}" aria-pressed="${sz === v}">${l}</button>`).join('');
  return `<h1 class="xh">Görünüm</h1>
    <div class="row-label">Önizleme</div>${prev}
    <h2 class="xh2">Hazır temalar</h2><div class="thgrid">${presets}</div>
    <h2 class="xh2">Kendi temanı oluştur</h2>
    <div class="acts"><button class="btn" data-a="thbase" data-v="light" aria-pressed="${custom && c.base === 'light'}">☀️ <span>Açık tema</span></button><button class="btn" data-a="thbase" data-v="dark" aria-pressed="${custom && c.base === 'dark'}">🌙 <span>Koyu tema</span></button></div>
    <div class="row-label">Vurgu rengi</div><div class="thdots">${sws}</div>
    <div class="acts"><input class="in" id="thhex" maxlength="7" placeholder="#3B82F6" value="${esc(c.accent || '')}"><button class="btn" data-a="thhex">Uygula</button></div>
    <div class="row-label">Arka plan tonu</div><div class="thdots">${tints}</div>
    <label class="lrow box"><span><b>Degrade arka plan</b><br><span class="count">Arka plan tonundan vurgu rengine geçiş</span></span><input type="checkbox" data-a="thgrad" ${custom && c.grad ? 'checked' : ''}></label>
    <h2 class="xh2">Yazı tipi</h2><div class="setl">${fonts}</div>
    <h2 class="xh2">Yazı boyutu</h2><div class="chips wrapc">${sizes}</div>
    <button class="btn pri" style="width:100%;margin-top:16px" data-a="thsave">Kaydet</button>
    <p class="note">${ME ? 'Seçimin hesabına da kaydedilir; uygulamada ve diğer cihazlarında da aynı görünür.' : ''}</p>`;
}
const rx22 = renderX;
renderX = function () {
  if (XV && XV.kind === 'theme') { $('xbody').innerHTML = `<button class="back" data-a="xback">${ICON.back}<span>Tüm yerler</span></button>` + themeHTML(); return; }
  rx22();
};
const thUpd = p => { TH.draft = { ...TH.draft, ...p }; applySiteTheme(TH.draft); const y = $('xbody').scrollTop; renderX(); $('xbody').scrollTop = y; };
const thCustom = p => { const d = TH.draft, b = thBuild(d); thUpd({ preset: 'custom', base: d.base || (b.dark ? 'dark' : 'light'), accent: d.accent || b.accent, tint: d.tint, grad: d.grad, ...p }); };
$('acctmenu').querySelector('[data-a="mprivacy"]').insertAdjacentHTML('beforebegin', '<button role="menuitem" data-a="mtheme"><span class="emi" aria-hidden="true">🎨</span><span>Görünüm</span></button>');
Object.assign(A, {
  mtheme: () => { toggleMenu(false); TH.draft = { ...THEME.cfg }; showX('theme'); },
  thpre: v => thUpd({ preset: v, accent: undefined, tint: undefined, grad: undefined, base: undefined }),
  thbase: v => thCustom({ base: v }),
  thacc: v => thCustom({ accent: v }),
  thhex: () => { const v = ($('thhex').value || '').trim(); if (!thIsHex(v)) { toast('Geçerli bir renk kodu yaz (ör. #3B82F6).'); return; } thCustom({ accent: (v.startsWith('#') ? v : '#' + v).toUpperCase() }); },
  thtint: v => thCustom({ tint: v, base: thLum(v) < 0.2 ? 'dark' : 'light' }),
  thgrad: () => { const d = TH.draft; thCustom({ grad: !(d.preset === 'custom' && d.grad), tint: d.tint || ((d.base || 'light') === 'dark' ? TH_TINTS[8] : TH_TINTS[3]) }); },
  thfont: v => thUpd({ font: v }),
  thsize: v => thUpd({ size: +v }),
  thsave: () => { saveSiteTheme({ ...TH.draft }); track('act:theme_' + TH.draft.preset); toast('Tema kaydedildi'); },
});
/* ekrandan ayrılırken kaydedilmemiş önizlemeyi geri al */
const xb22 = A.xback; A.xback = function (...a) { if (XV && XV.kind === 'theme' && JSON.stringify(TH.draft) !== JSON.stringify(THEME.cfg)) applySiteTheme(THEME.cfg); return xb22.apply(this, a); };
