import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { trError } from '../lib/auth';
import { pickImage, type Picked } from '../lib/images';
import { useNav, useToast } from '../lib/ui';
import { Btn, Header, b } from '../components/common';
import { C, R } from '../theme';

/* Yorum yaz: yıldız puanı zorunlu, metin veya fotoğraftan en az biri */
export default function ComposeScreen({ id }: { id: string }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { byId, addReview } = useStore();
  const { pop, stack, push } = useNav();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [img, setImg] = useState<Picked | null>(null);
  const [busy, setBusy] = useState(false);
  const p = byId(id);
  const can = rating > 0 && (text.trim().length > 0 || !!img);

  async function choose(src: 'library' | 'camera') {
    try { const r = await pickImage(src); if (r) setImg(r); } catch (e) { toast(trError(e)); }
  }
  async function submit() {
    if (!can || !p) return;
    setBusy(true);
    try {
      await addReview(p.id, rating, text, img);
      toast('Yorumun paylaşıldı');
      pop();
      // yer kartı yığında değilse yorumlar sekmesiyle aç
      if (!stack.some((r) => r.name === 'place' && r.id === p.id)) push({ name: 'place', id: p.id, tab: 'rev' });
    } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onBack={pop} title={t('Deneyimini paylaş')} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <Text style={b.h2}>{p?.n}</Text>
        <Text style={[b.boxH, { marginTop: 16 }]}>{t('Puanın')}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setRating(i)} hitSlop={4} accessibilityRole="radio" accessibilityState={{ checked: rating === i }} accessibilityLabel={t('{1} yıldız', i)}>
              <Text style={{ fontSize: 38, color: i <= rating ? C.star : C.chipLine }}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Yorumun')}</Text>
        <TextInput value={text} onChangeText={setText} multiline maxLength={1000} placeholder={t('Neler gördün, ne tavsiye edersin?')} placeholderTextColor={C.muted}
          style={{ minHeight: 120, textAlignVertical: 'top', backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, padding: 14, fontSize: 16, color: C.ink }} />
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Fotoğraf')}</Text>
        {img ? (
          <View>
            <Image source={{ uri: img.uri }} style={{ width: '100%', aspectRatio: img.width / img.height || 4 / 3, borderRadius: R.md, backgroundColor: C.line }} />
            <Btn label={t('Kaldır')} kind="ghost" small onPress={() => setImg(null)} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={t('Galeriden seç')} onPress={() => choose('library')} style={{ flex: 1 }} />
            <Btn label={t('Fotoğraf çek')} onPress={() => choose('camera')} style={{ flex: 1 }} />
          </View>
        )}
        <Text style={b.fine}>{t('Yıldız puanı ve yorum ya da fotoğraftan en az biri gerekli.')}</Text>
        <Btn label={t('Paylaş')} kind="pri" onPress={submit} disabled={!can} busy={busy} style={{ marginTop: 18 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
