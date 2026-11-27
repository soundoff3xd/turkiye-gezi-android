/* OpenStreetMap opening_hours değerinin sık kullanılan biçimlerini çözer ve "şu an açık mı" hesaplar.
   Desteklenen: 24/7 · "Mo-Fr 09:00-17:00; Sa 10:00-14:00" · "Tu-Su 08:30-19:00; Mo off" · gece yarısını aşan saatler ·
   ay aralıkları ("Apr-Oct: ...", "Nov-Mar ..."). Çözülemeyen değerlerde null döner (ham metin gösterilir).
   Saatler Türkiye saatine göre (UTC+3) hesaplanır. */

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type Rule = { months: Set<number> | null; days: Set<number> | null; spans: [number, number][] | 'off' };

function parseDays(s: string): Set<number> | null {
  const out = new Set<number>();
  for (const part of s.split(',')) {
    const m = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(part.trim());
    if (!m) return null;
    const a = DAYS.indexOf(m[1]), b = m[2] ? DAYS.indexOf(m[2]) : a;
    for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; }
  }
  return out;
}
function parseMonths(s: string): Set<number> | null {
  const out = new Set<number>();
  for (const part of s.split(',')) {
    const m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{1,2})?(?:-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?: \d{1,2})?)?$/.exec(part.trim());
    if (!m) return null;
    const a = MONTHS.indexOf(m[1]), b = m[2] ? MONTHS.indexOf(m[2]) : a;
    for (let i = a; ; i = (i + 1) % 12) { out.add(i); if (i === b) break; }
  }
  return out;
}
const toMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

export function parseOH(raw: string): Rule[] | 'always' | null {
  const s = raw.trim();
  if (s === '24/7') return 'always';
  const rules: Rule[] = [];
  for (let part of s.split(/;|\|\|/)) {
    part = part.trim();
    if (!part) continue;
    if (/^PH\b/.test(part) || /^SH\b/.test(part)) continue; // resmi tatil kuralları yok sayılır
    part = part.replace(/,\s*PH\b/g, '').replace(/\bPH\s*,/g, '').replace(/\s*,\s*/g, ',');
    let months: Set<number> | null = null;
    const mm = /^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^:A-Z]*(?:-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\d ]*)?(?:,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\d -]*)*):?\s+/.exec(part);
    if (mm) { months = parseMonths(mm[1].replace(/:$/, '').trim()); if (!months) return null; part = part.slice(mm[0].length).trim(); }
    let days: Set<number> | null = null;
    const dm = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?(?:,(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)\s*/.exec(part);
    if (dm) { days = parseDays(dm[1]); if (!days) return null; part = part.slice(dm[0].length).trim(); }
    if (/^(off|closed)$/i.test(part)) { rules.push({ months, days, spans: 'off' }); continue; }
    if (part === '24/7' || part === '00:00-24:00') { rules.push({ months, days, spans: [[0, 1440]] }); continue; }
    const spans: [number, number][] = [];
    for (const sp of part.split(',')) {
      const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\+?$/.exec(sp.trim());
      if (!m) return null;
      let a = toMin(m[1]), b = toMin(m[2]);
      if (b <= a) b += 1440; // gece yarısını aşıyor
      spans.push([a, b]);
    }
    if (!spans.length) return null;
    rules.push({ months, days, spans });
  }
  return rules.length ? rules : null;
}

/* Türkiye saatiyle (UTC+3) gün, ay ve dakika */
export function trNow(ms = Date.now()) {
  const d = new Date(ms + 3 * 3600e3);
  return { wd: (d.getUTCDay() + 6) % 7, mon: d.getUTCMonth(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), ms };
}
function spansFor(rules: Rule[], wd: number, mon: number): [number, number][] {
  let res: [number, number][] = [];
  for (const r of rules) {
    if (r.months && !r.months.has(mon)) continue;
    if (r.days && !r.days.has(wd)) continue;
    res = r.spans === 'off' ? [] : r.spans; // sonraki kural öncekini geçersiz kılar
  }
  return res;
}

export type OpenState = { open: boolean; until?: number; next?: { day: number; min: number }; always?: boolean; allDay?: boolean };
/* until: kapanışa kalan dakika; next.day: 0 = bugün, 1 = yarın … */
export function openState(raw: string, ms = Date.now()): OpenState | null {
  const r = parseOH(raw);
  if (!r) return null;
  if (r === 'always') return { open: true, always: true };
  const { wd, mon, min } = trNow(ms);
  // dünden taşan aralık
  const prev = spansFor(r, (wd + 6) % 7, mon);
  for (const [a, b] of prev) if (b > 1440 && min < b - 1440) return { open: true, until: b - 1440 - min };
  for (const [a, b] of spansFor(r, wd, mon)) if (min >= a && min < b) return a <= 0 && b >= 1440 ? { open: true, allDay: true } : { open: true, until: b - min };
  for (let k = 0; k < 8; k++) {
    const day = (wd + k) % 7;
    const mo = trNow(ms + k * 864e5).mon;
    const sp = spansFor(r, day, mo).map((x) => x[0]).sort((x, y) => x - y).filter((a) => k > 0 || a > min);
    if (sp.length) return { open: false, next: { day: k, min: sp[0] } };
  }
  return { open: false };
}
export const hhmm = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* uygulamada gösterilecek kısa durum metni */
export function stateText(st: OpenState, t: (s: string, ...a: any[]) => string, dayName: (d: number) => string): { txt: string; tone: 'ok' | 'warn' | 'bad' } {
  if (st.always) return { txt: t('7/24 açık'), tone: 'ok' };
  if (st.allDay) return { txt: t('Bugün 24 saat açık'), tone: 'ok' };
  if (st.open) {
    if (st.until !== undefined && st.until <= 60) return { txt: `${t('Açık')} · ${t('kapanmasına {1} dk', st.until)}`, tone: 'warn' };
    return { txt: st.until !== undefined ? `${t('Açık')} · ${t('{1} kapanır', hhmm(trNow().min + st.until))}` : t('Şu an açık'), tone: 'ok' };
  }
  if (!st.next) return { txt: t('Kapalı'), tone: 'bad' };
  const tm = hhmm(st.next.min);
  const when = st.next.day === 0 ? t('bugün {1} açılır', tm) : st.next.day === 1 ? t('yarın {1} açılır', tm) : `${dayName((trNow().wd + st.next.day) % 7)} ${t('{1} açılır', tm)}`;
  return { txt: `${t('Kapalı')} · ${when}`, tone: 'bad' };
}
export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
