/* ---------- profil fotoğrafı ---------- */
const AVSIZE = 256;
async function squareAvatar(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('JPG, PNG veya WEBP biçiminde bir fotoğraf seç.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Fotoğraf en fazla 15 MB olabilir.');
  let img;
  try { img = await createImageBitmap(file); }
  catch (_) {
    img = await new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => rej(new Error('Bu fotoğraf açılamadı.')); i.src = u; });
  }
  const w = img.width, h = img.height, side = Math.min(w, h);
  const c = document.createElement('canvas'); c.width = c.height = AVSIZE;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, AVSIZE, AVSIZE);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) throw new Error('Bu fotoğraf açılamadı.');
  return blob;
}
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const isOnline = () => document.body.classList.contains('online') && typeof sb !== 'undefined' && sb && ME;

function setAvatar(url) {
  CUR.av = url || null;
  if (url) AV[CUR.email] = url; else delete AV[CUR.email];
  refreshAll(); if (!$('photov').hidden) renderPhotos();
}
function avBusy(on) { document.querySelectorAll('.bigav').forEach(b => b.classList.toggle('busy', on)); }

async function saveAvatar(file) {
  avBusy(true);
  try {
    const blob = await squareAvatar(file);
    if (isOnline()) {
      const path = `${ME.id}/avatar-${Date.now()}.jpg`, old = CUR.avPath;
      const up = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      const { error } = await sb.from('profiles').update({ avatar_path: path }).eq('id', ME.id);
      if (error) { await sb.storage.from('photos').remove([path]); throw error; }
      if (old && old !== path) sb.storage.from('photos').remove([old]).catch(() => { });
      CUR.avPath = path; setAvatar(pubUrl(path));
    } else {
      const data = await blobToData(blob), all = accounts(), a = all[CUR.email];
      if (a) { a.avatar = data; all[CUR.email] = a; store.set('gezi-accounts', all); }
      setAvatar(data);
    }
    toast('Profil fotoğrafın güncellendi');
  } catch (e) { (typeof fail === 'function' ? fail : m => toast(m.message || m))(e); }
  finally { avBusy(false); }
}
async function removeAvatar() {
  avBusy(true);
  try {
    if (isOnline()) {
      const old = CUR.avPath;
      const { error } = await sb.from('profiles').update({ avatar_path: null }).eq('id', ME.id);
      if (error) throw error;
      if (old) sb.storage.from('photos').remove([old]).catch(() => { });
      CUR.avPath = null;
    } else {
      const all = accounts(), a = all[CUR.email];
      if (a) { delete a.avatar; all[CUR.email] = a; store.set('gezi-accounts', all); }
    }
    setAvatar(null); toast('Profil fotoğrafın kaldırıldı');
  } catch (e) { (typeof fail === 'function' ? fail : m => toast(m.message || m))(e); }
  finally { avBusy(false); }
}
$('avfile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; e.target.value = '';
  if (f && CUR) saveAvatar(f);
});
Object.assign(A, {
  avpick: () => requireAuth(() => $('avfile').click()),
  avdel: () => CUR && removeAvatar()
});
