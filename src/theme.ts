/* Web sitesiyle aynı renkler. Açık ve koyu tema; seçim uygulama açılırken yapılır (src/Boot.tsx). */
const LIGHT = {
  bg: '#FBF8F1', surface: '#FFFFFF', ink: '#14313A', muted: '#4F6168', line: '#E6DFCF', chipLine: '#D9D2C2',
  accent: '#B8321F', onAccent: '#FFFFFF', soft: '#F3E3DD', star: '#B7791F', ok: '#2F6B3F', danger: '#B8321F',
  accentRgb: '184,50,31', solid: '#14313A', solidSub: '#D6E0E3', link: '#1F6FEB', scrim: 'rgba(0,0,0,.45)',
};
const DARK: typeof LIGHT = {
  bg: '#11191C', surface: '#1A2428', ink: '#E6EDEF', muted: '#9AACB2', line: '#283438', chipLine: '#35444A',
  accent: '#E2573F', onAccent: '#FFFFFF', soft: '#3B2622', star: '#E2A548', ok: '#5DB075', danger: '#E2573F',
  accentRgb: '226,87,63', solid: '#2C4851', solidSub: '#B9CBD1', link: '#5B9BFF', scrim: 'rgba(0,0,0,.6)',
};
export type ThemeMode = 'system' | 'light' | 'dark';
export const C = { ...LIGHT };
export let isDark = false;
/* Ekranların stilleri ilk yüklemede okunduğu için tema, ekranlar yüklenmeden önce bir kez uygulanır */
export function applyTheme(dark: boolean) { isDark = dark; Object.assign(C, dark ? DARK : LIGHT); }
export const R = { sm: 10, md: 14, lg: 20, pill: 999 };
export const shadow = {
  shadowColor: '#000000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
};
