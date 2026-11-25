import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore, type FeedbackKind } from '../lib/store';
import { trError, useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { publicUrl } from '../lib/images';
import { useNav, useToast } from '../lib/ui';
import { VERSION } from '../lib/update';
import { Btn, Chip, Empty, Header, b } from '../components/common';
import { C, R } from '../theme';

const KINDS: [FeedbackKind, string, string][] = [['oneri', '💡', 'Öneri'], ['hata', '🐞', 'Hata bildirimi'], ['gorus', '💬', 'Görüş']];
type Fb = { id: string; kind: FeedbackKind; rating: number | null; body: string; handled: boolean; created_at: string; user_id: string; platform: string | null; version: string | null };

/* İletişim: öneri, hata bildirimi ve görüşler (moderatör panelinde okunur) */
export default function FeedbackScreen() {
  const { t, ago } = useT();
  const insets = useSafeAreaInsets();
  const { sendFeedback } = useStore();
  const { me } = useAuth();
  const { pop } = useNav();
  const toast = useToast();
  const [kind, setKind] = useState<FeedbackKind>('oneri');
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Fb[]>([]);
  const loadMine = useCallback(() => {
    if (!me) return;
    supabase.from('feedback').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => setMine((data as Fb[]) || []));
  }, [me]);
  useEffect(loadMine, [loadMine]);

  async function send() {
    if (body.trim().length < 3) { toast('Lütfen birkaç kelimeyle anlat.'); return; }
    setBusy(true);
    try { await sendFeedback({ kind, rating, body, version: `android ${VERSION}` }); setBody(''); setRating(null); toast('Mesajın bize ulaştı. Teşekkürler!'); loadMine(); }
    catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Görüş ve öneri gönder')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: C.ink, fontSize: 15.5, lineHeight: 22 }}>{t('Uygulamayı birlikte geliştiriyoruz. Aklına gelen her öneriyi, karşılaştığın hataları ve görüşlerini yaz; hepsini okuyoruz.')}</Text>
        <Text style={[b.boxH, { marginTop: 16 }]}>{t('Konu')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {KINDS.map(([k, i, l]) => <Chip key={k} label={`${i} ${t(l)}`} on={kind === k} onPress={() => setKind(k)} />)}
        </View>
        <Text style={[b.boxH, { marginTop: 16 }]}>{t('Uygulamadan ne kadar memnunsun? (isteğe bağlı)')}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(rating === n ? null : n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('5 üzerinden {1} puan', n)} accessibilityState={{ selected: rating === n }}>
              <Text style={{ fontSize: 34, color: rating && n <= rating ? C.star : C.chipLine }}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Mesajın')}</Text>
        <TextInput value={body} onChangeText={setBody} multiline maxLength={2000} textAlignVertical="top"
          placeholder={kind === 'hata' ? t('Ne oldu? Hangi ekranda, ne yaparken? Mümkünse adım adım yaz.') : t('Aklındakini yaz…')} placeholderTextColor={C.muted}
          style={{ minHeight: 140, backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, padding: 12, color: C.ink, fontSize: 15.5 }} />
        <Text style={[b.fine, { marginTop: 4, textAlign: 'right' }]}>{`${body.length}/2000`}</Text>
        <Btn kind="pri" label={t('Gönder')} onPress={send} busy={busy} disabled={body.trim().length < 3} style={{ marginTop: 6 }} />
        <Text style={b.fine}>{t('Mesajınla birlikte yalnızca hesabın ve uygulama sürümü kaydedilir.')}</Text>

        {mine.length > 0 && (
          <>
            <Text style={[b.h2, { fontSize: 18, marginTop: 22 }]}>{t('Gönderdiklerim')}</Text>
            {mine.map((f) => (
              <View key={f.id} style={b.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{`${KINDS.find((k) => k[0] === f.kind)?.[1]} ${t(KINDS.find((k) => k[0] === f.kind)?.[2] || '')}`}</Text>
                  <Text style={{ color: f.handled ? C.ok : C.muted, fontWeight: '700', fontSize: 13 }}>{f.handled ? `✓ ${t('Okundu')}` : t('İletildi')}</Text>
                </View>
                <Text style={{ color: C.ink, marginTop: 6, lineHeight: 20 }}>{f.body}</Text>
                <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>{ago(f.created_at)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

type Rep = { target_type: 'review' | 'reply' | 'photo'; target_id: string; reports: number; reasons: string[]; last_at: string; hidden: boolean; body: string; photo_path: string | null; place_id: string | null; author: string | null };
const REASON_TXT: Record<string, string> = { spam: 'Spam veya reklam', hakaret: 'Hakaret veya nefret söylemi', uygunsuz: 'Uygunsuz içerik', yanlis: 'Yanlış veya yanıltıcı bilgi', diger: 'Diğer', onay: 'Yeni kullanıcı fotoğrafı, onay bekliyor' };
const TYPE_TXT: Record<string, string> = { review: 'Yorum', reply: 'Yanıt', photo: 'Fotoğraf' };

type Cor = { id: string; place_id: string; user_id: string; kind: 'konum' | 'bilgi' | 'kapali' | 'diger'; note: string | null; lat: number | null; lng: number | null; status: 'open' | 'done' | 'rejected'; created_at: string };
type Crash = { id: number; platform: string; version: string | null; message: string; stack: string | null; context: string | null; created_at: string };
const COR_TXT: Record<Cor['kind'], string> = { konum: '📍 Konum yanlış', bilgi: '📝 Açıklama veya bilgi yanlış', kapali: '🚫 Burası kapandı / artık yok', diger: '💬 Başka bir şey' };
type ModTab = 'fb' | 'rep' | 'cor' | 'err' | 'stat';

/* Moderatör paneli: geri bildirimler, şikâyetler, bilgi düzeltmeleri, uygulama hataları ve kullanım sayıları */
export function ModScreen() {
  const { t, ago, num } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { byId, reload } = useStore();
  const { pop } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState<ModTab>('fb');
  const [fbs, setFbs] = useState<Fb[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [reps, setReps] = useState<Rep[] | null>(null);
  const [cors, setCors] = useState<Cor[] | null>(null);
  const [crashes, setCrashes] = useState<Crash[] | null>(null);
  const [usage, setUsage] = useState<{ name: string; platform: string; n: number }[] | null>(null);
  const [days, setDays] = useState(7);
  const [openStack, setOpenStack] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [f, r, c, e] = await Promise.all([
      supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.rpc('mod_reports'),
      supabase.from('corrections').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('crash_reports').select('*').order('created_at', { ascending: false }).limit(150),
    ]);
    const list = (f.data as Fb[]) || []; setFbs(list);
    setReps((r.data as Rep[]) || []);
    const cl = (c.data as Cor[]) || []; setCors(cl);
    setCrashes((e.data as Crash[]) || []);
    const ids = [...new Set([...list.map((x) => x.user_id), ...cl.map((x) => x.user_id)])];
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id,name').in('id', ids);
      setNames(Object.fromEntries(((ps as any[]) || []).map((p) => [p.id, p.name])));
    }
  }, []);
  const loadUsage = useCallback(async () => {
    setUsage(null);
    const { data } = await supabase.rpc('mod_usage', { p_days: days });
    setUsage(((data as any[]) || []).map((x) => ({ name: x.name, platform: x.platform, n: +x.n })));
  }, [days]);
  useEffect(() => { if (me?.isMod) load(); }, [me?.isMod, load]);
  useEffect(() => { if (me?.isMod && tab === 'stat') loadUsage(); }, [me?.isMod, tab, loadUsage]);

  if (!me?.isMod) return <View style={{ flex: 1, backgroundColor: C.screen }}><Header onBack={pop} title={t('Moderatör paneli')} /><Empty title={t('Bu bölüm yalnızca moderatörler içindir.')} /></View>;
  const handled = async (f: Fb) => { const { error } = await supabase.from('feedback').update({ handled: !f.handled }).eq('id', f.id); if (error) toast(trError(error)); else load(); };
  const resolve = async (r: Rep, act: 'restore' | 'delete') => {
    const { error } = await supabase.rpc('mod_resolve', { t: r.target_type, tid: r.target_id, act });
    if (error) toast(trError(error)); else { toast(act === 'restore' ? 'İçerik yeniden gösteriliyor' : 'İçerik silindi'); load(); reload(); }
  };
  const fixCor = async (c: Cor, status: Cor['status'], apply = false) => {
    const { error } = await supabase.rpc('mod_resolve_correction', { p_id: c.id, p_status: status, p_apply: apply });
    if (error) toast(trError(error)); else { toast(apply ? 'Düzeltme uygulandı' : 'Kaydedildi'); load(); if (apply) reload(); }
  };
  const delCrash = async (x: Crash | null) => {
    const q = supabase.from('crash_reports').delete();
    const { error } = x ? await q.eq('id', x.id) : await q.gte('id', 0);
    if (error) toast(trError(error)); else load();
  };
  const open = (fbs || []).filter((f) => !f.handled).length;
  const openCor = (cors || []).filter((c) => c.status === 'open').length;
  const TABS: [ModTab, string][] = [
    ['fb', `${t('Geri bildirimler')} (${num(open)})`], ['rep', `${t('Şikâyetler')} (${num(reps?.length || 0)})`],
    ['cor', `${t('Düzeltmeler')} (${num(openCor)})`], ['err', `${t('Hatalar')} (${num(crashes?.length || 0)})`], ['stat', t('İstatistik')],
  ];

  // kullanım sayıları: gruplara ayır (sekme, ekran, eylem), en çoktan aza
  const groups: [string, string, { k: string; n: number; w: number }[]][] = (() => {
    if (!usage) return [];
    const by: Record<string, Record<string, number>> = {};
    usage.forEach((u) => { const [g, ...rest] = u.name.split(':'); const k = rest.join(':') || g; (by[g] ||= {})[k] = ((by[g] || {})[k] || 0) + u.n; });
    const label: Record<string, string> = { tab: 'Sekmeler', screen: 'Ekranlar', act: 'Eylemler', web: 'Site' };
    return Object.entries(by).map(([g, m]) => {
      const rows = Object.entries(m).sort((a, b2) => b2[1] - a[1]); const max = rows[0]?.[1] || 1;
      return [g, label[g] || g, rows.map(([k, n]) => ({ k, n, w: n / max }))] as [string, string, { k: string; n: number; w: number }[]];
    });
  })();
  const plat = usage ? Object.entries(usage.reduce<Record<string, number>>((m, u) => { m[u.platform] = (m[u.platform] || 0) + u.n; return m; }, {})) : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Moderatör paneli')} right={<Pressable onPress={() => { load(); if (tab === 'stat') loadUsage(); }} hitSlop={8}><Text style={{ color: C.accent, fontWeight: '800' }}>↻</Text></Pressable>} />
      <View style={{ borderBottomWidth: 1, borderBottomColor: C.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }} accessibilityRole="tablist">
          {TABS.map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: tab === k ? C.accent : 'transparent', marginBottom: -1 }} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
              <Text style={{ fontWeight: '800', color: tab === k ? C.ink : C.muted }}>{l}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {tab === 'fb' && (
          fbs == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
            : !fbs.length ? <Empty title={t('Henüz geri bildirim yok')} />
              : fbs.map((f) => (
                <View key={f.id} style={[b.card, f.handled && { opacity: 0.6 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>{`${KINDS.find((k) => k[0] === f.kind)?.[1]} ${t(KINDS.find((k) => k[0] === f.kind)?.[2] || '')} · ${names[f.user_id] || '?'}`}</Text>
                    {f.rating != null && <Text style={{ color: C.star, fontWeight: '800' }}>{'★'.repeat(f.rating)}</Text>}
                  </View>
                  <Text style={{ color: C.ink, marginTop: 6, lineHeight: 21 }}>{f.body}</Text>
                  <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>{[ago(f.created_at), f.platform, f.version].filter(Boolean).join(' · ')}</Text>
                  <Btn small label={f.handled ? t('Okunmadı yap') : `✓ ${t('Okundu olarak işaretle')}`} onPress={() => handled(f)} style={{ marginTop: 10 }} />
                </View>
              ))
        )}
        {tab === 'rep' && (
          reps == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
            : !reps.length ? <Empty title={t('Şikâyet edilen içerik yok')} />
              : reps.map((r) => (
                <View key={r.target_type + r.target_id} style={b.card}>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{`${t(TYPE_TXT[r.target_type])} · ${r.author || '?'}${r.place_id && byId(r.place_id) ? ` · ${byId(r.place_id)!.n}` : ''}`}</Text>
                  <Text style={{ color: r.hidden ? C.danger : C.muted, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                    {`${r.reports ? `${t('{1} şikâyet', num(r.reports))} · ` : ''}${r.reasons.map((x) => t(REASON_TXT[x] || x)).join(', ')}${r.hidden && r.reports ? ` · ${t('Gizlendi')}` : ''}`}
                  </Text>
                  {r.target_type === 'photo' && r.photo_path ? <Image source={{ uri: publicUrl(r.photo_path) || undefined }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.sm, marginTop: 8, backgroundColor: C.line }} />
                    : <Text style={{ color: C.ink, marginTop: 8, lineHeight: 21 }}>{r.body || '—'}</Text>}
                  <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>{ago(r.last_at)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Btn small label={t('Sorun yok, göster')} onPress={() => resolve(r, 'restore')} style={{ flex: 1 }} />
                    <Btn small kind="pri" label={t('Sil')} onPress={() => resolve(r, 'delete')} style={{ flex: 1 }} />
                  </View>
                </View>
              ))
        )}
        {tab === 'cor' && (
          cors == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
            : !cors.length ? <Empty title={t('Düzeltme önerisi yok')} />
              : cors.map((c) => {
                const pl = byId(c.place_id);
                const canApply = (c.kind === 'konum' && c.lat != null) || c.kind === 'kapali';
                return (
                  <View key={c.id} style={[b.card, c.status !== 'open' && { opacity: 0.6 }]}>
                    <Text style={{ fontWeight: '800', color: C.ink }}>{`${t(COR_TXT[c.kind])}`}</Text>
                    <Text style={{ color: C.accent, fontWeight: '700', marginTop: 2 }}>{pl ? `${pl.n} · ${pl.il}` : c.place_id}</Text>
                    {!!c.note && <Text style={{ color: C.ink, marginTop: 6, lineHeight: 21 }}>{c.note}</Text>}
                    {c.lat != null && c.lng != null && (
                      <Text style={{ color: C.muted, marginTop: 6, fontSize: 13 }}>
                        {`📍 ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}${pl ? ` · ${num(Math.round(dist(pl.lat, pl.lng, c.lat, c.lng)))} m` : ''}`}
                      </Text>
                    )}
                    <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 6 }}>{[ago(c.created_at), names[c.user_id] || '?', c.status === 'done' ? `✓ ${t('Çözüldü')}` : c.status === 'rejected' ? t('Reddedildi') : ''].filter(Boolean).join(' · ')}</Text>
                    {c.status === 'open' ? (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {canApply && <Btn small kind="pri" label={c.kind === 'kapali' ? t('Kapandı olarak işaretle') : t('Konumu uygula')} onPress={() => fixCor(c, 'done', true)} style={{ flexGrow: 1 }} />}
                        <Btn small label={`✓ ${t('Çözüldü')}`} onPress={() => fixCor(c, 'done')} style={{ flexGrow: 1 }} />
                        <Btn small label={t('Reddet')} onPress={() => fixCor(c, 'rejected')} style={{ flexGrow: 1 }} />
                      </View>
                    ) : <Btn small kind="ghost" label={t('Yeniden aç')} onPress={() => fixCor(c, 'open')} style={{ marginTop: 6, alignSelf: 'flex-start' }} />}
                  </View>
                );
              })
        )}
        {tab === 'err' && (
          crashes == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
            : !crashes.length ? <Empty title={t('Kayıtlı hata yok')} note={t('Uygulama ya da site çöktüğünde burada görünür.')} />
              : <>
                <Btn small kind="ghost" label={t('Hepsini temizle')} onPress={() => delCrash(null)} style={{ alignSelf: 'flex-end' }} />
                {crashes.map((x) => (
                  <View key={x.id} style={b.card}>
                    <Text style={{ fontWeight: '800', color: C.danger }} numberOfLines={3}>{x.message}</Text>
                    <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 4 }}>{[ago(x.created_at), x.platform, x.version, x.context].filter(Boolean).join(' · ')}</Text>
                    {!!x.stack && (
                      <Pressable onPress={() => setOpenStack(openStack === x.id ? null : x.id)} accessibilityRole="button">
                        <Text style={{ color: C.link, fontWeight: '700', marginTop: 6 }}>{openStack === x.id ? t('Ayrıntıyı gizle') : t('Ayrıntıyı göster')}</Text>
                        {openStack === x.id && <Text style={{ color: C.ink, fontSize: 11.5, fontFamily: 'monospace', marginTop: 6 }}>{x.stack.slice(0, 3000)}</Text>}
                      </Pressable>
                    )}
                    <Btn small label={t('Sil')} onPress={() => delCrash(x)} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                  </View>
                ))}
              </>
        )}
        {tab === 'stat' && (
          <View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              {[1, 7, 30].map((d) => <Chip key={d} label={d === 1 ? t('Bugün') : t('Son {1} gün', d)} on={days === d} onPress={() => setDays(d)} />)}
            </View>
            <Text style={b.fine}>{t('Yalnızca anonim sayılar: kim olduğun değil, hangi ekranın kaç kez açıldığı.')}</Text>
            {usage == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
              : !usage.length ? <Empty title={t('Henüz veri yok')} />
                : <>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {plat.map(([k, n]) => (
                      <View key={k} style={[b.card, { flex: 1, marginTop: 0, alignItems: 'center' }]}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: C.ink }}>{num(n)}</Text>
                        <Text style={{ color: C.muted, fontWeight: '700' }}>{k === 'web' ? t('Site') : k === 'android' ? 'Android' : k}</Text>
                      </View>
                    ))}
                  </View>
                  {groups.map(([g, l, rows]) => (
                    <View key={g} style={b.card}>
                      <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>{t(l)}</Text>
                      {rows.slice(0, 15).map((r) => (
                        <View key={r.k} style={{ marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: C.ink, fontSize: 13.5 }}>{r.k}</Text>
                            <Text style={{ color: C.muted, fontSize: 13.5, fontWeight: '700' }}>{num(r.n)}</Text>
                          </View>
                          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.line, marginTop: 3, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.max(3, r.w * 100)}%`, height: 6, backgroundColor: C.accent }} />
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </>}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function dist(a: number, b1: number, c: number, d: number) {
  const r = Math.PI / 180, x = (d - b1) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
  return Math.sqrt(x * x + y * y) * 6371000;
}
