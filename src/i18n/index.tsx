import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import site from './site.json';
import extra from './app.json';
import more20 from './more20.json';

/* Web sitesiyle aynı çeviri sistemi: Türkçe metin anahtar, çeviriler 39 dilde dizi olarak
   (ilk 19 dil site.json/app.json'da, eklenen 20 dil more20.json'da).
   Bir dilde çeviri yoksa İngilizceye, o da yoksa Türkçeye düşer. */
export const LANGS: Record<string, string> = {
  tr: 'Türkçe', en: 'English', de: 'Deutsch', ru: 'Русский', ar: 'العربية', fa: 'فارسی', fr: 'Français', es: 'Español',
  it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', ro: 'Română', el: 'Ελληνικά', uk: 'Українська',
  bg: 'Български', az: 'Azərbaycanca', zh: '中文', ja: '日本語', ko: '한국어',
  ku: 'Kurdî', ka: 'ქართული', kk: 'Қазақша', uz: 'Oʻzbekcha', sq: 'Shqip', sr: 'Српски', hr: 'Hrvatski', cs: 'Čeština',
  hu: 'Magyar', sv: 'Svenska', no: 'Norsk', da: 'Dansk', fi: 'Suomi', he: 'עברית', hi: 'हिन्दी', ur: 'اردو',
  id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', th: 'ไทย', vi: 'Tiếng Việt',
};
const L20 = ['ku', 'ka', 'kk', 'uz', 'sq', 'sr', 'hr', 'cs', 'hu', 'sv', 'no', 'da', 'fi', 'he', 'hi', 'ur', 'id', 'ms', 'th', 'vi'];
// cihaz dil kodlarının eş anlamlıları
const ALIAS: Record<string, string> = { nb: 'no', nn: 'no', iw: 'he', in: 'id', ckb: 'ku', kmr: 'ku', bs: 'hr' };
const ORDER = ['en', 'de', 'ru', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'ro', 'el', 'uk', 'bg', 'az', 'ar', 'fa', 'zh', 'ja', 'ko', ...L20];
const LIDX: Record<string, number> = Object.fromEntries(ORDER.map((l, i) => [l, i]));
const DICT: Record<string, (string | null)[]> = { ...(site as any), ...(extra as any) };
for (const [k, arr] of Object.entries(more20 as Record<string, (string | null)[]>)) {
  const base = (DICT[k] || []).slice(0, 19);
  while (base.length < 19) base.push(null);
  DICT[k] = base.concat(arr);
}
export const RTL = new Set(['ar', 'fa', 'he', 'ur']);

function look(s: string, lang: string): string {
  if (lang === 'tr' || !s) return s;
  const e = DICT[s];
  if (e) return e[LIDX[lang]] ?? e[0] ?? s;
  if (s.includes(' · ')) return s.split(' · ').map((x) => look(x, lang)).join(' · ');
  return s;
}

export type TFn = (s: string, ...args: (string | number)[]) => string;
type Ctx = { lang: string; setLang: (l: string) => void; t: TFn; num: (n: number, digits?: number) => string; ago: (ts: string | number) => string; rtl: boolean };
const LangCtx = createContext<Ctx | null>(null);
export const useT = () => useContext(LangCtx) as Ctx;

function deviceLang() {
  try {
    const raw = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
    const l = ALIAS[raw] || raw;
    return LANGS[l] ? l : 'tr';
  } catch { return 'tr'; }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(deviceLang());
  useEffect(() => { AsyncStorage.getItem('gezi-lang').then((l) => { if (l && LANGS[l]) setLangState(l); }).catch(() => {}); }, []);
  const setLang = useCallback((l: string) => { setLangState(l); AsyncStorage.setItem('gezi-lang', l).catch(() => {}); }, []);

  const value = useMemo<Ctx>(() => {
    const t: TFn = (s, ...args) => {
      let out = look(s, lang);
      args.forEach((a, i) => { out = out.split(`{${i + 1}}`).join(String(a)); });
      return out;
    };
    const num = (n: number, digits = 0) => {
      try { return n.toLocaleString(lang + '-u-nu-latn', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
      catch { return digits ? n.toFixed(digits) : String(Math.round(n)); }
    };
    const ago = (ts: string | number) => {
      const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
      if (s < 60) return t('az önce');
      const units: [number, string][] = [[31536000, '{1} yıl önce'], [2592000, '{1} ay önce'], [604800, '{1} hafta önce'], [86400, '{1} gün önce'], [3600, '{1} saat önce'], [60, '{1} dakika önce']];
      for (const [n, k] of units) if (s >= n) return t(k, num(Math.floor(s / n)));
      return t('az önce');
    };
    return { lang, setLang, t, num, ago, rtl: RTL.has(lang) };
  }, [lang, setLang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}
