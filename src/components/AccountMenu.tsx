import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGS, useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/ui';
import { Avatar } from './common';
import { C, R, shadow } from '../theme';

/* Sağ üstteki profil düğmesi ve web sitesindeki gibi açılan küçük hesap penceresi */
export default function AccountMenu({ size = 50, top }: { size?: number; top?: number }) {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { me, signOut } = useAuth();
  const { push } = useNav();
  const [open, setOpen] = useState(false);
  if (!me) return null;
  const go = (fn: () => void) => { setOpen(false); fn(); };
  const items: [string, string, () => void, string?][] = [
    ['👤', 'Profilim', () => push({ name: 'profile' })],
    ['✨', 'İlgi alanlarım', () => push({ name: 'interests' })],
    ['🌐', 'Dil', () => push({ name: 'lang' }), LANGS[lang]],
    ['♥', 'Bize destek olun', () => push({ name: 'support' })],
  ];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.btn, { width: size, height: size, borderRadius: size / 2 }]} accessibilityRole="button" accessibilityLabel={t('Hesabım')}>
        <Avatar name={me.name} url={me.av} size={size - 6} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('Kapat')} />
        <View style={[s.pop, { top: top ?? insets.top + 66 }]}>
          <View style={s.head}>
            <Avatar name={me.name} url={me.av} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{me.name}</Text>
              <Text style={s.mail} numberOfLines={1}>{me.email}</Text>
            </View>
          </View>
          {items.map(([icon, label, fn, note]) => (
            <Pressable key={label} onPress={() => go(fn)} style={({ pressed }) => [s.item, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
              <Text style={[s.icon, label === 'Bize destek olun' && { color: C.accent }]}>{icon}</Text>
              <Text style={[s.label, label === 'Bize destek olun' && { color: C.accent }]} numberOfLines={1}>{t(label)}</Text>
              {!!note && <Text style={s.note} numberOfLines={1}>{note}</Text>}
            </Pressable>
          ))}
          <View style={s.sep} />
          <Pressable onPress={() => go(() => signOut())} style={({ pressed }) => [s.item, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
            <Text style={s.icon}>↪</Text>
            <Text style={s.label}>{t('Çıkış yap')}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  pop: { position: 'absolute', right: 12, width: 268, backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: 6, borderWidth: 1, borderColor: C.line, ...shadow, elevation: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '800', color: C.ink },
  mail: { fontSize: 12.5, color: C.muted },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { width: 22, textAlign: 'center', fontSize: 17, color: C.ink },
  label: { flex: 1, fontSize: 15.5, fontWeight: '700', color: C.ink },
  note: { fontSize: 13, color: C.muted, maxWidth: 100 },
  sep: { height: 1, backgroundColor: C.line, marginVertical: 4 },
});
