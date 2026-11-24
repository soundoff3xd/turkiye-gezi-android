import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore, type ReportTarget } from '../lib/store';
import { trError } from '../lib/auth';
import { useToast } from '../lib/ui';
import { C, R } from '../theme';

export const REASONS: [string, string][] = [
  ['spam', 'Spam veya reklam'], ['hakaret', 'Hakaret veya nefret söylemi'], ['uygunsuz', 'Uygunsuz içerik'],
  ['yanlis', 'Yanlış veya yanıltıcı bilgi'], ['diger', 'Diğer'],
];
export type ReportReq = { type: ReportTarget; id: string; choices?: ReportTarget[] } | null;
const TITLE: Record<ReportTarget, string> = { review: 'Yorumu şikâyet et', photo: 'Fotoğrafı şikâyet et', reply: 'Yanıtı şikâyet et' };

/* Şikâyet penceresi: neyi ve neden şikâyet ettiğini seç */
export default function ReportSheet({ req, onClose }: { req: ReportReq; onClose: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { report } = useStore();
  const toast = useToast();
  const [type, setType] = useState<ReportTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = req ? (type || (req.choices && req.choices.length > 1 ? null : req.type)) : null;
  const close = () => { setType(null); onClose(); };
  async function send(reason: string) {
    if (!req || !cur) return;
    setBusy(true);
    try { await report(cur, req.id, reason); toast('Şikâyetin alındı. Teşekkürler!'); close(); }
    catch (e) { toast(trError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,.35)' }]} onPress={close} accessibilityLabel={t('Kapat')} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {!cur ? (
          <>
            <Text style={s.h}>{t('Neyi şikâyet etmek istiyorsun?')}</Text>
            {(req?.choices || []).map((c) => (
              <Pressable key={c} onPress={() => setType(c)} style={({ pressed }) => [s.item, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
                <Text style={s.itemTxt}>{t(TITLE[c])}</Text><Text style={{ color: C.muted }}>›</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={s.h}>{t(TITLE[cur])}</Text>
            <Text style={s.note}>{t('Şikâyetler gizli tutulur. Üç farklı kişi şikâyet ederse içerik otomatik gizlenir ve moderatör inceler.')}</Text>
            {busy ? <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} /> : REASONS.map(([k, l]) => (
              <Pressable key={k} onPress={() => send(k)} style={({ pressed }) => [s.item, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
                <Text style={s.itemTxt}>{t(l)}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Pressable onPress={close} style={[s.item, { justifyContent: 'center', borderBottomWidth: 0 }]} accessibilityRole="button">
          <Text style={{ color: C.muted, fontWeight: '700' }}>{t('Vazgeç')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 8 },
  h: { fontSize: 18, fontWeight: '800', color: C.ink, paddingHorizontal: 12 },
  note: { color: C.muted, fontSize: 13, lineHeight: 18, paddingHorizontal: 12, marginTop: 6, marginBottom: 6 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, borderRadius: R.sm },
  itemTxt: { fontSize: 16, color: C.ink, fontWeight: '600' },
});
