import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/lib/auth';
import AuthScreen from './src/screens/AuthScreen';
import MapScreen from './src/screens/MapScreen';
import { C } from './src/theme';

function Root() {
  const { ready, me } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  // Hesap olmadan uygulama kullanılamaz
  return me ? <MapScreen /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
