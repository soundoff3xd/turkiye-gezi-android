import React from 'react';
import * as Font from 'expo-font';
import type { FontKey } from '../theme';

/* Seçilebilir yazı tipleri (Google Fonts, SIL Open Font License; lisanslar assets/fonts içinde).
   Her biri için düz / kalın / çok kalın dosyası; yazının kalınlığına göre doğru dosya seçilir. */
type Fam = { r: string; b: string; x: string; files: Record<string, any> };
const FONTS: Record<Exclude<FontKey, 'system'>, Fam> = {
  nunito: { r: 'Nunito-400', b: 'Nunito-700', x: 'Nunito-800', files: {
    'Nunito-400': require('../../assets/fonts/Nunito-400.ttf'), 'Nunito-700': require('../../assets/fonts/Nunito-700.ttf'), 'Nunito-800': require('../../assets/fonts/Nunito-800.ttf') } },
  lora: { r: 'Lora-400', b: 'Lora-700', x: 'Lora-700', files: {
    'Lora-400': require('../../assets/fonts/Lora-400.ttf'), 'Lora-700': require('../../assets/fonts/Lora-700.ttf') } },
  montserrat: { r: 'Montserrat-400', b: 'Montserrat-700', x: 'Montserrat-800', files: {
    'Montserrat-400': require('../../assets/fonts/Montserrat-400.ttf'), 'Montserrat-700': require('../../assets/fonts/Montserrat-700.ttf'), 'Montserrat-800': require('../../assets/fonts/Montserrat-800.ttf') } },
  comfortaa: { r: 'Comfortaa-400', b: 'Comfortaa-700', x: 'Comfortaa-700', files: {
    'Comfortaa-400': require('../../assets/fonts/Comfortaa-400.ttf'), 'Comfortaa-700': require('../../assets/fonts/Comfortaa-700.ttf') } },
};
export const FONT_NAMES: [FontKey, string, string][] = [
  ['system', 'Sistem', ''], ['nunito', 'Yuvarlak', 'Nunito-700'], ['montserrat', 'Modern', 'Montserrat-700'], ['lora', 'Klasik', 'Lora-700'], ['comfortaa', 'Eğlenceli', 'Comfortaa-700'],
];
/* önizleme için tüm yazı tiplerinin kalın hâlini yükle */
export async function loadPreviewFonts() {
  try { await Font.loadAsync(Object.fromEntries(Object.values(FONTS).map((f) => [f.b, f.files[f.b]]))); } catch { /* */ }
}

/* Uygulama yüklenmeden önce: seçili yazı tipini yükle, Text ve TextInput'u yazı tipi + boyut uygulayacak şekilde sar */
export async function setupFonts(key: FontKey, scale: number) {
  const fam = key !== 'system' ? FONTS[key] : null;
  if (fam) { try { await Font.loadAsync(fam.files); } catch { return; } }
  if (!fam && scale === 1) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  let Anc: React.Context<boolean> | null = null;   // iç içe metin mi? (yazı boyutu üstten miras alınır)
  try { const m = require('react-native/Libraries/Text/TextAncestor'); Anc = (m && (m.default || m)) || null; } catch { Anc = null; }
  const pick = (w: unknown) => {
    const n = w === 'bold' ? 700 : w === 'normal' || w == null ? 400 : parseInt(String(w), 10) || 400;
    return !fam ? undefined : n >= 800 ? fam.x : n >= 600 ? fam.b : fam.r;
  };
  const wrap = (Orig: any, isInput: boolean) => {
    const W = React.forwardRef((props: any, ref) => {
      const nested = !isInput && Anc ? React.useContext(Anc) : false;
      const st = RN.StyleSheet.flatten(props.style) || {};
      const extra: Record<string, unknown> = {};
      if (fam) { extra.fontFamily = pick(st.fontWeight); extra.fontWeight = 'normal'; }
      if (scale !== 1) {
        if (typeof st.fontSize === 'number') extra.fontSize = st.fontSize * scale;
        else if (!nested) extra.fontSize = 14 * scale;
        if (typeof st.lineHeight === 'number') extra.lineHeight = st.lineHeight * scale;
      }
      return React.createElement(Orig, { ...props, ref, style: [props.style, extra] });
    });
    W.displayName = Orig.displayName || (isInput ? 'TextInput' : 'Text');
    return W;
  };
  const T = wrap(RN.Text, false), TI = wrap(RN.TextInput, true);
  try {
    Object.defineProperty(RN, 'Text', { configurable: true, enumerable: true, get: () => T });
    Object.defineProperty(RN, 'TextInput', { configurable: true, enumerable: true, get: () => TI });
  } catch { /* değiştirilemezse sistem yazı tipiyle devam */ }
}
