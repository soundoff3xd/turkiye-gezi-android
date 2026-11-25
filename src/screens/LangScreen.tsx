import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGS, useT } from '../i18n';
import { useNav } from '../lib/ui';
import { Header } from '../components/common';
import { C } from '../theme';

export default function LangScreen({ onClose }: { onClose?: () => void }) {
  const { t, lang, setLang } = useT();
  const nav = useNav();
  const close = onClose || (() => nav?.pop());
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={close} title={t('Dil')} />
      <FlatList
        data={Object.entries(LANGS)} keyExtractor={([k]) => k} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item: [k, name] }) => (
          <Pressable onPress={() => { setLang(k); close(); }} style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: pressed ? C.line : C.bg })}
            accessibilityRole="radio" accessibilityState={{ checked: lang === k }}>
            <Text style={{ fontSize: 16.5, color: C.ink, fontWeight: lang === k ? '800' : '500' }}>{name}</Text>
            {lang === k && <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800' }}>✓</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}
