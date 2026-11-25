import React, { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore, type Suggestion } from '../lib/store';
import { useAuth, trError } from '../lib/auth';
import { useNav, useToast } from '../lib/ui';
import { Avatar, Btn, Empty, Header, b } from '../components/common';
import { DAILY, NEED, REPORT_LIMIT, STATUS_TXT, catName } from '../data/catalog';
import { C, R } from '../theme';

/* Önerilen yerler: topluluk onayı ve moderasyon */
export default function PendingScreen() {
  const { t, num, ago } = useT();
  const insets = useSafeAreaInsets();
  const { me } = useAuth();
  const { sugg, myVotes, vote, moderate, byId } = useStore();
  const { pop, push, showOnMap } = useNav();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const list = sugg.slice().sort((a, b) => (b.own ? 1 : 0) - (a.own ? 1 : 0));

  async function doVote(g: Suggestion, val: 1 | -1) {
    setBusy(g.id + val);
    try {
      const r = await vote(g.id, val);
      if (r === 'added') toast('{1} haritaya eklendi', g.n);
      else if (r === 'mod') toast('Öneri moderatöre gönderildi');
      else if (r === 'reported') toast('Bildirimin alındı');
      else toast('Oyun kaydedildi');
    } catch (e) { toast(trError(e)); } finally { setBusy(null); }
  }
  async function doMod(g: Suggestion, ok: boolean) {
    setBusy(g.id + (ok ? 'm1' : 'm0'));
    try { await moderate(g.id, ok); toast(ok ? 'Onaylandı, haritada' : 'Öneri reddedildi'); } catch (e) { toast(trError(e)); } finally { setBusy(null); }
  }
  const color = (st: string) => (st === 'ok' ? C.ok : st === 'wait' ? C.star : C.danger);

  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={pop} title={t('Önerilen yerler')} right={<Btn label={`＋ ${t('Yer öner')}`} kind="pri" small onPress={() => push({ name: 'suggest' })} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
        <View style={b.box}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 4 }}>{t('Nasıl doğrulanıyor?')}</Text>
          <Text style={b.boxT}>{t('1. Otomatik kontrol: konum Türkiye içinde mi, aynı yer zaten var mı, uygunsuz ifade ya da bağlantı var mı, kanıt fotoğrafı eklenmiş mi.')}</Text>
          <Text style={[b.boxT, { marginTop: 4 }]}>{t('2. Topluluk onayı: {1} kullanıcı “Burası gerçek” deyince yer haritaya eklenir. Kimse kendi önerisini onaylayamaz.', NEED)}</Text>
          <Text style={[b.boxT, { marginTop: 4 }]}>{t('3. Moderatör: {1} “Yanlış ya da uygunsuz” bildirimi alan öneri yayından kalkar ve moderatöre düşer.', REPORT_LIMIT)}</Text>
          <Text style={[b.boxT, { marginTop: 4 }]}>{t('Kişi başı günde {1} öneri hakkı var.', DAILY)}</Text>
        </View>
        {list.length === 0 && <Empty title={t('Şu an bekleyen öneri yok.')} action={t('Yer öner')} onAction={() => push({ name: 'suggest' })} />}
        {list.map((g) => {
          const v = myVotes[g.id], pct = Math.min(100, (g.ok / NEED) * 100);
          return (
            <View key={g.id} style={b.card}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Avatar name={g.by} url={g.av} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{g.n}</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{`${g.il} · ${t(catName(g.c))} · ${t('öneren {1}, {2}', g.by, ago(g.at))}`}</Text>
                </View>
              </View>
              <Text style={{ color: C.ink, marginTop: 8, lineHeight: 21 }}>{g.d}</Text>
              {!!g.photo && <Image source={{ uri: g.photo }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: R.sm, marginTop: 10, backgroundColor: C.line }} />}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ fontWeight: '800', color: color(g.state) }}>{t(STATUS_TXT[g.state])}</Text>
                <Text style={{ color: C.muted }}>{g.bad ? t('{1}/{2} onay · {3} bildirim', num(g.ok), num(NEED), num(g.bad)) : t('{1}/{2} onay', num(g.ok), num(NEED))}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.line, borderRadius: 3, marginTop: 6, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.ok }} /></View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Btn small label={t('Haritada gör')} onPress={() => (g.state === 'ok' && g.placeId && byId(g.placeId) ? showOnMap({ id: g.placeId }) : showOnMap({ lat: g.lat, lng: g.lng }))} />
                {g.state === 'wait' && !g.own && (
                  <>
                    <Btn small label={v === 'ok' ? `✓ ${t('Burası gerçek')}` : t('Burası gerçek')} kind={v === 'ok' ? 'on' : 'out'} disabled={!!v} busy={busy === g.id + 1} onPress={() => doVote(g, 1)} />
                    <Btn small label={v === 'bad' ? `✓ ${t('Yanlış / uygunsuz')}` : t('Yanlış / uygunsuz')} kind={v === 'bad' ? 'on' : 'out'} disabled={!!v} busy={busy === g.id + -1} onPress={() => doVote(g, -1)} />
                  </>
                )}
              </View>
              {me?.isMod && (g.state === 'wait' || g.state === 'mod') && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <Btn small label={t('Moderatör: onayla')} kind="pri" busy={busy === g.id + 'm1'} onPress={() => doMod(g, true)} style={{ flex: 1 }} />
                  <Btn small label={t('Moderatör: reddet')} busy={busy === g.id + 'm0'} onPress={() => doMod(g, false)} style={{ flex: 1 }} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
