import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { logCrash } from '../lib/telemetry';
import { C } from '../theme';

/* Bir ekran hata verirse uygulama kapanmasın: hata kaydedilir, kullanıcıya "Tekrar dene" gösterilir */
type P = { children: React.ReactNode; label?: string; t?: (s: string) => string };
export default class ErrorBoundary extends React.Component<P, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e: unknown, info: { componentStack?: string | null }) { logCrash(e, `${this.props.label || 'screen'} ${(info?.componentStack || '').slice(0, 150)}`); }
  render() {
    if (!this.state.err) return this.props.children;
    const t = this.props.t || ((s: string) => s);
    return (
      <View style={{ flex: 1, backgroundColor: C.screen, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <Text style={{ fontSize: 40 }}>🧭</Text>
        <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 10, textAlign: 'center' }}>{t('Bir şeyler ters gitti')}</Text>
        <Text style={{ color: C.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>{t('Sorunu kaydettik ve inceleyeceğiz. Tekrar deneyebilirsin.')}</Text>
        <Pressable onPress={() => this.setState({ err: false })} style={{ marginTop: 18, backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 }} accessibilityRole="button">
          <Text style={{ color: C.onAccent, fontWeight: '800' }}>{t('Tekrar dene')}</Text>
        </Pressable>
      </View>
    );
  }
}
