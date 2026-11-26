import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGS, useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useNav } from '../lib/ui';
import { useUnread } from '../lib/inbox';
import { Avatar } from './common';
import { C, R, isDark, shadow } from '../theme';

/* Sağ üstteki profil düğmesi ve web sitesindeki gibi açılan küçük hesap penceresi */
export default function AccountMenu({ size = 50, top }: { size?: number; top?: number }) {
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { me, signOut } = useAuth();
  const { push } = useNav();
  const [open, setOpen] = useState(false);
  const unread = useUnread();
  if (!me) return null;
  const go = (fn: () => void) => { setOpen(false); fn(); };
  // gruplar: hesap · ayarlar · destek (gezi planlamayla ilgili her şey Planla sekmesinde)
  const groups: [string, [string, string, () => void, string?][]][] = [
    ['Hesap', [
      ['🔔', 'Bildirimler', () => push({ name: 'inbox' }), unread ? String(unread) : undefined],
      ['👤', 'Profilim', () => push({ name: 'profile' })],
      ['✨', 'İlgi alanlarım', () => push({ name: 'interests' })],
    ]],
    ['Ayarlar', [
      ['🌐', 'Dil', () => push({ name: 'lang' }), LANGS[lang]],
      ['🌓', 'Görünüm', () => push({ name: 'theme' }), isDark ? t('Koyu tema') : t('Açık tema')],
      ['🔒', 'Gizlilik ve KVKK', () => push({ name: 'privacy' })],
    ]],
    ['Destek', [
      ['❔', 'Yardım', () => push({ name: 'help' })],
      ['💬', 'Görüş ve öneri gönder', () => push({ name: 'feedback' })],
      ...(me.isMod ? [['🛡', 'Moderatör paneli', () => push({ name: 'mod' })] as [string, string, () => void]] : []),
      ['♥', 'Bize destek olun', () => push({ name: 'support' })],
    ]],
  ];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[s.btn, { width: size, height: size, borderRadius: size / 2 }]} accessibilityRole="button" accessibilityLabel={t('Hesabım')}>
        <Avatar name={me.name} url={me.av} size={size - 6} />
        {unread > 0 && <View style={s.dot}><Text style={s.dotTxt}>{unread > 9 ? '9+' : unread}</Text></View>}
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
          {groups.map(([g, items]) => (
            <View key={g}>
              <Text style={s.group}>{t(g)}</Text>
              {items.map(([icon, label, fn, note]) => (
                <Pressable key={label} onPress={() => go(fn)} style={({ pressed }) => [s.item, pressed && { backgroundColor: C.line }]} accessibilityRole="button">
                  <Text style={[s.icon, label === 'Bize destek olun' && { color: C.accent }]}>{icon}</Text>
                  <Text style={[s.label, label === 'Bize destek olun' && { color: C.accent }]} numberOfLines={1}>{t(label)}</Text>
                  {!!note && <Text style={[s.note, label === 'Bildirimler' && s.badge]} numberOfLines={1}>{note}</Text>}
                </Pressable>
              ))}
            </View>
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
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9.5 },
  group: { color: C.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 },
  icon: { width: 22, textAlign: 'center', fontSize: 17, color: C.ink },
  label: { flex: 1, fontSize: 15.5, fontWeight: '700', color: C.ink },
  note: { fontSize: 13, color: C.muted, maxWidth: 100 },
  dot: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.surface },
  dotTxt: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' },
  badge: { backgroundColor: C.accent, color: '#FFFFFF', fontWeight: '800', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 1 },
  sep: { height: 1, backgroundColor: C.line, marginVertical: 4 },
});
