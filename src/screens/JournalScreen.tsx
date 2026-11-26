import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useAuth, trError } from '../lib/auth';
import { useStore } from '../lib/store';
import { useTrip } from '../lib/trip';
import { supabase, SITE_URL } from '../lib/supabase';
import { pickImage, publicUrl, uploadImage, type Picked } from '../lib/images';
import { useNav, useToast } from '../lib/ui';
import { track } from '../lib/telemetry';
import { Btn, Empty, Header, b } from '../components/common';
import { PlaceThumb } from '../components/Extras';
import { Expenses } from '../components/Extras3';
import { catName, fold, type Place } from '../data/catalog';
import { C, R } from '../theme';

/* Gezi günlüğü: bir geziyi gün gün kaydet (yer, not, fotoğraf); istersen bağlantıyla paylaş (bağlantıyı bilen görür). */
type J = { id: string; title: string; started_on: string; shared: boolean; created_at: string; n?: number };
type E = { id: string; place_id: string | null; day: string; note: string; photo_path: string | null; created_at: string };
const today = () => new Date().toISOString().slice(0, 10);
export const journalLink = (id: string) => `${SITE_URL.replace(/\/$/, '')}/?gunluk=${id}`;

export function JournalsScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { pop, push } = useNav();
  const toast = useToast();
  const [list, setList] = useState<J[] | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!me) return;
    const { data, error } = await supabase.from('journals').select('id,title,started_on,shared,created_at,journal_entries(count)').eq('user_id', me.id).order('started_on', { ascending: false });
    if (error) { setList([]); return; }
    setList(((data as any[]) || []).map((j) => ({ ...j, n: j.journal_entries?.[0]?.count ?? 0 })));
  }, [me]);
  useEffect(() => { load(); }, [load]);
  async function create() {
    const tt = title.trim(); if (!tt || !me) return;
    setBusy(true);
    const { data, error } = await supabase.from('journals').insert({ title: tt.slice(0, 80) }).select('id').single();
    setBusy(false);
    if (error) { toast(trError(error)); return; }
    track('act:journal_new'); setTitle(''); push({ name: 'journal', id: (data as any).id }); load();
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Gezi günlüklerim')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Gezdiğin yerleri gün gün not et, fotoğraf ekle; istersen arkadaşlarınla bağlantıyla paylaş.')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TextInput value={title} onChangeText={setTitle} placeholder={t('Yeni günlük adı (ör. Kapadokya, Ekim)')} placeholderTextColor={C.muted} maxLength={80}
            style={{ flex: 1, height: 46, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, color: C.ink, backgroundColor: C.surface }} onSubmitEditing={create} returnKeyType="done" />
          <Btn kind="pri" small label={`＋ ${t('Oluştur')}`} onPress={create} busy={busy} disabled={!title.trim()} />
        </View>
        {list == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
          : !list.length ? <Empty title={t('Henüz günlüğün yok')} note={t('Bir gezi için günlük oluştur, gittiğin yerleri ekledikçe hikâyen oluşsun.')} />
            : list.map((j) => (
              <Pressable key={j.id} onPress={() => push({ name: 'journal', id: j.id })} style={[b.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} accessibilityRole="button">
                <Text style={{ fontSize: 26 }}>📔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>{j.title}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{`${j.started_on} · ${t('{1} kayıt', num(j.n || 0))}${j.shared ? ` · 🔗 ${t('Paylaşıldı')}` : ''}`}</Text>
                </View>
                <Text style={{ color: C.muted, fontSize: 20 }}>›</Text>
              </Pressable>
            ))}
      </ScrollView>
    </View>
  );
}

