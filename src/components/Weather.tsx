import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useT } from '../i18n';
import { b } from './common';
import { C, R } from '../theme';

/* Hava durumu: Open-Meteo (ücretsiz, anahtarsız). Bugün + sonraki 6 gün. */
type W = { now: { t: number; c: number }; days: { d: string; c: number; hi: number; lo: number; p: number | null }[] };
const cache: Record<string, { at: number; w: W }> = {};
export function wmo(c: number): [string, string] {
  if (c === 0) return ['☀️', 'Açık'];
  if (c <= 2) return ['⛅', 'Parçalı bulutlu'];
  if (c === 3) return ['☁️', 'Bulutlu'];
  if (c === 45 || c === 48) return ['🌫️', 'Sisli'];
  if (c >= 51 && c <= 57) return ['🌦️', 'Çisenti'];
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return ['🌧️', 'Yağmurlu'];
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return ['🌨️', 'Karlı'];
  if (c >= 95) return ['⛈️', 'Gök gürültülü fırtına'];
  return ['🌤️', 'Parçalı bulutlu'];
}
export async function getWeather(lat: number, lng: number): Promise<W> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`, hit = cache[key];
  if (hit && Date.now() - hit.at < 30 * 60e3) return hit.w;
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const r = await fetch(u); if (!r.ok) throw new Error('weather');
  const j = await r.json();
  const w: W = {
    now: { t: j.current.temperature_2m, c: j.current.weather_code },
    days: (j.daily.time as string[]).map((d, i) => ({ d, c: j.daily.weather_code[i], hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], p: j.daily.precipitation_probability_max?.[i] ?? null })),
  };
  cache[key] = { at: Date.now(), w }; return w;
}
export const getForecast = getWeather;

export default function Weather({ lat, lng }: { lat: number; lng: number }) {
  const { t, num, lang } = useT();
  const [w, setW] = useState<W | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => { let live = true; setW(null); setErr(false); getWeather(lat, lng).then((x) => live && setW(x)).catch(() => live && setErr(true)); return () => { live = false; }; }, [lat, lng]);
  const day = (d: string, i: number) => {
    if (i === 0) return t('Bugün');
    try { return new Date(d + 'T12:00:00').toLocaleDateString(lang, { weekday: 'short' }); } catch { return d.slice(5); }
  };
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{t('Hava durumu')}</Text>
      {err ? <Text style={{ color: C.muted }}>{t('Hava durumu şu an alınamadı.')}</Text>
        : !w ? <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start', marginVertical: 6 }} />
          : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <Text style={{ fontSize: 34 }}>{wmo(w.now.c)[0]}</Text>
                <View>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>{`${num(Math.round(w.now.t))}°`}</Text>
                  <Text style={{ color: C.muted }}>{t(wmo(w.now.c)[1])}</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 10 }}>
                {w.days.map((d, i) => (
                  <View key={d.d} style={{ width: 64, alignItems: 'center', backgroundColor: C.bg, borderRadius: R.sm, paddingVertical: 8 }} accessible accessibilityLabel={`${day(d.d, i)}: ${t(wmo(d.c)[1])}, ${num(Math.round(d.hi))}° / ${num(Math.round(d.lo))}°`}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: C.muted }}>{day(d.d, i)}</Text>
                    <Text style={{ fontSize: 22, marginVertical: 2 }}>{wmo(d.c)[0]}</Text>
                    <Text style={{ fontWeight: '800', color: C.ink }}>{`${num(Math.round(d.hi))}°`}<Text style={{ color: C.muted, fontWeight: '600' }}>{` ${num(Math.round(d.lo))}°`}</Text></Text>
                    {d.p != null && d.p >= 20 && <Text style={{ fontSize: 11.5, color: '#1F6FEB' }}>{`💧 %${num(d.p)}`}</Text>}
                  </View>
                ))}
              </ScrollView>
              <Text style={[b.fine, { marginTop: 6 }]}>{t('Kaynak: Open-Meteo')}</Text>
            </>
          )}
    </View>
  );
}
