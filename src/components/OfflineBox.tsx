import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useT } from '../i18n';
import { useToast } from '../lib/ui';
import { track } from '../lib/telemetry';
import { deletePack, downloadTrip, packInfo, tripBox, NAME } from '../lib/offline';
import { Btn, b } from './common';
import { C } from '../theme';

/* Çevrimdışı harita kutusu: gezi listesi ya da bir ilin tamamı için (paket adı ayrı tutulur) */
export default function OfflineBox({ pts, name = NAME, doneText, introText }: { pts: { lat: number; lng: number }[]; name?: string; doneText: string; introText: string }) {
  const { t, num } = useT();
  const toast = useToast();
  const [dl, setDl] = useState<{ state: 'none' | 'busy' | 'done' | 'error'; pct: number }>({ state: 'none', pct: 0 });
  useEffect(() => { packInfo(name).then((i) => { if (i) setDl({ state: i.state === 'complete' || i.pct >= 100 ? 'done' : 'none', pct: i.pct }); }); }, [name]);
  async function download() {
    const bx = tripBox(pts); if (!bx) return;
    setDl({ state: 'busy', pct: 0 }); track(name === NAME ? 'act:offline_map' : 'act:offline_il');
    try {
      await downloadTrip(bx, (pct, done) => setDl({ state: done ? 'done' : 'busy', pct }), () => setDl({ state: 'error', pct: 0 }), name);
    } catch { setDl({ state: 'error', pct: 0 }); }
  }
  return (
    <View style={b.box}>
      <Text style={b.boxH}>{`📥 ${t('Çevrimdışı harita')}`}</Text>
      <Text style={b.boxT}>{t(dl.state === 'done' ? doneText : introText)}</Text>
      {dl.state === 'busy' && (
        <View style={{ height: 8, backgroundColor: C.line, borderRadius: 4, marginTop: 10, overflow: 'hidden' }}><View style={{ width: `${Math.max(3, dl.pct)}%`, height: '100%', backgroundColor: C.accent }} /></View>
      )}
      {dl.state === 'error' && <Text style={[b.fine, { color: C.danger }]}>{t('İndirme tamamlanamadı. İnternet bağlantını kontrol edip tekrar dene.')}</Text>}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <Btn small kind={dl.state === 'done' ? 'out' : 'pri'} busy={dl.state === 'busy'} label={dl.state === 'busy' ? `%${num(dl.pct)}` : dl.state === 'done' ? t('Yeniden indir') : t('Haritayı indir')} onPress={download} style={{ flex: 1 }} />
        {dl.state === 'done' && <Btn small label={t('Sil')} onPress={() => { deletePack(name).then(() => { setDl({ state: 'none', pct: 0 }); toast('Çevrimdışı harita silindi'); }); }} style={{ flex: 1 }} />}
      </View>
    </View>
  );
}
