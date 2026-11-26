import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { Btn, Chip, Empty, Header, b } from './common';
import ReportSheet, { type ReportReq } from './ReportSheet';
import AccountMenu from './AccountMenu';
import { supabase } from '../lib/supabase';
import { useAuth, trError } from '../lib/auth';
import { useStore } from '../lib/store';
import { useTrip } from '../lib/trip';
import { useNav, useToast } from '../lib/ui';
import { track } from '../lib/telemetry';
import type { Place } from '../data/catalog';
import FEST from '../data/festivals.json';
import TRANSPORT from '../data/transport.json';
import FAQ from '../data/faq.json';
import { C, R } from '../theme';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* ---------- ziyaretçi bilgileri: erişilebilirlik, çocuklarla, evcil hayvan (ziyaretçi işaretlemesi) ---------- */
const VK: { k: 'access' | 'kids' | 'pets'; ic: string; l: string; opts: [number, string][] }[] = [
  { k: 'access', ic: '♿', l: 'Erişilebilirlik', opts: [[2, 'Erişilebilir'], [1, 'Kısmen'], [0, 'Erişilemez']] },
  { k: 'kids', ic: '🧒', l: 'Çocuklarla', opts: [[2, 'Uygun'], [1, 'Kısmen'], [0, 'Uygun değil']] },
  { k: 'pets', ic: '🐕', l: 'Evcil hayvan', opts: [[2, 'Kabul ediliyor'], [1, 'Kısmen'], [0, 'Kabul edilmiyor']] },
];
export function VisitorInfoBox({ p }: { p: Place }) {
  const { t, num } = useT();
  const { me } = useAuth();
  const [rows, setRows] = useState<{ val: number; user_id: string; kind: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from('place_access').select('val,user_id,kind').eq('place_id', p.id).limit(1500);
    setRows((data as any[]) || []);
  }, [p.id]);
  useEffect(() => { load(); }, [load]);
  if (!rows) return null;
  async function vote(kind: string, v: number, mine?: number) {
    if (!me || busy) return;
    setBusy(true);
    if (mine === v) await supabase.from('place_access').delete().eq('place_id', p.id).eq('user_id', me.id).eq('kind', kind);
    else await supabase.from('place_access').upsert({ place_id: p.id, user_id: me.id, kind, val: v });
    track('act:visitor_info'); setBusy(false); load();
  }
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`👥 ${t('Ziyaretçi bilgileri')}`}</Text>
      {VK.map(({ k, ic, l, opts }) => {
        const rs = rows.filter((r) => r.kind === k), mine = me ? rs.find((r) => r.user_id === me.id)?.val : undefined;
        const cnt = [0, 1, 2].map((v) => rs.filter((r) => r.val === v).length);
        const top = rs.length ? [2, 1, 0].reduce((a, v) => (cnt[v] > cnt[a] ? v : a), 2) : -1;
        return (
          <View key={k} style={{ marginTop: 8 }}>
            <Text style={{ color: C.ink, fontWeight: '700' }}>{`${ic} ${t(l)}`}
              <Text style={{ color: C.muted, fontWeight: '400' }}>{top < 0 ? ` · ${t('Henüz bilgi yok')}` : ` · ${t(opts.find((o) => o[0] === top)![1])} (${t('{1} ziyaretçiye göre', num(rs.length))})`}</Text>
            </Text>
            {me && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                {opts.map(([v, lab]) => (
                  <Pressable key={v} onPress={() => vote(k, v, mine)} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: mine === v }}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: R.sm, borderWidth: 1, borderColor: mine === v ? C.accent : C.chipLine, backgroundColor: mine === v ? C.soft : 'transparent' }}>
                    <Text style={{ color: C.ink, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{`${t(lab)}${cnt[v] ? ` (${num(cnt[v])})` : ''}`}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}
      <Text style={[b.fine, { marginTop: 8 }]}>{t('Ziyaretçilerin bildirdiği bilgidir; gitmeden önce yeri arayıp sor.')}</Text>
    </View>
  );
}

/* ---------- ziyaretçilere soru sor ---------- */
type Q = { id: string; user_id: string; body: string; created_at: string; hidden: boolean; profiles?: { name: string } | null; place_answers: { id: string; user_id: string; body: string; created_at: string; hidden: boolean; profiles?: { name: string } | null }[] };
export function QATab({ p }: { p: Place }) {
  const { t, ago } = useT();
  const { me } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Q[] | null>(null);
  const [q, setQ] = useState('');
  const [ans, setAns] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState<ReportReq>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('place_questions')
      .select('id,user_id,body,created_at,hidden,profiles!place_questions_user_id_profiles_fkey(name),place_answers(id,user_id,body,created_at,hidden,profiles!place_answers_user_id_profiles_fkey(name))')
      .eq('place_id', p.id).order('created_at', { ascending: false }).limit(50);
    if (error) { setList([]); return; }
    setList(((data as any[]) || []).map((x) => ({ ...x, place_answers: (x.place_answers || []).sort((a: any, c: any) => a.created_at.localeCompare(c.created_at)) })));
  }, [p.id]);
  useEffect(() => { load(); }, [load]);
  async function ask() {
    const body = q.trim(); if (!me || body.length < 5 || busy) return;
    setBusy(true);
    const { error } = await supabase.from('place_questions').insert({ place_id: p.id, body: body.slice(0, 300) });
    setBusy(false);
    if (error) { toast(trError(error)); return; }
    track('act:question'); setQ(''); load(); toast('Sorun gönderildi');
  }
  async function answer(qid: string) {
    const body = (ans[qid] || '').trim(); if (!me || !body || busy) return;
    setBusy(true);
    const { error } = await supabase.from('place_answers').insert({ question_id: qid, body: body.slice(0, 500) });
    setBusy(false);
    if (error) { toast(trError(error)); return; }
    track('act:answer'); setAns((a) => ({ ...a, [qid]: '' })); load();
  }
  async function del(table: 'place_questions' | 'place_answers', id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) toast(trError(error)); else load();
  }
  const input = { borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 8, color: C.ink, backgroundColor: C.surface } as const;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Otopark var mı, kışın açık mı? Merak ettiğini sor; buraya gitmiş gezginler cevaplasın.')}</Text>
      {me && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
          <TextInput value={q} onChangeText={setQ} placeholder={t('Sorunu yaz')} placeholderTextColor={C.muted} maxLength={300} multiline style={[input, { flex: 1, minHeight: 44 }]} />
          <Btn small kind="pri" label={t('Sor')} onPress={ask} busy={busy} disabled={q.trim().length < 5} />
        </View>
      )}
      {list == null ? <Text style={{ color: C.muted, marginTop: 14 }}>{t('Yükleniyor…')}</Text>
        : !list.length ? <Empty title={t('Henüz soru yok')} note={t('İlk soruyu sen sor.')} />
          : list.map((x) => (
            <View key={x.id} style={[b.card, { marginTop: 10 }]}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15 }}>{`❓ ${x.body}`}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{`${x.profiles?.name || '?'} · ${ago(x.created_at)}`}</Text>
              {x.hidden && <Text style={{ color: C.danger, fontSize: 12.5, fontWeight: '700' }}>{t('Şikâyetler nedeniyle gizlendi; moderatör inceliyor.')}</Text>}
              {x.place_answers.map((a) => (
                <View key={a.id} style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: C.line }}>
                  <Text style={{ color: C.ink, lineHeight: 20 }}>{a.body}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <Text style={{ color: C.muted, fontSize: 12, flex: 1 }}>{`${a.profiles?.name || '?'} · ${ago(a.created_at)}`}</Text>
                    {me && (a.user_id === me.id || me.isMod) && <Pressable onPress={() => del('place_answers', a.id)} hitSlop={8}><Text style={{ color: C.muted, fontSize: 12 }}>{t('Sil')}</Text></Pressable>}
                    {me && a.user_id !== me.id && <Pressable onPress={() => setRep({ type: 'answer', id: a.id })} hitSlop={8}><Text style={{ color: C.muted, fontSize: 12 }}>⚑</Text></Pressable>}
                  </View>
                </View>
              ))}
              {me && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
                  <TextInput value={ans[x.id] || ''} onChangeText={(v) => setAns((s) => ({ ...s, [x.id]: v }))} placeholder={t('Cevap yaz')} placeholderTextColor={C.muted} maxLength={500} multiline style={[input, { flex: 1, minHeight: 40 }]} />
                  <Btn small label={t('Gönder')} onPress={() => answer(x.id)} disabled={!(ans[x.id] || '').trim()} />
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                {me && (x.user_id === me.id || me.isMod) && <Pressable onPress={() => del('place_questions', x.id)} hitSlop={8}><Text style={{ color: C.muted, fontSize: 12.5 }}>{t('Soruyu sil')}</Text></Pressable>}
                {me && x.user_id !== me.id && <Pressable onPress={() => setRep({ type: 'question', id: x.id })} hitSlop={8}><Text style={{ color: C.muted, fontSize: 12.5 }}>{`⚑ ${t('Şikâyet et')}`}</Text></Pressable>}
              </View>
            </View>
          ))}
      <ReportSheet req={rep} onClose={() => { setRep(null); load(); }} />
    </View>
  );
}

