import React from 'react';
import { Text, View } from 'react-native';
import { useT } from '../i18n';
import { b } from './common';
import { bestMonths, inSeason, monthsText } from '../lib/season';
import { dishesOf } from '../data/dishes';
import type { Place } from '../data/catalog';
import { C, R } from '../theme';

/* "En iyi zaman" kutusu; şu an mevsimiyse rozet */
export function SeasonBox({ p }: { p: Place }) {
  const { t, lang } = useT();
  const txt = monthsText(bestMonths(p), lang);
  if (!txt) return null;
  const now = inSeason(p);
  return (
    <View style={[b.box, now && { borderColor: C.ok }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={b.boxH}>{`🗓 ${t('En iyi zaman')}`}</Text>
        {now && <SeasonBadge />}
      </View>
      <Text style={b.boxT}>{txt}</Text>
    </View>
  );
}
export function SeasonBadge({ small }: { small?: boolean }) {
  const { t } = useT();
  return (
    <View style={{ backgroundColor: C.ok, borderRadius: R.pill, paddingHorizontal: small ? 7 : 9, paddingVertical: small ? 1 : 3 }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: small ? 11 : 12 }}>{t('Şimdi tam zamanı!')}</Text>
    </View>
  );
}

/* ilin yöresel lezzetleri: Türkçe adı (çevrilmez) + diğer dillerde kısa açıklama */
export function Dishes({ il, title }: { il: string; title?: boolean }) {
  const { t, lang } = useT();
  const list = dishesOf(il);
  if (!list.length) return null;
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🍲 ${title === false ? t('Yöresel lezzetler') : t('{1} yöresel lezzetleri', il)}`}</Text>
      {list.map(([tr, en]) => (
        <Text key={tr} style={[b.boxT, { marginTop: 3 }]}>
          <Text style={{ fontWeight: '700' }}>{`• ${tr}`}</Text>
          {lang !== 'tr' ? <Text style={{ color: C.muted }}>{` — ${en}`}</Text> : null}
        </Text>
      ))}
    </View>
  );
}