export default function JournalScreen({ id }: { id: string }) {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { byId } = useStore();
  const { pop, push } = useNav();
  const toast = useToast();
  const [j, setJ] = useState<J | null>(null);
  const [entries, setEntries] = useState<E[] | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(async () => {
    const [a, b2] = await Promise.all([
      supabase.from('journals').select('id,title,started_on,shared,created_at,user_id').eq('id', id).maybeSingle(),
      supabase.from('journal_entries').select('id,place_id,day,note,photo_path,created_at').eq('journal_id', id).order('day').order('created_at'),
    ]);
    setJ((a.data as any) || null); setEntries((b2.data as E[]) || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const days = useMemo(() => {
    const m = new Map<string, E[]>(); (entries || []).forEach((e) => { (m.get(e.day) || m.set(e.day, []).get(e.day)!).push(e); });
    return [...m.entries()];
  }, [entries]);
  const own = !!(j && me && (j as any).user_id === me.id);
  async function setShared(v: boolean) {
    if (!j) return;
    const { error } = await supabase.from('journals').update({ shared: v }).eq('id', j.id);
    if (error) { toast(trError(error)); return; }
    setJ({ ...j, shared: v }); if (v) track('act:journal_share');
  }
  async function share() {
    if (!j) return;
    if (!j.shared) await setShared(true);
    try { await Share.share({ message: `📔 ${j.title} · ${t('Türkiye Gezi Rehberi')}\n${journalLink(j.id)}`, title: j.title }); } catch { /* */ }
  }
  async function del(e: E) {
    const { error } = await supabase.from('journal_entries').delete().eq('id', e.id);
    if (error) toast(trError(error)); else { if (e.photo_path) supabase.storage.from('photos').remove([e.photo_path]).catch(() => {}); load(); }
  }
  async function delJournal() {
    if (!j) return;
    const paths = (entries || []).map((e) => e.photo_path).filter(Boolean) as string[];
    const { error } = await supabase.from('journals').delete().eq('id', j.id);
    if (error) { toast(trError(error)); return; }
    if (paths.length) supabase.storage.from('photos').remove(paths).catch(() => {});
    toast('Günlük silindi'); pop();
  }
  if (!j) return <View style={{ flex: 1, backgroundColor: C.screen }}><Header onBack={pop} title={t('Gezi günlüğü')} />{entries ? <Empty title={t('Bu günlük bulunamadı.')} /> : <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={j.title} right={own ? <Pressable onPress={share} hitSlop={8} accessibilityRole="button"><Text style={{ color: C.accent, fontWeight: '800' }}>{`↗ ${t('Paylaş')}`}</Text></Pressable> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        <Text style={{ color: C.muted }}>{`${j.started_on} · ${t('{1} kayıt', num((entries || []).length))}`}</Text>
        {own && (
          <View style={[b.box, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.ink, fontWeight: '700' }}>{t('Bağlantıyla paylaş')}</Text>
              <Text style={{ color: C.muted, fontSize: 12.5 }}>{j.shared ? t('Bağlantıyı bilen herkes günlüğünü görebilir.') : t('Şu an yalnızca sen görüyorsun.')}</Text>
            </View>
            <Switch value={j.shared} onValueChange={setShared} trackColor={{ true: C.accent }} />
          </View>
        )}
        {own && <Expenses journalId={j.id} />}
        {entries && !entries.length && <Empty title={t('Henüz kayıt yok')} note={t('Gittiğin bir yeri, notunu ve fotoğrafını ekleyerek başla.')} />}
        {days.map(([day, es]) => (
          <View key={day} style={{ marginTop: 18 }}>
            <Text style={{ color: C.accent, fontWeight: '800', letterSpacing: 0.4 }}>{day}</Text>
            {es.map((e) => {
              const p = e.place_id ? byId(e.place_id) : undefined, img = publicUrl(e.photo_path);
              return (
                <View key={e.id} style={[b.card, { marginTop: 8 }]}>
                  {p && (
                    <Pressable onPress={() => push({ name: 'place', id: p.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button">
                      <PlaceThumb p={p} size={40} />
                      <View style={{ flex: 1 }}><Text style={{ color: C.ink, fontWeight: '800' }} numberOfLines={1}>{p.n}</Text><Text style={{ color: C.muted, fontSize: 12.5 }}>{`${p.il} · ${t(catName(p.c))}`}</Text></View>
                    </Pressable>
                  )}
                  {!!e.note && <Text style={{ color: C.ink, marginTop: p ? 8 : 0, lineHeight: 21 }}>{e.note}</Text>}
                  {!!img && <Image source={{ uri: img }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.sm, marginTop: 8, backgroundColor: C.line }} />}
                  {own && <Pressable onPress={() => del(e)} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: 6 }} accessibilityRole="button"><Text style={{ color: C.muted, fontSize: 12.5 }}>{t('Sil')}</Text></Pressable>}
                </View>
              );
            })}
          </View>
        ))}
        {own && <Btn kind="ghost" label={t('Günlüğü sil')} onPress={delJournal} style={{ marginTop: 26 }} />}
      </ScrollView>
      {own && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16 }}>
          <Btn kind="pri" label={`＋ ${t('Kayıt ekle')}`} onPress={() => setAdding(true)} />
        </View>
      )}
      {own && <AddEntry open={adding} journalId={j.id} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
    </View>
  );
}

/* kayıt ekleme: yer (gezi listesinden, gittiklerinden ya da aramayla), gün, not, fotoğraf */
function AddEntry({ open, journalId, onClose, onDone }: { open: boolean; journalId: string; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { places, visited, byId } = useStore();
  const trip = useTrip();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [day, setDay] = useState(today());
  const [note, setNote] = useState('');
  const [img, setImg] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setQ(''); setPlace(null); setDay(today()); setNote(''); setImg(null); } }, [open]);
  const quick = useMemo(() => [...new Set([...trip.ids, ...[...visited].slice(-12).reverse()])].map((id) => byId(id)).filter(Boolean).slice(0, 10) as Place[], [trip.ids, visited, byId]);
  const found = useMemo(() => { const f = fold(q.trim()); if (f.length < 2) return []; return places.filter((p) => fold(`${p.n} ${p.il}`).includes(f)).slice(0, 8); }, [q, places]);
  const okDay = /^\d{4}-\d{2}-\d{2}$/.test(day) && !isNaN(Date.parse(day));
  async function save() {
    if (!me || !okDay || (!place && !note.trim() && !img)) return;
    setBusy(true);
    try {
      const path = img ? await uploadImage(me.id, img) : null;
      const { error } = await supabase.from('journal_entries').insert({ journal_id: journalId, place_id: place?.id || null, day, note: note.trim().slice(0, 1000), photo_path: path });
      if (error) { if (path) supabase.storage.from('photos').remove([path]).catch(() => {}); throw error; }
      track('act:journal_entry'); onDone();
    } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  const chip = (p: Place) => (
    <Pressable key={p.id} onPress={() => { setPlace(p); setQ(''); }} style={[s.pchip, place?.id === p.id && { borderColor: C.accent, backgroundColor: C.soft }]} accessibilityRole="button">
      <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{p.n}</Text>
    </Pressable>
  );
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim }]} onPress={onClose} accessibilityLabel={t('Kapat')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View style={[s.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink }}>{t('Kayıt ekle')}</Text>
            <Text style={[b.boxH, { marginTop: 12 }]}>{t('Yer')}</Text>
            {place ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <PlaceThumb p={place} size={40} /><Text style={{ flex: 1, color: C.ink, fontWeight: '800' }} numberOfLines={1}>{place.n}</Text>
                <Pressable onPress={() => setPlace(null)} hitSlop={8}><Text style={{ color: C.muted }}>✕</Text></Pressable>
              </View>
            ) : (
              <>
                {quick.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{quick.map(chip)}</View>}
                <TextInput value={q} onChangeText={setQ} placeholder={t('Yer ara (isteğe bağlı)')} placeholderTextColor={C.muted} style={[s.input, { marginTop: 8 }]} />
                {found.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{found.map(chip)}</View>}
              </>
            )}
            <Text style={[b.boxH, { marginTop: 12 }]}>{t('Gün (YYYY-AA-GG)')}</Text>
            <TextInput value={day} onChangeText={setDay} maxLength={10} keyboardType="numbers-and-punctuation" style={[s.input, !okDay && { borderColor: C.danger }]} />
            <Text style={[b.boxH, { marginTop: 12 }]}>{t('Not')}</Text>
            <TextInput value={note} onChangeText={setNote} multiline maxLength={1000} textAlignVertical="top" placeholder={t('Neler yaşadın? Ne yedin, kimle tanıştın?')} placeholderTextColor={C.muted} style={[s.input, { minHeight: 90, paddingTop: 10 }]} />
            {img ? <Image source={{ uri: img.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.sm, marginTop: 10 }} /> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Btn small label={`📷 ${t('Fotoğraf çek')}`} onPress={() => pickImage('camera').then((r) => r && setImg(r)).catch((e) => toast(trError(e)))} style={{ flex: 1 }} />
              <Btn small label={`🖼 ${t('Galeriden seç')}`} onPress={() => pickImage('library').then((r) => r && setImg(r)).catch((e) => toast(trError(e)))} style={{ flex: 1 }} />
            </View>
            <Btn kind="pri" label={t('Kaydet')} onPress={save} busy={busy} disabled={!okDay || (!place && !note.trim() && !img)} style={{ marginTop: 14 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  sheet: { maxHeight: '88%', backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  input: { minHeight: 44, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 12, color: C.ink, backgroundColor: C.bg },
  pchip: { maxWidth: '48%', borderWidth: 1, borderColor: C.chipLine, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6 },
});
