/* Gün doğumu ve gün batımı (NOAA güneş hesabı, ±1 dk). İnternet gerekmez.
   Türkiye 2016'dan beri yıl boyu UTC+3 kullanır; saatler bu dilimde gösterilir. */
const RAD = Math.PI / 180;
export function sunTimes(lat: number, lng: number, date = new Date()): { rise: number | null; set: number | null } {
  // date'in Türkiye saatine göre günü
  const tr = new Date(date.getTime() + 3 * 3600e3);
  const y = tr.getUTCFullYear(), mo = tr.getUTCMonth(), d = tr.getUTCDate();
  const n = Math.floor((Date.UTC(y, mo, d) - Date.UTC(y, 0, 0)) / 864e5);
  const calc = (rising: boolean) => {
    const lngHour = lng / 15, t = n + ((rising ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634; L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * RAD)) / RAD; RA = ((RA % 360) + 360) % 360;
    RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;
    const sinDec = 0.39782 * Math.sin(L * RAD), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
    if (cosH > 1 || cosH < -1) return null;
    const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const UT = ((T - lngHour) % 24 + 24) % 24;
    return Date.UTC(y, mo, d) + UT * 3600e3 - (UT > 21 ? 864e5 : 0);   // UTC zaman damgası
  };
  return { rise: calc(true), set: calc(false) };
}
/* Türkiye saatiyle SS:DD */
export const trClock = (ts: number | null) => {
  if (ts == null) return '—';
  const x = new Date(ts + 3 * 3600e3);
  return `${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`;
};
