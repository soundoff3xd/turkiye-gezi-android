/* Renkler. Tema uygulama açılırken bir kez uygulanır (src/Boot.tsx), çünkü ekran stilleri ilk yüklemede okunur.
   Hazır temalar + kendi rengin (vurgu ve arka plan tonu) + degrade arka plan; yazı tipi ve boyutu da Boot'ta uygulanır. */
const LIGHT = {
  bg: '#FBF8F1', surface: '#FFFFFF', ink: '#14313A', muted: '#4F6168', line: '#E6DFCF', chipLine: '#D9D2C2',
  accent: '#B8321F', onAccent: '#FFFFFF', soft: '#F3E3DD', star: '#B7791F', ok: '#2F6B3F', danger: '#B8321F',
  accentRgb: '184,50,31', solid: '#14313A', solidSub: '#D6E0E3', link: '#1F6FEB', scrim: 'rgba(0,0,0,.45)',
  screen: '#FBF8F1', grad: '' as string,
};
const DARK: typeof LIGHT = {
  bg: '#11191C', surface: '#1A2428', ink: '#E6EDEF', muted: '#9AACB2', line: '#283438', chipLine: '#35444A',
  accent: '#E2573F', onAccent: '#FFFFFF', soft: '#3B2622', star: '#E2A548', ok: '#5DB075', danger: '#E2573F',
  accentRgb: '226,87,63', solid: '#2C4851', solidSub: '#B9CBD1', link: '#5B9BFF', scrim: 'rgba(0,0,0,.6)',
  screen: '#11191C', grad: '',
};
export type ThemeMode = 'system' | 'light' | 'dark';
export type FontKey = 'system' | 'nunito' | 'lora' | 'montserrat' | 'comfortaa';
export type ThemeCfg = { preset: string; accent?: string; tint?: string; base?: 'light' | 'dark'; grad?: boolean; font?: FontKey; size?: number };
/* hazır temalar: taban (açık/koyu), vurgu rengi, isteğe bağlı degrade arka plan */
export type Preset = { id: string; name: string; base: 'light' | 'dark' | 'system'; accent?: string; grad?: [string, string] };
export const PRESETS: Preset[] = [
  { id: 'system', name: 'Telefonun ayarı', base: 'system' },
  { id: 'light', name: 'Açık tema', base: 'light' },
  { id: 'dark', name: 'Koyu tema', base: 'dark' },
  { id: 'ege', name: 'Ege', base: 'light', accent: '#0369A1', grad: ['#E0F2FE', '#BAE6FD'] },
  { id: 'kapadokya', name: 'Kapadokya', base: 'light', accent: '#C2410C', grad: ['#FFF1E6', '#F8C9A6'] },
  { id: 'lavanta', name: 'Lavanta', base: 'light', accent: '#7C3AED', grad: ['#F5F0FF', '#DDD0FB'] },
  { id: 'gunbatimi', name: 'Gün batımı', base: 'dark', accent: '#FF8A5B', grad: ['#2B1055', '#A3426F'] },
  { id: 'gece', name: 'Gece mavisi', base: 'dark', accent: '#60A5FA', grad: ['#0B1224', '#1E3A8A'] },
  { id: 'orman', name: 'Orman', base: 'dark', accent: '#6EE7A0', grad: ['#071F18', '#1B5440'] },
  { id: 'karadeniz', name: 'Karadeniz', base: 'dark', accent: '#4FD1C5', grad: ['#0F2027', '#2C5364'] },
];
export const SWATCHES = ['#B8321F', '#E2573F', '#C2410C', '#B7791F', '#15803D', '#0F766E', '#0369A1', '#1D4ED8', '#4F46E5', '#7C3AED', '#A21CAF', '#BE185D', '#475569', '#14313A'];
export const TINTS = ['#FBF8F1', '#F1F5F9', '#ECFDF5', '#EFF6FF', '#F5F3FF', '#FDF2F8', '#FFF7ED', '#11191C', '#0F172A', '#1E1B2E', '#052E2B', '#2A1215'];

