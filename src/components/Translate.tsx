import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useT } from '../i18n';
import { b } from './common';
import { C } from '../theme';

/* =========================================================================
   Yorum çevirisi: MyMemory (ücretsiz, anahtarsız; telefondan doğrudan). Metin 450 baytlık parçalara bölünür.
   ========================================================================= */
export function guessLang(s: string): string {
  if (/[Ѐ-ӿ]/.test(s)) return 'ru';
  if (/[؀-ۿ]/.test(s)) return 'ar';
  if (/[Ͱ-Ͽ]/.test(s)) return 'el';
  if (/[֐-׿]/.test(s)) return 'he';
  if (/[가-힯]/.test(s)) return 'ko';
  if (/[぀-ヿ]/.test(s)) return 'ja';
  if (/[一-鿿]/.test(s)) return 'zh';
  if (/[çğıöşüİ]/i.test(s) || /\b(ve|bir|çok|için|güzel|ama|bu|da|de)\b/i.test(s)) return 'tr';
  if (/[äöüß]/i.test(s) || /\b(und|nicht|sehr|ist|das)\b/i.test(s)) return 'de';
  if (/\b(le|la|les|est|très|une|et)\b/i.test(s)) return 'fr';
  if (/\b(el|los|muy|es|una|y|pero)\b/i.test(s)) return 'es';
  return 'en';
}
const TR_CACHE: Record<string, string> = {};
function chunks(s: string, max = 450) {
  const enc = (x: string) => new TextEncoder().encode(x).length;
  const sentences = s.replace(/([.!?…])\s+/g, '$1\n').split('\n');
  const out: string[] = []; let cur = '';
  for (const part of sentences) {
    if (cur && enc(`${cur} ${part}`) > max) { out.push(cur); cur = part; } else cur = cur ? `${cur} ${part}` : part;
    while (enc(cur) > max) { out.push(cur.slice(0, 150)); cur = cur.slice(150); }
  }
  if (cur) out.push(cur);
  return out;
}
export async function translate(text: string, to: string): Promise<string> {
  const from = guessLang(text), key = `${from}|${to}|${text}`;
  if (TR_CACHE[key]) return TR_CACHE[key];
  const parts = await Promise.all(chunks(text).map(async (q) => {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${from}|${to}`);
    const j = await r.json();
    if (Number(j?.responseStatus) !== 200 || !j?.responseData?.translatedText) throw new Error('translate');
    return String(j.responseData.translatedText);
  }));
  return (TR_CACHE[key] = parts.join(' '));
}
export function TranslateLink({ text }: { text: string }) {
  const { t, lang } = useT();
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const to = lang === 'no' ? 'nb' : lang;
  if (!text || text.length < 3 || guessLang(text) === lang) return null;
  async function go() {
    if (out) { setOut(null); return; }
    setBusy(true); setErr(false);
    try { setOut(await translate(text, to)); } catch { setErr(true); } finally { setBusy(false); }
  }
  return (
    <View style={{ marginTop: 6 }}>
      <Pressable onPress={go} hitSlop={8} accessibilityRole="button">
        <Text style={{ color: C.link, fontWeight: '700', fontSize: 13.5 }}>{busy ? t('Çevriliyor…') : out ? t('Orijinalini göster') : `🌐 ${t('Çevir')}`}</Text>
      </Pressable>
      {err && <Text style={{ color: C.danger, fontSize: 13 }}>{t('Şu an çevrilemedi, sonra tekrar dene.')}</Text>}
      {!!out && <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21, marginTop: 4, fontStyle: 'italic' }}>{out}</Text>}
      {!!out && <Text style={b.fine}>{t('Makine çevirisi · MyMemory')}</Text>}
    </View>
  );
}

