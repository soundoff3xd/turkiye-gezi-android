import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore, type CorrectionKind } from '../lib/store';
import { useLocation } from '../lib/location';
import { trError } from '../lib/auth';
import { useToast } from '../lib/ui';
import { Btn } from './common';
import { C, R } from '../theme';

const KINDS: [CorrectionKind, string, string][] = [
  ['konum', '📍', 'Konum yanlış'], ['bilgi', '📝', 'Açıklama veya bilgi yanlış'],
  ['kapali', '🚫', 'Burası kapandı / artık yok'], ['diger', '💬', 'Başka bir şey'],
];

/* "Bilgi yanlış": bir yer hakkında düzeltme önerisi gönder, moderatör inceler */
export default function CorrectionSheet({ placeId, open, onClose }: { placeId: string; open: boolean; onClose: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { correct } = useStore();
  const { pos, request } = useLocation();
  const toast = useToast();
  const [kind, setKind] = useState<CorrectionKind | null>(null);
  const [note, setNote] = useState('');
  const [useHere, setUseHere] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => { setKind(null); setNote(''); setUseHere(false); onClose(); };
  async function send() {
    if (!kind) return;
    setBusy(true);
    try {
      const here = kind === 'konum' && useHere && pos ? pos : null;
      await correct(placeId, kind, note, here?.lat, here?.lng);
      toast('Teşekkürler! Önerin moderatöre iletildi.'); close();
    } catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  const ok = !!kind && (note.trim().length >= 3 || (kind === 'konum' && useHere && !!pos) || kind === 'kapali');
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim }]} onPress={close} accessibilityLabel={t('Kapat')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View style={[s.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={s.h}>{t('Bilgi yanlış mı?')}</Text>
          <Text style={s.note}>{t('Neyin yanlış olduğunu söyle, moderatör inceleyip düzeltsin.')}</Text>
          {KINDS.map(([k, ic, l]) => (
            <Pressable key={k} onPress={() => setKind(k)} style={[s.item, kind === k && { borderColor: C.accent, backgroundColor: C.bg }]}
              accessibilityRole="radio" accessibilityState={{ selected: kind === k }}>
              <Text style={{ fontSize: 18 }}>{ic}</Text><Text style={s.itemTxt}>{t(l)}</Text>
            </Pressable>
          ))}
          {kind === 'konum' && (
            <Pressable onPress={() => { if (!pos) request(); setUseHere(!useHere); }} style={[s.item, { borderStyle: 'dashed' }, useHere && { borderColor: C.accent }]} accessibilityRole="checkbox" accessibilityState={{ checked: useHere }}>
              <Text style={{ fontSize: 16, color: useHere ? C.accent : C.muted }}>{useHere ? '☑' : '☐'}</Text>
              <Text style={[s.itemTxt, { fontSize: 14.5 }]}>{pos ? t('Şu an buradayım, doğru konum benim konumum') : t('Konumumu kullan')}</Text>
            </Pressable>
          )}
          {!!kind && (
            <TextInput value={note} onChangeText={setNote} multiline maxLength={600} textAlignVertical="top"
              placeholder={t('Doğrusu ne? Kısaca yaz…')} placeholderTextColor={C.muted}
              style={s.input} />
          )}
          <Btn kind="pri" label={t('Gönder')} onPress={send} busy={busy} disabled={!ok} style={{ marginTop: 10 }} />
          <Btn kind="ghost" label={t('Vazgeç')} onPress={close} style={{ marginTop: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 18, paddingHorizontal: 16 },
  h: { fontSize: 19, fontWeight: '800', color: C.ink },
  note: { color: C.muted, fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, marginTop: 6 },
  itemTxt: { fontSize: 15.5, color: C.ink, fontWeight: '600', flex: 1 },
  input: { minHeight: 80, maxHeight: 140, backgroundColor: C.bg, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, padding: 12, color: C.ink, fontSize: 15, marginTop: 10 },
});
