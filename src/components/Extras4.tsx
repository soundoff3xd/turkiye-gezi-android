import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useT } from '../i18n';
import { Btn, Chip, Header, b } from './common';
import { supabase } from '../lib/supabase';
import { useLocation, fmtDist } from '../lib/location';
import { useNav } from '../lib/ui';
import { DAY_NAMES, hhmm, openState, stateText } from '../lib/hours';
import { mosqueState } from '../lib/prayer';
import { lineBoxes, osmInBoxes, type OsmItem } from '../lib/overpass';
import { meters, type Place } from '../data/catalog';
import { getForecast, wmo } from './Weather';
import { C, R } from '../theme';

/* ---------- açılış saatleri (OpenStreetMap, sunucu doldurur) ---------- */
let hoursMap: Map<string, string> | null = null;
let hoursLoading: Promise<Map<string, string>> | null = null;
const hoursSubs = new Set<() => void>();
async function loadHours(): Promise<Map<string, string>> {
  if (hoursMap) return hoursMap;
  if (hoursLoading) return hoursLoading;
  hoursLoading = (async () => {
    try {
      const all: { place_id: string; oh: string }[] = [];
      for (let from = 0; from < 3000; from += 1000) {
        const { data, error } = await supabase.from('place_hours').select('place_id,oh').not('oh', 'is', null).range(from, from + 999);
        if (error) throw error;
        all.push(...((data as any[]) || []));
        if (!data || data.length < 1000) break;
      }
      hoursMap = new Map(all.map((r) => [r.place_id, r.oh]));
      AsyncStorage.setItem('gezi-hours', JSON.stringify(all)).catch(() => {});
    } catch {
      try { const raw = await AsyncStorage.getItem('gezi-hours'); hoursMap = new Map(((raw ? JSON.parse(raw) : []) as any[]).map((r) => [r.place_id, r.oh])); } catch { hoursMap = new Map(); }
    }
    hoursSubs.forEach((f) => f());
    return hoursMap!;
  })();
  return hoursLoading;
}
export function useHours() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); hoursSubs.add(f); loadHours(); return () => { hoursSubs.delete(f); }; }, []);
  return hoursMap;
}
/* "Şu an açık" süzgeci için: açık mı (bilinmiyorsa null) */
export function isOpenNow(map: Map<string, string> | null, id: string): boolean | null {
  const oh = map?.get(id);
  if (!oh) return null;
  const st = openState(oh);
  return st ? st.open : null;
}
const DAY_SHORT: Record<string, string> = { Mo: 'Pzt', Tu: 'Sal', We: 'Çar', Th: 'Per', Fr: 'Cum', Sa: 'Cmt', Su: 'Paz' };
const prettyOH = (oh: string, t: (s: string) => string) => oh
  .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => t(DAY_SHORT[d]))
  .replace(/\boff\b|\bclosed\b/gi, t('kapalı')).replace(/\bPH\b/g, t('resmi tatil'))
  .replace(/;\s*/g, '\n');

