/* Namaz vakitleri (yaklaşık): Diyanet'e yakın açılar — imsak 18°, yatsı 17°, ikindi gölge boyu 1 —
   ve Diyanet'in temkin süreleri. Türkiye saati (UTC+3), dakika cinsinden. Cami ziyaret aralıklarını hesaplamak için. */
const rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI;

function sunPos(jd: number) {
  const D = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * D) % 360, q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  let eqt = q / 15 - ((RA + 24) % 24);
  eqt = ((eqt + 12) % 24 + 24) % 24 - 12;
  return { decl, eqt };
}

export type Prayer = { imsak: number; gunes: number; ogle: number; ikindi: number; aksam: number; yatsi: number };
/* gün: Türkiye takvim günü (yerel tarih), sonuç gece yarısından itibaren dakika */
export function prayerTimes(lat: number, lng: number, date = new Date()): Prayer {
  const tr = new Date(date.getTime() + 3 * 3600e3);
  const y = tr.getUTCFullYear(), m = tr.getUTCMonth() + 1, d = tr.getUTCDate();
  const jd = 367 * y - Math.floor((7 * (y + Math.floor((m + 9) / 12))) / 4) + Math.floor((275 * m) / 9) + d + 1721013.5 + 0.5;
  const { decl, eqt } = sunPos(jd);
  const noon = 12 - eqt - lng / 15 + 3; // TR saati
  const ha = (angle: number) => {
    const c = (-Math.sin(rad(angle)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
    return deg(Math.acos(Math.max(-1, Math.min(1, c)))) / 15;
  };
  const asrAngle = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))));
  const toMin = (h: number) => Math.round(h * 60);
  return {
    imsak: toMin(noon - ha(18)) - 2,
    gunes: toMin(noon - ha(0.833)) - 7,
    ogle: toMin(noon) + 5,
    ikindi: toMin(noon + ha(asrAngle)) + 4,
    aksam: toMin(noon + ha(0.833)) + 7,
    yatsi: toMin(noon + ha(17)) + 2,
  };
}

/* Cami ziyaretine kapalı sayılan aralıklar (dakika): ezan ile cemaatin dağılması arası.
   Cuma öğle namazı daha uzun sürer. Gece (yatsıdan sonra, sabahtan önce) camiler genelde turist ziyaretine kapalıdır. */
export function mosqueWindows(p: Prayer, friday: boolean) {
  const closed: [number, number, string][] = [
    [p.ogle - (friday ? 45 : 10), p.ogle + (friday ? 60 : 35), friday ? 'Cuma namazı' : 'Öğle namazı'],
    [p.ikindi - 10, p.ikindi + 30, 'İkindi namazı'],
    [p.aksam - 10, p.aksam + 30, 'Akşam namazı'],
  ];
  const visitStart = Math.max(p.gunes + 60, 9 * 60), visitEnd = p.yatsi - 15;
  return { closed, visitStart, visitEnd };
}
export function mosqueState(lat: number, lng: number, ms = Date.now()) {
  const p = prayerTimes(lat, lng, new Date(ms));
  const tr = new Date(ms + 3 * 3600e3);
  const min = tr.getUTCHours() * 60 + tr.getUTCMinutes();
  const friday = tr.getUTCDay() === 5;
  const w = mosqueWindows(p, friday);
  const inPrayer = w.closed.find(([a, b]) => min >= a && min < b);
  let state: 'open' | 'prayer' | 'night' = 'open';
  if (min < w.visitStart || min >= w.visitEnd) state = 'night';
  else if (inPrayer) state = 'prayer';
  const nextPrayer = w.closed.find(([a]) => a > min);
  return { p, w, min, friday, state, inPrayer, nextPrayer };
}
