import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { useStore, type Review } from '../lib/store';
import { trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { Avatar, Stars, b } from './common';
import ReportSheet, { type ReportReq } from './ReportSheet';
import { TranslateLink } from './Translate';
import { useAuth } from '../lib/auth';
import { C, R } from '../theme';

/* Yorum kartı: puan, metin, fotoğraf, faydalı bul (beğeni), yanıtlar */
export default function ReviewCard({ x, showPlace }: { x: Review; showPlace?: boolean }) {
  const { t, num, ago } = useT();
  const { liked, like, reply, byId, plikes, photoLike } = useStore();
  const { push } = useNav();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState<ReportReq>(null);
  const { me } = useAuth();
  const mine = me?.id === x.uid;
  const isLiked = liked.has(x.id);
  const likes = x.likes + (isLiked ? 1 : 0);
  const place = showPlace ? byId(x.pid) : undefined;

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    try { await reply(x.id, draft); setDraft(''); } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }

  return (
    <View style={b.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => push({ name: 'traveler', id: x.uid })} accessibilityRole="button" accessibilityLabel={t('{1} profilini aç', x.author)}><Avatar name={x.author} url={x.av} size={38} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text onPress={() => push({ name: 'traveler', id: x.uid })} style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{x.author}</Text>
          <Text style={{ color: C.muted, fontSize: 12.5 }}>{place ? `${place.n} · ${ago(x.at)}` : ago(x.at)}</Text>
        </View>
        {!mine && (
          <Pressable onPress={() => setRep({ type: 'review', id: x.id, choices: x.photo ? ['review', 'photo'] : undefined })} hitSlop={12} style={{ paddingHorizontal: 6 }}
            accessibilityRole="button" accessibilityLabel={t('Şikâyet et')}>
            <Text style={{ color: C.muted, fontSize: 20, fontWeight: '800' }}>⋯</Text>
          </Pressable>
        )}
      </View>
      {(x.hidden || (mine && x.photoHidden)) && (
        <Text style={{ marginTop: 8, color: x.photoPending && !x.hidden ? C.muted : C.danger, fontSize: 13, fontWeight: '700' }}>{t(x.hidden ? 'Bu yorum şikâyetler nedeniyle gizlendi; moderatör inceliyor.' : x.photoPending ? 'Fotoğrafın kısa bir kontrolden sonra herkese görünecek.' : 'Bu fotoğraf şikâyetler nedeniyle gizlendi; moderatör inceliyor.')}</Text>
      )}
      <View style={{ marginTop: 8 }}><Stars value={x.rating} /></View>
      {!!x.text && <Text style={{ color: C.ink, fontSize: 15.5, lineHeight: 22, marginTop: 6 }}>{x.text}</Text>}
      {!!x.text && <TranslateLink text={x.text} />}
      {!!x.photo && (
        <Pressable onPress={() => push({ name: 'photo', id: 'pp' + x.id })} accessibilityRole="imagebutton" accessibilityLabel={t('Fotoğrafı büyüt')}>
          <Image source={{ uri: x.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.sm, marginTop: 10, backgroundColor: C.line }} resizeMode="cover" />
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
        <Pressable onPress={() => like(x.id).catch((e) => toast(trError(e)))} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: isLiked }}>
          <Text style={{ color: isLiked ? C.accent : C.muted, fontWeight: '700' }}>{`${isLiked ? '▲' : '△'} ${t('Faydalı')} (${num(likes)})`}</Text>
        </Pressable>
        {!!x.photo && (
          <Pressable onPress={() => photoLike(x.id).then((on) => on && toast('Fotoğrafı beğendin')).catch((e) => toast(trError(e)))} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: plikes.has(x.id) ? C.accent : C.muted, fontWeight: '700' }}>{plikes.has(x.id) ? `♥ ${t('Fotoğrafı beğendin')}` : `♡ ${t('Fotoğrafı beğen')}`}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <Text style={{ color: C.muted, fontWeight: '700' }}>{`${t('Yanıtlar')} (${num(x.replies.length)})`}</Text>
        </Pressable>
      </View>
      {open && (
        <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: C.line }}>
          {x.replies.map((r, i) => (
            <View key={r.id || i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <Avatar name={r.a} url={r.av} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.ink, fontSize: 13.5 }}>{r.a}</Text>
                <Text style={{ color: C.ink, fontSize: 14.5, lineHeight: 20 }}>{r.t}</Text>
                {r.hidden && <Text style={{ color: C.danger, fontSize: 12.5, fontWeight: '700' }}>{t('Gizlendi; moderatör inceliyor.')}</Text>}
              </View>
              {!!r.id && r.uid !== me?.id && (
                <Pressable onPress={() => setRep({ type: 'reply', id: r.id })} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Yanıtı şikâyet et')}>
                  <Text style={{ color: C.muted, fontSize: 16, fontWeight: '800' }}>⋯</Text>
                </Pressable>
              )}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={draft} onChangeText={setDraft} placeholder={t('Yanıt yaz…')} placeholderTextColor={C.muted} maxLength={500}
              style={{ flex: 1, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, color: C.ink, backgroundColor: C.bg }}
              onSubmitEditing={send} returnKeyType="send" />
            <Pressable onPress={send} disabled={busy || !draft.trim()} style={{ backgroundColor: C.solid, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, opacity: busy || !draft.trim() ? 0.5 : 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('Gönder')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <ReportSheet req={rep} onClose={() => setRep(null)} />
    </View>
  );
}