export function HoursBox({ p }: { p: Place }) {
  const { t } = useT();
  const map = useHours();
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(h); }, []);
  const oh = map?.get(p.id);
  if (!oh) return null;
  const st = openState(oh);
  const s = st ? stateText(st, t, (d) => t(DAY_NAMES[d])) : null;
  const col = !s ? C.muted : s.tone === 'ok' ? '#1E8E3E' : s.tone === 'warn' ? '#C77700' : C.danger;
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🕒 ${t('Açılış saatleri')}`}</Text>
      {s && <Text style={{ color: col, fontWeight: '800', fontSize: 16 }}>{s.txt}</Text>}
      <Text style={[b.boxT, { marginTop: 4 }]}>{prettyOH(oh, t)}</Text>
      <Text style={b.fine}>{t('OpenStreetMap verisi; bayram ve özel günlerde değişebilir. Gitmeden önce resmi kaynaktan kontrol et.')}</Text>
    </View>
  );
}

/* ---------- cami ziyaret saatleri ---------- */
export function MosqueBox({ p }: { p: Place }) {
  const { t } = useT();
  const [, tick] = useState(0);
  useEffect(() => { const h = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(h); }, []);
  if (p.c !== 'cami') return null;
  const m = mosqueState(p.lat, p.lng);
  const head = m.state === 'open' ? { txt: t('Şu an ziyarete uygun'), col: '#1E8E3E' }
    : m.state === 'prayer' ? { txt: `${t(m.inPrayer![2])} · ${t('{1} sonrası tekrar uygun', hhmm(m.inPrayer![1]))}`, col: '#C77700' }
      : { txt: t('Ziyaret saatleri dışında'), col: C.danger };
  // gün içindeki uygun aralıklar
  const open: [number, number][] = [];
  let cur = m.w.visitStart;
  for (const [a, bb] of m.w.closed) { if (a > cur && a < m.w.visitEnd) open.push([cur, Math.min(a, m.w.visitEnd)]); cur = Math.max(cur, bb); }
  if (cur < m.w.visitEnd) open.push([cur, m.w.visitEnd]);
  const times: [string, number][] = [['İmsak', m.p.imsak], ['Güneş', m.p.gunes], ['Öğle', m.p.ogle], ['İkindi', m.p.ikindi], ['Akşam', m.p.aksam], ['Yatsı', m.p.yatsi]];
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`🕌 ${t('Ziyaret saatleri')}`}</Text>
      <Text style={{ color: head.col, fontWeight: '800', fontSize: 16 }}>{head.txt}</Text>
      <Text style={[b.boxT, { marginTop: 6 }]}>{`${t('Bugün uygun aralıklar')}: ${open.map(([a, bb]) => `${hhmm(a)}–${hhmm(bb)}`).join(', ')}`}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {times.map(([n, v]) => (
          <View key={n} style={{ backgroundColor: C.bg, borderRadius: R.sm, paddingHorizontal: 9, paddingVertical: 5, alignItems: 'center', minWidth: 62 }}>
            <Text style={{ color: C.muted, fontSize: 11.5, fontWeight: '700' }}>{t(n)}</Text>
            <Text style={{ color: C.ink, fontWeight: '800' }}>{hhmm(v)}</Text>
          </View>
        ))}
      </View>
      {m.friday && <Text style={[b.boxT, { marginTop: 8 }]}>{t('Cuma günleri öğle namazı daha kalabalık ve uzundur; öğle saatlerinden kaçın.')}</Text>}
      <Text style={[b.boxT, { marginTop: 8 }]}>{t('Ayakkabılar girişte çıkarılır. Kadınlar başını örter; omuzlar ve dizler kapalı olmalıdır. Namaz kılanların önünden geçme, fotoğraf çekerken flaş kullanma.')}</Text>
      <Text style={b.fine}>{t('Vakitler hesaplanmıştır ve birkaç dakika farklı olabilir.')}</Text>
    </View>
  );
}

/* ---------- acil durum ---------- */
const NUMBERS: [string, string, string][] = [
  ['112', 'Acil çağrı', 'Ambulans, polis, itfaiye, jandarma ve sahil güvenlik: tüm acil durumlar için tek numara. Ücretsiz aranır.'],
  ['157', 'YİMER · Yabancılar iletişim merkezi', 'Yabancılar için 7/24 danışma: Türkçe, İngilizce, Arapça, Rusça, Almanca ve Farsça.'],
  ['177', 'Orman yangını ihbar', 'Ormanda duman ya da ateş görürsen.'],
];
const ER_KINDS: [string, string, string][] = [['hospital', '🏥', 'Hastane'], ['pharmacy', '💊', 'Eczane'], ['police', '👮', 'Polis']];
export function EmergencyScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { pop } = useNav();
  const { pos, request } = useLocation();
  const [kind, setKind] = useState('hospital');
  const [items, setItems] = useState<(OsmItem & { d: number })[] | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'noloc'>('idle');
  async function load(k: string) {
    setKind(k); setItems(null); setState('loading');
    try {
      let me = pos;
      if (!me) { try { me = await request(); } catch { me = null; } }
      if (!me) { setState('noloc'); return; }
      const key = `gezi-er-${k}`;
      let list: OsmItem[];
      try {
        list = await osmInBoxes(lineBoxes([[me.lng, me.lat]], k === 'hospital' ? 8000 : 3000), [k]);
        AsyncStorage.setItem(key, JSON.stringify({ lat: me.lat, lng: me.lng, list })).catch(() => {});
      } catch {
        const raw = await AsyncStorage.getItem(key); // çevrimdışı: son bulunanlar
        if (!raw) throw new Error('offline');
        list = JSON.parse(raw).list;
      }
      setItems(list.map((x) => ({ ...x, d: meters(me.lat, me.lng, x.lat, x.lng) })).sort((a, c) => (c.em || 0) - (a.em || 0) || a.d - c.d).slice(0, 12));
      setState('idle');
    } catch { setState('error'); }
  }
  useEffect(() => { load('hospital'); }, []); // eslint-disable-line
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Acil durum')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {NUMBERS.map(([n, l, d], i) => (
          <Pressable key={n} onPress={() => Linking.openURL(`tel:${n}`)} accessibilityRole="button" accessibilityLabel={`${t(l)} ${n}`}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: i === 0 ? '#C62828' : C.surface, borderRadius: R.lg, borderWidth: i === 0 ? 0 : 1, borderColor: C.line, padding: 14, marginTop: i ? 10 : 0 }, pressed && { opacity: 0.85 }]}>
            <Text style={{ fontSize: i === 0 ? 34 : 24, fontWeight: '900', color: i === 0 ? '#FFFFFF' : C.ink, minWidth: 64 }}>{n}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: i === 0 ? '#FFFFFF' : C.ink, fontWeight: '800', fontSize: 16 }}>{t(l)}</Text>
              <Text style={{ color: i === 0 ? '#FFE9E9' : C.muted, fontSize: 13, lineHeight: 18 }}>{t(d)}</Text>
            </View>
            <Text style={{ fontSize: 22 }}>📞</Text>
          </Pressable>
        ))}
        <Text style={b.fine}>{t('155, 156 ve 110 gibi eski numaralar da 112’ye yönlendirilir.')}</Text>
        <Pressable onPress={() => Linking.openURL('https://www.mfa.gov.tr/diplomatic-missions-in-turkey.en.mfa')} style={[b.box, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} accessibilityRole="link">
          <Text style={{ fontSize: 22 }}>🏛</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '800' }}>{t('Büyükelçilik ve konsolosluklar')}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>{t('Pasaportunu kaybettiysen ülkenin temsilciliğine başvur.')}</Text>
          </View>
          <Text style={{ color: C.link, fontWeight: '800' }}>↗</Text>
        </Pressable>

        <Text style={[b.h2, { fontSize: 18, marginTop: 22 }]}>{t('Yakınındakiler')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {ER_KINDS.map(([k, ic, l]) => <Chip key={k} label={`${ic} ${t(l)}`} on={kind === k} onPress={() => load(k)} />)}
        </View>
        {state === 'loading' && <ActivityIndicator color={C.accent} style={{ marginTop: 16 }} />}
        {state === 'noloc' && <Text style={b.fine}>{t('Yakındaki yerleri görmek için konum izni ver.')}</Text>}
        {state === 'error' && <View><Text style={b.fine}>{t('Şu an yüklenemedi. İnternet bağlantını kontrol et.')}</Text><Btn small label={t('Tekrar dene')} onPress={() => load(kind)} style={{ marginTop: 8, alignSelf: 'flex-start' }} /></View>}
        {items && items.length === 0 && <Text style={b.fine}>{t('Yakında bulunamadı.')}</Text>}
        {items && items.map((x) => (
          <View key={`${x.lat},${x.lng}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '700' }} numberOfLines={1}>{x.n || t(ER_KINDS.find((e) => e[0] === x.k)?.[2] || '')}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{[fmtDist(x.d, num), x.em ? t('Acil servis var') : '', x.h ? t('7/24 açık') : ''].filter(Boolean).join(' · ')}</Text>
            </View>
            {!!x.ph && <Pressable onPress={() => Linking.openURL(`tel:${x.ph!.split(';')[0].replace(/[^\d+]/g, '')}`)} hitSlop={6} style={{ padding: 8 }} accessibilityLabel={t('Ara')}><Text style={{ fontSize: 20 }}>📞</Text></Pressable>}
            <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`)} hitSlop={6} style={{ padding: 8 }} accessibilityLabel={t('Yol tarifi')}><Text style={{ fontSize: 20 }}>🧭</Text></Pressable>
          </View>
        ))}
        {kind === 'pharmacy' && <Text style={b.fine}>{t('Gece ve tatil günlerinde nöbetçi eczane listesi her eczanenin kapısında asılıdır.')}</Text>}
        <Text style={b.fine}>© OpenStreetMap</Text>
      </ScrollView>
    </View>
  );
}

/* ---------- döviz kurları (TCMB) ---------- */
export type Fx = { date: string; rates: Record<string, number>; stale?: boolean };
let fxMem: Fx | null = null;
export async function getFx(): Promise<Fx | null> {
  if (fxMem) return fxMem;
  try {
    const { data, error } = await supabase.functions.invoke('fx', { body: {} });
    if (error || !(data as Fx)?.rates) throw error || new Error('fx');
    fxMem = data as Fx;
    AsyncStorage.setItem('gezi-fx', JSON.stringify(fxMem)).catch(() => {});
    return fxMem;
  } catch {
    try { const raw = await AsyncStorage.getItem('gezi-fx'); if (raw) { fxMem = { ...JSON.parse(raw), stale: true }; return fxMem; } } catch { /* yok */ }
    return null;
  }
}
export function useFx() {
  const [fx, setFx] = useState<Fx | null>(fxMem);
  useEffect(() => { let live = true; getFx().then((x) => live && setFx(x)); return () => { live = false; }; }, []);
  return fx;
}
/* tutarı TL'ye çevir (kur yoksa null) */
export const toTRY = (fx: Fx | null, amount: number, cur: string) => (cur === 'TRY' ? amount : fx?.rates[cur] ? amount * fx.rates[cur] : null);

const FX_CODES = ['EUR', 'USD', 'GBP', 'RUB', 'CHF', 'SAR', 'AED', 'JPY', 'CNY', 'AZN', 'SEK', 'NOK', 'DKK', 'CAD', 'AUD', 'PLN', 'RON', 'KWD', 'QAR'];
export function FxScreen() {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { pop, push } = useNav();
  const fx = useFx();
  const [cur, setCur] = useState('EUR');
  const [amt, setAmt] = useState('100');
  const [dir, setDir] = useState<'to' | 'from'>('to'); // to: yabancı → TL
  const v = parseFloat(amt.replace(',', '.')) || 0;
  const rate = fx?.rates[cur];
  const res = rate ? (dir === 'to' ? v * rate : v / rate) : null;
  const fmt = (n: number, c: string) => { try { return n.toLocaleString(lang, { style: 'currency', currency: c, maximumFractionDigits: 2 }); } catch { return `${n.toFixed(2)} ${c}`; } };
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Döviz çevirici')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        {!fx ? <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} /> : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FX_CODES.filter((c) => fx.rates[c]).map((c) => <Chip key={c} label={c} on={cur === c} onPress={() => setCur(c)} />)}
            </ScrollView>
            <View style={[b.card, { marginTop: 14 }]}>
              <Text style={b.boxH}>{dir === 'to' ? `${cur} → TRY` : `TRY → ${cur}`}</Text>
              <TextInput value={amt} onChangeText={setAmt} keyboardType="decimal-pad" style={{ fontSize: 30, fontWeight: '800', color: C.ink, paddingVertical: 4 }} accessibilityLabel={t('Tutar')} />
              <Text style={{ fontSize: 26, fontWeight: '800', color: C.accent }}>{res != null ? `= ${fmt(res, dir === 'to' ? 'TRY' : cur)}` : '—'}</Text>
              <Btn small label={`⇅ ${t('Yönü değiştir')}`} onPress={() => setDir((d) => (d === 'to' ? 'from' : 'to'))} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
            </View>
            {rate && <Text style={b.fine}>{`1 ${cur} = ${fmt(rate, 'TRY')} · ${t('TCMB döviz satış kuru, {1}', fx.date)}${fx.stale ? ` · ${t('çevrimdışı, son bilinen kur')}` : ''}`}</Text>}
            <Text style={b.fine}>{t('Döviz bürosu ve kart kurları farklı olabilir; gösterilen değer yaklaşıktır.')}</Text>
            <View style={[b.box]}>
              {['EUR', 'USD', 'GBP'].filter((c) => fx.rates[c]).map((c) => (
                <View key={c} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ color: C.ink, fontWeight: '700' }}>{`1 ${c}`}</Text>
                  <Text style={{ color: C.ink }}>{fmt(fx.rates[c], 'TRY')}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {fx === null && <Text style={b.fine}>{t('Kurlar şu an alınamadı.')}</Text>}
        <Btn label={`🏷 ${t('Fiyat rehberi')}`} onPress={() => push({ name: 'prices' })} style={{ marginTop: 16 }} />
      </ScrollView>
    </View>
  );
}

/* ---------- fiyat rehberi (app_settings.price_guide; uygulamayı güncellemeden değiştirilebilir) ---------- */
type Guide = { updated: string; items: [string, string, string, string?][]; tips: string[] };
export function PricesScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { pop, push } = useNav();
  const [g, setG] = useState<Guide | null | undefined>(undefined);
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'price_guide').maybeSingle().then(({ data }) => {
      try { const v = JSON.parse((data as any)?.value || 'null'); setG(v); AsyncStorage.setItem('gezi-prices', JSON.stringify(v)).catch(() => {}); } catch { setG(null); }
    }, async () => { try { const raw = await AsyncStorage.getItem('gezi-prices'); setG(raw ? JSON.parse(raw) : null); } catch { setG(null); } });
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Fiyat rehberi')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {g === undefined ? <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} /> : !g ? <Text style={b.fine}>{t('Fiyat rehberi şu an yüklenemedi.')}</Text> : (
          <>
            <Text style={{ color: C.muted }}>{t('Yaklaşık fiyatlar; enflasyon nedeniyle sık değişir. Parantez içinde fiyatın tarihi var.')}</Text>
            <View style={[b.card]}>
              {g.items.map(([ic, l, pr, when], i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{ic}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.ink, fontWeight: '700' }}>{t(l)}</Text>
                    {!!when && <Text style={{ color: C.muted, fontSize: 12.5 }}>{`(${t(when)})`}</Text>}
                  </View>
                  <Text style={{ color: C.ink, fontWeight: '900', fontSize: 16 }}>{pr}</Text>
                </View>
              ))}
            </View>
            <Text style={[b.h2, { fontSize: 18, marginTop: 20 }]}>{t('İpuçları')}</Text>
            {g.tips.map((x, i) => <Text key={i} style={[b.boxT, { marginTop: 8 }]}>{`• ${t(x)}`}</Text>)}
          </>
        )}
        <Btn label={`💱 ${t('Döviz çevirici')}`} onPress={() => push({ name: 'fx' })} style={{ marginTop: 18 }} />
      </ScrollView>
    </View>
  );
}

/* ---------- gezi gününe hava tahmini (plan günleri) ---------- */
export function DayWeather({ lat, lng, offset }: { lat: number; lng: number; offset: number }) {
  const { t, num } = useT();
  const [d, setD] = useState<{ c: number; hi: number; lo: number; p: number | null } | null | undefined>(undefined);
  useEffect(() => { let live = true; setD(undefined); getForecast(lat, lng).then((w) => live && setD(w.days[offset] || null)).catch(() => live && setD(null)); return () => { live = false; }; }, [lat, lng, offset]);
  if (d === undefined) return <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start', marginTop: 6 }} />;
  if (!d) return <Text style={b.fine}>{t('Bu gün için hava tahmini henüz yok.')}</Text>;
  const [ic, l] = wmo(d.c);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.soft, borderRadius: R.md, padding: 10, marginTop: 8 }}>
      <Text style={{ fontSize: 26 }}>{ic}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.ink, fontWeight: '800' }}>{`${t(l)} · ${num(Math.round(d.hi))}° / ${num(Math.round(d.lo))}°`}</Text>
        {d.p != null && <Text style={{ color: C.muted, fontSize: 13 }}>{t('Yağış olasılığı %{1}', num(d.p))}</Text>}
        {d.p != null && d.p >= 60 && <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>{t('Yağmurlu görünüyor; kapalı mekânları bu güne koymayı düşün.')}</Text>}
      </View>
    </View>
  );
}
export const dateLabel = (offset: number, lang: string, t: (s: string) => string) => {
  if (offset === 0) return t('Bugün');
  if (offset === 1) return t('Yarın');
  try { return new Date(Date.now() + offset * 864e5).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' }); } catch { return `+${offset}`; }
};
export function useDayIdx() { return useMemo(() => [0, 1, 2, 3, 4, 5, 6], []); }
