import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

/* Web sitesiyle aynı veritabanı: hesaplar, yorumlar ve yerler ortak.
   Bu anahtar herkese açık "anon" anahtardır; güvenliği veritabanındaki kurallar (RLS) sağlar. */
export const SUPABASE_URL = 'https://ljupvldmnginkvuuafll.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdXB2bGRtbmdpbmt2dXVhZmxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NjAzODAsImV4cCI6MjExMTAzNjM4MH0.Jwi1Bh7e6gv7H5-Rg7HzDbLlbJ0uKwQCjekwQH3Q6v0';
export const SITE_URL = 'https://turkiye-gezi-rehberi-yeb7.netlify.app/';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Uygulama ön plandayken oturum yenilemesini çalıştır, arka plandayken durdur
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
