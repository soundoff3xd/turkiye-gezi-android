import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useT } from '../i18n';
import { useStore } from '../lib/store';
import { trError } from '../lib/auth';
import { pickImage, type Picked } from '../lib/images';
import { useNav, useToast } from '../lib/ui';
import { Btn, Header, b } from '../components/common';
import { BAD_WORDS, DAILY, GROUPS, NEED, PROVINCES, SUBS, fold, inTurkey, meters, nearestProvince } from '../data/catalog';
import { C, R } from '../theme';
import { MAP_STYLE } from './MapScreen';
import { useLocation } from '../lib/location';

type Pt = { lat: number; lng: number; inTr: boolean };

/* Yer öner: otomatik kontroller + kanıt fotoğrafı; 3 kişi onaylayınca haritaya eklenir */
export default function SuggestScreen() {
  const { t, num } = useT();
  const insets = useSafeAreaInsets();
  const { places, sugg, mineToday, addSuggestion } = useStore();
  const { pop, reset, push } = useNav();
  const toast = useToast();
  const [n, setN] = useState('');
  const [d, setD] = useState('');
  const [c, setC] = useState('');
  const [il, setIl] = useState('');
  const [pt, setPt] = useState<Pt | null>(null);
  const [img, setImg] = useState<Picked | null>(null);
  const [been, setBeen] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<null | 'map' | 'il' | 'cat'>(null);

  function check() {
    const e: string[] = [], name = n.trim(), desc = d.trim(), all = fold(name + ' ' + desc);
    if (name.length < 3 || name.length > 60) e.push(t('Yer adı {1} ile {2} karakter arasında olmalı.', 3, 60));
    if (desc.length < 20) e.push(t('Kısa açıklama en az {1} karakter olmalı; ne görüleceğini birkaç kelimeyle anlat.', 20));
    if (/https?:|www\.|\.(com|net|org)\b/i.test(name + desc)) e.push(t('Bağlantı (link) eklenemez.'));
    if (/(.)\1{4,}/.test(name + desc) || (name.length > 5 && name === name.toLocaleUpperCase('tr') && /[A-ZÇĞİÖŞÜ]{6}/.test(name))) e.push(t('Tekrarlanan harf veya tamamı büyük harf kullanma.'));
    if (BAD_WORDS.some((w) => all.split(/[^a-z0-9]+/).includes(fold(w)))) e.push(t('Uygunsuz ifade içeriyor.'));
    if (!c) e.push(t('Kategori seç.'));
    if (!il) e.push(t('İl seç.'));
    if (!pt) e.push(t('Haritada konumu işaretle.'));
    else {
      if (!pt.inTr) e.push(t('Seçilen konum Türkiye sınırları dışında.'));
      const dup = [...places, ...sugg.filter((g) => g.state !== 'no')].find((p) => meters(p.lat, p.lng, pt.lat, pt.lng) < 300 || (name.length > 3 && fold(p.n) === fold(name)));
      if (dup) e.push(t('Bu yer zaten var ya da çok yakınında kayıt bulunuyor: {1}.', dup.n));
    }
    if (!img) e.push(t('Kanıt olarak orada çektiğin bir fotoğraf ekle.'));
    if (!been) e.push(t('Yeri kendin ziyaret ettiğini onayla.'));
    if (mineToday >= DAILY) e.push(t('Günde en fazla {1} yer önerebilirsin.', DAILY));
    return e;
  }
  async function submit() {
    const e = check(); setErrs(e);
    if (e.length) return;
    setBusy(true);
    try {
      await addSuggestion({ n, il, c, lat: pt!.lat, lng: pt!.lng, d, img: img! });
      toast('Önerin incelemeye alındı');
      reset(); push({ name: 'pending' });
    } catch (err) { setErrs([t(trError(err))]); } finally { setBusy(false); }
  }
  async function choose(src: 'library' | 'camera') { try { const r = await pickImage(src); if (r) setImg(r); } catch (e) { toast(trError(e)); } }

  const field = { backgroundColor: C.surface, borderWidth: 1, borderColor: C.chipLine, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.ink } as const;
  const sel = (label: string, value: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={[field, { flexDirection: 'row', justifyContent: 'space-between' }]} accessibilityRole="button">
      <Text style={{ fontSize: 16, color: value ? C.ink : C.muted }}>{value || label}</Text><Text style={{ color: C.muted }}>▾</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.screen }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onBack={pop} title={t('Yer öner')} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: C.muted, lineHeight: 20 }}>{t('Önerin otomatik kontrollerden geçer, sonra {1} kullanıcı onaylayınca haritaya eklenir. Şikâyet alan öneriler moderatöre gider.', NEED)}</Text>
        <Text style={[b.boxH, { marginTop: 16 }]}>{t('Yer adı')}</Text>
        <TextInput value={n} onChangeText={setN} maxLength={60} style={field} placeholder={t('Örn. Tortum Şelalesi')} placeholderTextColor={C.muted} />
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Kategori')}</Text>
        {sel(t('Kategori seç'), c ? t(SUBS[c][1]) : '', () => setPicker('cat'))}
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Konum')}</Text>
        <Pressable onPress={() => setPicker('map')} style={[field, { flexDirection: 'row', justifyContent: 'space-between' }]} accessibilityRole="button">
          <Text style={{ color: pt ? C.ink : C.muted, fontSize: 16, flex: 1 }}>{pt ? `${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)}${pt.inTr ? '' : ' ⚠'}` : t('Haritada işaretle')}</Text>
          <Text style={{ color: C.accent, fontWeight: '800' }}>{pt ? t('Değiştir') : '📍'}</Text>
        </Pressable>
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('İl')}</Text>
        {sel(t('İl seç'), il, () => setPicker('il'))}
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Kısa açıklama')}</Text>
        <TextInput value={d} onChangeText={setD} multiline maxLength={400} style={[field, { minHeight: 100, textAlignVertical: 'top' }]} placeholder={t('Burada ne görülür, neden gidilmeli?')} placeholderTextColor={C.muted} />
        <Text style={[b.boxH, { marginTop: 14 }]}>{t('Kanıt fotoğrafı')}</Text>
        {img ? (
          <View>
            <Image source={{ uri: img.uri }} style={{ width: '100%', aspectRatio: img.width / img.height || 4 / 3, borderRadius: R.md }} />
            <Btn label={t('Kaldır')} kind="ghost" small onPress={() => setImg(null)} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label={t('Galeriden seç')} onPress={() => choose('library')} style={{ flex: 1 }} />
            <Btn label={t('Fotoğraf çek')} onPress={() => choose('camera')} style={{ flex: 1 }} />
          </View>
        )}
        <Pressable onPress={() => setBeen(!been)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }} accessibilityRole="checkbox" accessibilityState={{ checked: been }}>
          <Switch value={been} onValueChange={setBeen} trackColor={{ true: C.accent, false: C.chipLine }} thumbColor="#FFFFFF" />
          <Text style={{ flex: 1, color: C.ink }}>{t('Bu yeri kendim ziyaret ettim')}</Text>
        </Pressable>
        {errs.length > 0 && (
          <View style={[b.box, { borderColor: C.danger }]} accessibilityLiveRegion="polite">
            <Text style={{ fontWeight: '800', color: C.danger }}>{t('Önerin gönderilmedi:')}</Text>
            {errs.map((e, i) => <Text key={i} style={{ color: C.ink, marginTop: 4 }}>{`• ${e}`}</Text>)}
          </View>
        )}
        <Text style={b.fine}>{t('Kişi başı günde {1} öneri hakkı var.', DAILY)}</Text>
        <Btn label={t('Öneriyi gönder')} kind="pri" onPress={submit} busy={busy} style={{ marginTop: 14 }} />
      </ScrollView>

      <Modal visible={picker === 'map'} animationType="slide" onRequestClose={() => setPicker(null)}>
        <PickMap initial={pt} onCancel={() => setPicker(null)} onPick={(p) => { setPt(p); if (p.inTr) setIl(nearestProvince(p.lat, p.lng)); setPicker(null); }} />
      </Modal>
      <Modal visible={picker === 'il'} animationType="slide" onRequestClose={() => setPicker(null)}>
        <ListPick title={t('İl seç')} items={PROVINCES.map((p) => [p.n, p.n])} value={il} onPick={(v) => { setIl(v); setPicker(null); }} onClose={() => setPicker(null)} />
      </Modal>
      <Modal visible={picker === 'cat'} animationType="slide" onRequestClose={() => setPicker(null)}>
        <ListPick title={t('Kategori seç')} items={GROUPS.flatMap(([g, gl]) => [[`#${g}`, t(gl)] as [string, string], ...Object.entries(SUBS).filter(([, v]) => v[0] === g).map(([k, v]) => [k, t(v[1])] as [string, string])])}
          value={c} onPick={(v) => { setC(v); setPicker(null); }} onClose={() => setPicker(null)} />
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* Konum seçme haritası: dokun, iğne düşsün, onayla */
function PickMap({ initial, onPick, onCancel }: { initial: Pt | null; onPick: (p: Pt) => void; onCancel: () => void }) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Pt | null>(initial);
  const { request } = useLocation();
  const [locErr, setLocErr] = useState('');
  const camRef = useRef<any>(null);
  async function here() {
    setLocErr('');
    try {
      const v = await request();
      if (v) { setP({ lat: v.lat, lng: v.lng, inTr: inTurkey(v.lat, v.lng) }); camRef.current?.flyTo({ center: [v.lng, v.lat], zoom: 15, duration: 800 }); }
    } catch (e) { setLocErr(t(trError(e))); }
  }
  const data = useMemo<GeoJSON.FeatureCollection>(() => ({ type: 'FeatureCollection', features: p ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }] : [] }), [p]);
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={onCancel} title={t('Konumu işaretle')} />
      <View style={{ flex: 1 }}>
        <Map style={{ flex: 1 }} mapStyle={MAP_STYLE} touchRotate={false} touchPitch={false} compass={false} logo={false}
          onPress={(e) => { const [lng, lat] = e.nativeEvent.lngLat; setP({ lat, lng, inTr: inTurkey(lat, lng) }); }}>
          <Camera ref={camRef} initialViewState={initial ? { center: [initial.lng, initial.lat], zoom: 13 } : { bounds: [25.7, 35.8, 44.8, 42.2], padding: { top: 20, right: 20, bottom: 20, left: 20 } }} />
          <GeoJSONSource id="pick" data={data}>
            <Layer type="circle" id="pick-dot" paint={{ 'circle-radius': 11, 'circle-color': C.accent, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
          </GeoJSONSource>
        </Map>
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: C.surface, borderRadius: R.md, padding: 12 }}>
          <Text style={{ color: C.ink }}>{p ? (p.inTr ? `${t('Seçilen konum')}: ${nearestProvince(p.lat, p.lng)}` : t('Seçilen konum Türkiye sınırları dışında.')) : t('Yaklaşıp yerin tam üstüne dokun.')}</Text>
          <Btn small label={`📍 ${t('Şu an buradayım')}`} onPress={here} style={{ marginTop: 8, alignSelf: 'flex-start' }} />
          {!!locErr && <Text style={{ color: C.danger, marginTop: 6 }}>{locErr}</Text>}
        </View>
      </View>
      <View style={{ padding: 14, paddingBottom: insets.bottom + 14, flexDirection: 'row', gap: 8 }}>
        <Btn label={t('Vazgeç')} onPress={onCancel} style={{ flex: 1 }} />
        <Btn label={t('Bu konumu kullan')} kind="pri" disabled={!p} onPress={() => p && onPick(p)} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function ListPick({ title, items, value, onPick, onClose }: { title: string; items: [string, string][]; value: string; onPick: (v: string) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.screen }}>
      <Header onBack={onClose} title={title} />
      <FlatList data={items} keyExtractor={([k]) => k} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        renderItem={({ item: [k, l] }) => k.startsWith('#') ? (
          <Text style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, color: C.accent, fontWeight: '800', fontSize: 13 }}>{l.toLocaleUpperCase()}</Text>
        ) : (
          <Pressable onPress={() => onPick(k)} style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: pressed ? C.line : C.bg, flexDirection: 'row', justifyContent: 'space-between' })}
            accessibilityRole="radio" accessibilityState={{ checked: value === k }}>
            <Text style={{ fontSize: 16, color: C.ink, fontWeight: value === k ? '800' : '500' }}>{l}</Text>
            {value === k && <Text style={{ color: C.accent, fontWeight: '800' }}>✓</Text>}
          </Pressable>
        )} />
    </View>
  );
}