/* ---------- haftanın fotoğrafı ---------- */
export function PhotoOfWeek() {
  const { t, num } = useT();
  const { photos, byId } = useStore();
  const { push } = useNav();
  const [w, setW] = useState<{ review_id: string; place_id: string; author: string; likes: number } | null>(null);
  useEffect(() => { supabase.rpc('photo_of_week').then(({ data }) => { const r = (data as any[])?.[0]; if (r) setW(r); }, () => {}); }, []);
  const ph = useMemo(() => (w ? photos.find((x) => x.rid === w.review_id) : undefined), [w, photos]);
  if (!w || !ph) return null;
  const p = byId(ph.pid);
  return (
    <Pressable onPress={() => push({ name: 'photo', id: ph.id })} accessibilityRole="imagebutton" style={{ marginTop: 14, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }}>
      <Image source={{ uri: ph.url }} style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: C.line }} />
      <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 }}>{`🏆 ${t('Haftanın fotoğrafı')}`}</Text>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{p?.n}</Text>
        <Text style={{ color: C.muted }} numberOfLines={1}>{`📷 ${ph.by}${w.likes ? ` · ${t('Bu hafta {1} beğeni', num(w.likes))}` : ''}`}</Text>
      </View>
    </Pressable>
  );
}

/* ---------- festival takvimi ---------- */
type Fest = [string, string, number[], string];
export function FestivalScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { pop, push } = useNav();
  const now = new Date().getMonth() + 1;
  const [m, setM] = useState<number>(0);
  const list = (FEST as Fest[]).filter((f) => !m || f[2].includes(m)).sort((a, c) => ((a[2][0] - now + 12) % 12) - ((c[2][0] - now + 12) % 12));
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Festival takvimi')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Her yıl tekrarlanan festival ve şenlikler. Tarihler yıldan yıla değişebilir; gitmeden önce resmî duyuruları kontrol et.')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
          <Chip label={t('Yakında')} on={!m} onPress={() => setM(0)} />
          {MONTHS.map((x, i) => <Chip key={x} label={t(x)} on={m === i + 1} onPress={() => setM(i + 1)} />)}
        </ScrollView>
        {!list.length ? <Empty title={t('Bu ay için festival yok')} /> : list.map((f) => (
          <Pressable key={f[0]} onPress={() => push({ name: 'city', il: f[1], subs: [] })} accessibilityRole="button" style={[b.card, { marginTop: 10 }]}>
            <Text style={{ color: C.accent, fontWeight: '800', fontSize: 12.5 }}>{`${f[2].map((x) => t(MONTHS[x - 1])).join(' – ')} · ${f[1]}`}</Text>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, marginTop: 2 }}>{t(f[0])}</Text>
            <Text style={{ color: C.ink, lineHeight: 20, marginTop: 4 }}>{t(f[3])}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
export function CityExtras({ il }: { il: string }) {
  const { t } = useT();
  const fs = (FEST as Fest[]).filter((f) => f[1] === il);
  const air = (TRANSPORT.air as Record<string, string[]>)[il] || [], yht = TRANSPORT.yht.includes(il);
  return (
    <>
      {fs.length > 0 && (
        <View style={b.box}>
          <Text style={b.boxH}>{`🎉 ${t('Festivaller')}`}</Text>
          {fs.map((f) => <Text key={f[0]} style={[b.boxT, { marginTop: 4 }]}><Text style={{ fontWeight: '800' }}>{t(f[0])}</Text>{` · ${f[2].map((x) => t(MONTHS[x - 1])).join(' – ')}`}</Text>)}
        </View>
      )}
      <View style={b.box}>
        <Text style={b.boxH}>{`🚌 ${t('Nasıl gidilir')}`}</Text>
        {air.length > 0 ? air.map((a) => <Text key={a} style={b.boxT}>{`✈ ${a}`}</Text>) : <Text style={b.boxT}>{`✈ ${t('Bu ilde havalimanı yok; en yakın ildeki havalimanını kullanabilirsin.')}`}</Text>}
        {yht && <Text style={b.boxT}>{`🚄 ${t('Yüksek hızlı tren (YHT) durağı var')}`}</Text>}
        <Text style={b.boxT}>{`🚌 ${t('Şehirlerarası otobüsler il merkezindeki otogara gelir.')}`}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <Pressable onPress={() => Linking.openURL('https://ebilet.tcddtasimacilik.gov.tr').catch(() => {})} accessibilityRole="link"><Text style={{ color: C.link, fontWeight: '700' }}>TCDD ↗</Text></Pressable>
          <Pressable onPress={() => Linking.openURL('https://www.dhmi.gov.tr').catch(() => {})} accessibilityRole="link"><Text style={{ color: C.link, fontWeight: '700' }}>DHMİ ↗</Text></Pressable>
        </View>
      </View>
    </>
  );
}

/* ---------- gezi harcamaları (yalnızca günlüğün sahibi görür) ---------- */
const CATS: [string, string, string][] = [['stay', '🛏', 'Konaklama'], ['food', '🍽', 'Yemek'], ['transport', '🚗', 'Ulaşım'], ['ticket', '🎟', 'Giriş ücreti'], ['shop', '🛍', 'Alışveriş'], ['other', '•', 'Diğer']];
const CUR = ['TRY', 'EUR', 'USD', 'GBP'];
const SYM: Record<string, string> = { TRY: '₺', EUR: '€', USD: '$', GBP: '£' };
type Ex = { id: string; day: string; cat: string; amount: number; currency: string; note: string };
export function Expenses({ journalId }: { journalId: string }) {
  const { t, num } = useT();
  const toast = useToast();
  const [list, setList] = useState<Ex[] | null>(null);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('food');
  const [amt, setAmt] = useState('');
  const [cur, setCur] = useState('TRY');
  const [note, setNote] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase.from('journal_expenses').select('id,day,cat,amount,currency,note').eq('journal_id', journalId).order('day').order('created_at');
    setList(((data as any[]) || []).map((x) => ({ ...x, amount: Number(x.amount) })));
  }, [journalId]);
  useEffect(() => { load(); }, [load]);
  const amount = Number(amt.replace(',', '.'));
  async function add() {
    if (!(amount > 0)) return;
    const { error } = await supabase.from('journal_expenses').insert({ journal_id: journalId, cat, amount: Math.round(amount * 100) / 100, currency: cur, note: note.trim().slice(0, 120) });
    if (error) { toast(trError(error)); return; }
    track('act:expense'); setAmt(''); setNote(''); load();
  }
  async function del(id: string) { await supabase.from('journal_expenses').delete().eq('id', id); load(); }
  const totals = useMemo(() => {
    const m: Record<string, number> = {}, byCat: Record<string, Record<string, number>> = {};
    (list || []).forEach((e) => { m[e.currency] = (m[e.currency] || 0) + e.amount; (byCat[e.cat] ||= {})[e.currency] = (byCat[e.cat][e.currency] || 0) + e.amount; });
    return { m, byCat };
  }, [list]);
  const money = (o: Record<string, number>) => Object.entries(o).map(([c, v]) => `${num(Math.round(v * 100) / 100)} ${SYM[c] || c}`).join(' + ');
  if (!list) return null;
  return (
    <View style={b.box}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={b.boxH}>{`💰 ${t('Harcamalar')}`}</Text>
          <Text style={{ color: C.ink, fontSize: 18, fontWeight: '800' }}>{list.length ? money(totals.m) : t('Henüz harcama yok')}</Text>
          <Text style={b.fine}>{t('Yalnızca sen görürsün; günlüğü paylaşsan da gizli kalır.')}</Text>
        </View>
        <Text style={{ color: C.muted, fontSize: 18 }}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && (
        <View style={{ marginTop: 8 }}>
          {CATS.filter(([k]) => totals.byCat[k]).map(([k, ic, l]) => <Text key={k} style={b.boxT}>{`${ic} ${t(l)}: ${money(totals.byCat[k])}`}</Text>)}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {CATS.map(([k, ic, l]) => <Chip key={k} label={`${ic} ${t(l)}`} on={cat === k} onPress={() => setCat(k)} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
            <TextInput value={amt} onChangeText={setAmt} keyboardType="decimal-pad" placeholder={t('Tutar')} placeholderTextColor={C.muted}
              style={{ flex: 1, height: 44, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, color: C.ink, backgroundColor: C.bg }} />
            {CUR.map((c) => <Chip key={c} label={SYM[c]} on={cur === c} onPress={() => setCur(c)} />)}
          </View>
          <TextInput value={note} onChangeText={setNote} maxLength={120} placeholder={t('Not (isteğe bağlı)')} placeholderTextColor={C.muted}
            style={{ marginTop: 8, height: 44, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, color: C.ink, backgroundColor: C.bg }} />
          <Btn small kind="pri" label={`＋ ${t('Harcama ekle')}`} onPress={add} disabled={!(amount > 0)} style={{ marginTop: 8 }} />
          {list.slice().reverse().map((e) => {
            const c = CATS.find((x) => x[0] === e.cat) || CATS[5];
            return (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line, marginTop: 6 }}>
                <Text>{c[1]}</Text>
                <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '700' }}>{`${num(e.amount)} ${SYM[e.currency] || e.currency}`}</Text><Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>{[e.day, t(c[2]), e.note].filter(Boolean).join(' · ')}</Text></View>
                <Pressable onPress={() => del(e.id)} hitSlop={8}><Text style={{ color: C.muted }}>✕</Text></Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ---------- Planla sekmesi: gezi planlamayla ilgili her şey tek yerde ---------- */
export function PlanScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { push } = useNav();
  const trip = useTrip();
  const { me } = useAuth();
  const groups: [string, [string, string, string, () => void, string?][]][] = [
    ['Gezini planla', [
      ['🧳', 'Gezi listem', 'Gideceğin yerler ve en kısa rota', () => push({ name: 'trip' }), trip.ids.length ? num(trip.ids.length) : undefined],
      ['🗺', 'Hazır rotalar', 'Gün gün planlanmış rotalar', () => push({ name: 'routes' })],
      ['🧭', 'Nereye gitmeliyim?', 'İlgi alanlarına göre şehir önerileri', () => push({ name: 'recommend' })],
      ['🎉', 'Festival takvimi', 'Her yıl tekrarlanan şenlikler', () => push({ name: 'festivals' })],
    ]],
    ['Gezerken', [
      ['📔', 'Gezi günlüklerim', 'Gün gün notlar, fotoğraflar ve harcamalar', () => push({ name: me ? 'journals' : 'profile' })],
      ['💬', 'Türkçe cep sözlüğü', 'Temel ifadeler, sesli okunuşuyla', () => push({ name: 'phrases' })],
    ]],
    ['Yardım', [
      ['❔', 'Yardım ve sık sorulanlar', 'Uygulamayı nasıl kullanırım?', () => push({ name: 'help' })],
    ]],
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.screen }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 90 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text style={[b.h2, { fontSize: 26, flexShrink: 1 }]} accessibilityRole="header">{t('Planla')}</Text>
        <AccountMenu size={44} top={insets.top + 60} />
      </View>
      {groups.map(([g, items]) => (
        <View key={g} style={{ marginTop: 18 }}>
          <Text style={{ color: C.muted, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase' }}>{t(g)}</Text>
          <View style={{ marginTop: 8, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            {items.map(([ic, l, sub, fn, badge], i) => (
              <Pressable key={l} onPress={fn} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }, pressed && { backgroundColor: C.line }]}>
                <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{ic}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15.5 }}>{t(l)}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{t(sub)}</Text>
                </View>
                {!!badge && <View style={{ backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{badge}</Text></View>}
                <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ---------- yardım ve sık sorulanlar ---------- */
export function HelpScreen() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { pop, push } = useNav();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Yardım ve sık sorulanlar')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <View style={[b.box, { marginTop: 0 }]}>
          <Text style={b.boxH}>{t('Dört ana bölüm')}</Text>
          {[['🗺', 'Harita', 'Tüm yerler haritada; işarete dokun, yerin sayfası açılsın.'], ['🧭', 'Keşfet', 'Arama, bölge ve kategori, sıralama, bugünün önerileri.'], ['📋', 'Planla', 'Gezi listesi, hazır rotalar, festivaller, günlük ve sözlük.'], ['📷', 'Vitrin', 'Gezginlerin fotoğrafları ve haftanın fotoğrafı.']].map(([ic, l, d]) => (
            <Text key={l} style={[b.boxT, { marginTop: 4 }]}><Text style={{ fontWeight: '800' }}>{`${ic} ${t(l)}: `}</Text>{t(d)}</Text>
          ))}
          <Text style={[b.boxT, { marginTop: 6 }]}>{t('Sağ üstteki profil düğmesinde hesap, bildirimler, dil, görünüm ve gizlilik ayarları bulunur.')}</Text>
        </View>
        {(FAQ as [string, string][]).map(([q, a], i) => (
          <Pressable key={q} onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={[b.card, { marginTop: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: C.ink, fontWeight: '800', fontSize: 15 }}>{t(q)}</Text>
              <Text style={{ color: C.muted, fontSize: 18 }}>{open === i ? '▴' : '▾'}</Text>
            </View>
            {open === i && <Text style={{ color: C.ink, lineHeight: 21, marginTop: 6 }}>{t(a)}</Text>}
          </Pressable>
        ))}
        <Btn label={`💬 ${t('Görüş ve öneri gönder')}`} onPress={() => push({ name: 'feedback' })} style={{ marginTop: 16 }} />
      </ScrollView>
    </View>
  );
}
