import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { C, R } from '../theme';

/* Uygulama hesapsız kullanılamaz: açılışta bu ekran gelir */
export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return setMsg({ ok: false, text: 'Geçerli bir e-posta adresi gir.' });
    if (pass.length < 8) return setMsg({ ok: false, text: 'Şifre en az 8 karakter olmalı.' });
    setBusy(true);
    try {
      if (mode === 'up') {
        const r = await signUp(name, e, pass);
        if (r === 'confirm') {
          setMode('in'); setPass('');
          setMsg({ ok: true, text: 'Hesabını doğrulamak için e-postana bir bağlantı gönderdik. Bağlantıya tıkladıktan sonra buradan giriş yap.' });
        }
      } else {
        await signIn(e, pass);
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.wrap, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={s.logo}><Text style={s.logoTxt}>TR</Text></View>
        <Text style={s.title}>Türkiye Gezi Rehberi</Text>
        <Text style={s.sub}>Gezilecek yerleri keşfet, gittiğin yerleri işaretle, deneyimlerini paylaş.</Text>

        <View style={s.seg} accessibilityRole="tablist">
          {(['up', 'in'] as const).map((m) => (
            <Pressable key={m} onPress={() => { setMode(m); setMsg(null); }} style={[s.segBtn, mode === m && s.segOn]}
              accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
              <Text style={[s.segTxt, mode === m && s.segTxtOn]}>{m === 'up' ? 'Üye ol' : 'Giriş yap'}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'up' && (
          <>
            <Text style={s.label}>Adın</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Diğer gezginler bu adı görür"
              placeholderTextColor={C.muted} autoComplete="name" maxLength={30} returnKeyType="next" />
          </>
        )}
        <Text style={s.label}>E-posta</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" placeholderTextColor={C.muted}
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false} returnKeyType="next" />
        <Text style={s.label}>Şifre</Text>
        <TextInput style={s.input} value={pass} onChangeText={setPass} placeholder="En az 8 karakter" placeholderTextColor={C.muted}
          secureTextEntry autoCapitalize="none" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} onSubmitEditing={submit} returnKeyType="go" />

        {msg && <Text style={[s.msg, { color: msg.ok ? C.ok : C.danger }]} accessibilityLiveRegion="polite">{msg.text}</Text>}

        <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [s.go, (pressed || busy) && { opacity: 0.8 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={C.onAccent} /> : <Text style={s.goTxt}>{mode === 'up' ? 'Hesap oluştur' : 'Giriş yap'}</Text>}
        </Pressable>
        <Text style={s.fine}>Hesabın web sitesinde de geçerlidir.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoTxt: { color: C.onAccent, fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 30, fontWeight: '800', color: C.ink, fontFamily: Platform.select({ android: 'serif', ios: 'Georgia' }) },
  sub: { fontSize: 15.5, color: C.muted, marginTop: 8, lineHeight: 22 },
  seg: { flexDirection: 'row', backgroundColor: C.line, borderRadius: R.md, padding: 4, marginTop: 28, marginBottom: 8 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center' },
  segOn: { backgroundColor: C.surface },
  segTxt: { fontSize: 15, fontWeight: '600', color: C.muted },
  segTxtOn: { color: C.ink },
  label: { fontSize: 13.5, fontWeight: '700', color: C.ink, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink },
  msg: { marginTop: 14, fontSize: 14.5, lineHeight: 20 },
  go: { backgroundColor: C.accent, borderRadius: R.pill, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  goTxt: { color: C.onAccent, fontSize: 16, fontWeight: '700' },
  fine: { textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 14 },
});
