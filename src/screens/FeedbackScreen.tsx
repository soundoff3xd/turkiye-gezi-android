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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
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
const REASON_TXT: Record<string, string> = { spam: 'Spam veya reklam', hakaret: 'Hakaret veya nefret söylemi', uygunsuz: 'Uygunsuz içerik', yanlis: 'Yanlış veya yanıltıcı bilgi', diger: 'Diğer' };
const TYPE_TXT: Record<string, string> = { review: 'Yorum', reply: 'Yanıt', photo: 'Fotoğraf' };

/* Moderatör paneli: gelen geri bildirimler ve şikâyet edilen içerikler */
export function ModScreen() {
  const { t, ago, num } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { byId, reload } = useStore();
  const { pop } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState<'fb' | 'rep'>('fb');
  const [fbs, setFbs] = useState<Fb[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [reps, setReps] = useState<Rep[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
    const list = (data as Fb[]) || []; setFbs(list);
    const ids = [...new Set(list.map((f) => f.user_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id,name').in('id', ids);
      setNames(Object.fromEntries(((ps as any[]) || []).map((p) => [p.id, p.name])));
    }
    const r = await supabase.rpc('mod_reports'); setReps((r.data as Rep[]) || []);
  }, []);
  useEffect(() => { if (me?.isMod) load(); }, [me?.isMod, load]);

  if (!me?.isMod) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header onBack={pop} title={t('Moderatör paneli')} /><Empty title={t('Bu bölüm yalnızca moderatörler içindir.')} /></View>;
  const handled = async (f: Fb) => { const { error } = await supabase.from('feedback').update({ handled: !f.handled }).eq('id', f.id); if (error) toast(trError(error)); else load(); };
  const resolve = async (r: Rep, act: 'restore' | 'delete') => {
    const { error } = await supabase.rpc('mod_resolve', { t: r.target_type, tid: r.target_id, act });
    if (error) toast(trError(error)); else { toast(act === 'restore' ? 'İçerik yeniden gösteriliyor' : 'İçerik silindi'); load(); reload(); }
  };
  const open = (fbs || []).filter((f) => !f.handled).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header onBack={pop} title={t('Moderatör paneli')} right={<Pressable onPress={load} hitSlop={8}><Text style={{ color: C.accent, fontWeight: '800' }}>↻</Text></Pressable>} />
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.line }} accessibilityRole="tablist">
        {([['fb', `${t('Geri bildirimler')} (${num(open)})`], ['rep', `${t('Şikâyetler')} (${num(reps?.length || 0)})`]] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: tab === k ? C.accent : 'transparent', marginBottom: -1 }} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Text style={{ fontWeight: '800', color: tab === k ? C.ink : C.muted }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {tab === 'fb' ? (
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
        ) : (
          reps == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
            : !reps.length ? <Empty title={t('Şikâyet edilen içerik yok')} />
              : reps.map((r) => (
                <View key={r.target_type + r.target_id} style={b.card}>
                  <Text style={{ fontWeight: '800', color: C.ink }}>{`${t(TYPE_TXT[r.target_type])} · ${r.author || '?'}${r.place_id && byId(r.place_id) ? ` · ${byId(r.place_id)!.n}` : ''}`}</Text>
                  <Text style={{ color: r.hidden ? C.danger : C.muted, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                    {`${t('{1} şikâyet', num(r.reports))} · ${r.reasons.map((x) => t(REASON_TXT[x] || x)).join(', ')}${r.hidden ? ` · ${t('Gizlendi')}` : ''}`}
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
      </ScrollView>
    </View>
  );
}