/* ---- renk yardımcıları ---- */
const hex = (h: string) => { const m = h.replace('#', ''); const n = parseInt(m.length === 3 ? m.split('').map((c) => c + c).join('') : m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
export const lum = (h: string) => { const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const rgba = (h: string, a: number) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
export const isHex = (s: string) => /^#?[0-9a-fA-F]{6}$/.test(s.trim());
/* vurgu rengi üstüne beyaz yazı okunabilsin: çok açıksa koyulaştır */
export function safeAccent(h: string, dark: boolean) {
  let c = h.startsWith('#') ? h : '#' + h;
  for (let i = 0; i < 12 && lum(c) > (dark ? 0.42 : 0.3); i++) c = mix(c, '#000000', 0.12);
  return c.toUpperCase();
}

/* seçimden renk paletini üret */
export function buildPalette(cfg: ThemeCfg, systemDark: boolean) {
  const pr = PRESETS.find((p) => p.id === cfg.preset) || PRESETS[0];
  const custom = cfg.preset === 'custom';
  const dark = custom ? cfg.base === 'dark' : pr.base === 'system' ? systemDark : pr.base === 'dark';
  const P = { ...(dark ? DARK : LIGHT) };
  const acc = custom ? cfg.accent : pr.accent;
  if (acc && isHex(acc)) {
    const a = safeAccent(acc, dark); const [r, g, b] = hex(a);
    Object.assign(P, { accent: a, danger: a, accentRgb: `${r},${g},${b}`, soft: mix(P.bg, a, dark ? 0.22 : 0.14), link: dark ? mix(a, '#FFFFFF', 0.25) : a });
  }
  // arka plan: hazır degrade ya da kendi tonun (düz veya degrade)
  let grad: [string, string] | null = pr.grad && !custom ? pr.grad : null;
  if (custom && cfg.tint && isHex(cfg.tint)) {
    const t = cfg.tint.startsWith('#') ? cfg.tint : '#' + cfg.tint;
    // taban tonla uyuşmuyorsa (koyu temada açık ton gibi) tonu tabana yaklaştır
    const base = dark ? (lum(t) > 0.2 ? mix(t, '#0B0F14', 0.8) : t) : (lum(t) < 0.6 ? mix(t, '#FFFFFF', 0.85) : t);
    grad = cfg.grad ? [base, mix(base, P.accent, dark ? 0.35 : 0.22)] : null;
    if (!cfg.grad) Object.assign(P, { bg: base, screen: base, surface: dark ? mix(base, '#FFFFFF', 0.06) : mix(base, '#FFFFFF', 0.7) });
  }
  if (grad) {
    const mid = mix(grad[0], grad[1], 0.5);
    Object.assign(P, {
      grad: grad.join(','), bg: mid, screen: 'transparent',
      surface: dark ? rgba(mix(grad[0], '#000000', 0.2), 0.72) : rgba('#FFFFFF', 0.82),
      line: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', chipLine: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
    });
    // degrade üstündeki yazılar: tabana göre okunurluğu koru
    if (!dark && lum(mid) < 0.55) Object.assign(P, { ink: '#0B1B22', muted: '#2E4148' });
  }
  if (dark && custom) P.solid = mix(P.bg, P.accent, 0.3);
  return { palette: P, dark };
}

export const C = { ...LIGHT };
export let isDark = false;
export let FONT: FontKey = 'system';
export let FONT_SCALE = 1;
/* Ekranların stilleri ilk yüklemede okunduğu için tema, ekranlar yüklenmeden önce bir kez uygulanır */
export function applyTheme(dark: boolean) { isDark = dark; Object.assign(C, dark ? DARK : LIGHT); }
export function applyThemeCfg(cfg: ThemeCfg, systemDark: boolean) {
  const { palette, dark } = buildPalette(cfg, systemDark);
  isDark = dark; Object.assign(C, palette);
  FONT = cfg.font || 'system'; FONT_SCALE = cfg.size && cfg.size > 0.8 && cfg.size < 1.4 ? cfg.size : 1;
}
export const R = { sm: 10, md: 14, lg: 20, pill: 999 };
export const shadow = {
  shadowColor: '#000000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
};
