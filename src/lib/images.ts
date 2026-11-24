import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export type Picked = { uri: string; width: number; height: number };

/* Galeriden veya kameradan fotoğraf seç */
export async function pickImage(source: 'library' | 'camera', square = false): Promise<Picked | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: square, aspect: square ? [1, 1] : undefined };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Kamera izni verilmedi. Telefonunun ayarlarından izin verebilirsin.');
    const r = await ImagePicker.launchCameraAsync(opts);
    return r.canceled || !r.assets?.length ? null : { uri: r.assets[0].uri, width: r.assets[0].width, height: r.assets[0].height };
  }
  const r = await ImagePicker.launchImageLibraryAsync(opts);
  return r.canceled || !r.assets?.length ? null : { uri: r.assets[0].uri, width: r.assets[0].width, height: r.assets[0].height };
}

/* Fotoğrafı küçült (en uzun kenar `max` piksel) ve JPEG olarak Base64'e çevir */
async function toJpeg(img: Picked, max: number, square: boolean) {
  const ctx = ImageManipulator.manipulate(img.uri);
  if (square) {
    const side = Math.min(img.width, img.height);
    if (img.width !== img.height) ctx.crop({ originX: (img.width - side) / 2, originY: (img.height - side) / 2, width: side, height: side });
    if (side > max) ctx.resize({ width: max, height: max });
  } else if (Math.max(img.width, img.height) > max) {
    ctx.resize(img.width >= img.height ? { width: max, height: null } : { width: null, height: max });
  }
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: square ? 0.86 : 0.82, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error('Bu fotoğraf açılamadı.');
  return out.base64;
}

/* Supabase'e yükle: dosya yolu kullanıcının kendi klasöründe olmalı (veritabanı kuralı) */
export async function uploadImage(userId: string, img: Picked, kind: 'photo' | 'avatar' = 'photo') {
  const b64 = await toJpeg(img, kind === 'avatar' ? 256 : 1600, kind === 'avatar');
  const buf = decode(b64);
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error('Fotoğraf en fazla 5 MB olabilir.');
  const rnd = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const path = kind === 'avatar' ? `${userId}/avatar-${Date.now()}.jpg` : `${userId}/${rnd}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, buf, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
export const publicUrl = (path?: string | null) => (path ? supabase.storage.from('photos').getPublicUrl(path).data.publicUrl : null);
