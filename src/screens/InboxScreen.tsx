import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { useNav } from '../lib/ui';
import { loadNotes, markAllRead, type Note } from '../lib/inbox';
import { Empty, Header, b } from '../components/common';
import { C, R } from '../theme';

const ICON: Record<Note['kind'], string> = { reply: '💬', like: '♥', photo_like: '📷', approved: '✅', answer: '❓', follow: '👤', trip_join: '👥' };
const TXT: Record<Note['kind'], string> = {
  reply: '{1} yorumuna yanıt verdi', like: '{1} yorumunu beğendi', photo_like: '{1} fotoğrafını beğendi', approved: 'Önerdiğin yer onaylandı ve haritaya eklendi', answer: '{1} sorunu yanıtladı', follow: '{1} seni takip etmeye başladı', trip_join: '{1} ortak gezi listene katıldı',
};

/* Bildirimler: yorumlarına gelen yanıtlar ve beğeniler, onaylanan öneriler */
export default function InboxScreen() {
  const { t, ago } = useT();
  const insets = useSafeAreaInsets();
  const { byId } = useStore();
  const { pop, push } = useNav();
  const [list, setList] = useState<Note[] | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    setErr(false);
    try {
      const l = await loadNotes(); setList(l);
      if (l.some((n) => !n.read)) markAllRead().catch(() => {});
    } catch { setErr(true); setList([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const open = (n: Note) => {
    if (n.kind === 'follow' && n.actor) { push({ name: 'traveler', id: n.actor }); return; }
    if (n.kind === 'trip_join') { push({ name: 'sharedTrips' }); return; }
    if (!n.place_id || !byId(n.place_id)) return;
    push({ name: 'place', id: n.place_id, tab: n.kind === 'photo_like' ? 'pho' : n.kind === 'approved' ? 'ov' : n.kind === 'answer' ? 'qa' : 'rev' });
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Bildirimler')} right={<Pressable onPress={load} hitSlop={8} accessibilityLabel={t('Yenile')}><Text style={{ color: C.accent, fontWeight: '800' }}>↻</Text></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        {list == null ? <ActivityIndicator color={C.accent} style={{ marginTop: 30 }} />
          : err ? <Empty title={t('Bildirimler yüklenemedi.')} note={t('İnternet bağlantını kontrol et.')} action={t('Tekrar dene')} onAction={load} />
            : !list.length ? <Empty title={t('Henüz bildirimin yok')} note={t('Yorumlarına yanıt gelince ya da biri beğenince burada görürsün.')} />
              : list.map((n) => {
                const p = n.place_id ? byId(n.place_id) : undefined;
                return (
                  <Pressable key={n.id} onPress={() => open(n)} style={[b.card, { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, !n.read && { borderColor: C.accent, backgroundColor: C.soft }]} accessibilityRole="button">
                    <View style={{ width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}>
                      <Text style={{ fontSize: 17, color: n.kind === 'like' ? C.accent : C.ink }}>{ICON[n.kind]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.ink, fontSize: 15, lineHeight: 21, fontWeight: n.read ? '500' : '700' }}>{n.kind === 'approved' ? t(TXT[n.kind]) : t(TXT[n.kind], n.actorName)}</Text>
                      {!!p && <Text style={{ color: C.accent, fontWeight: '700', marginTop: 2 }}>{p.n}</Text>}
                      <Text style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{ago(n.created_at)}</Text>
                    </View>
                  </Pressable>
                );
              })}
      </ScrollView>
    </View>
  );
}
