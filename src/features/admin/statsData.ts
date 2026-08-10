// Deterministic demo data for the Statystyki screen, ported from the mockup's StatsScreen
// (furli-admin-v6.jsx). The mockup's own header comment marks this whole screen as future backend
// work ("TODO [backend]: hurtownia + widoke materializowane... /admin/stats/*") - there is no data
// warehouse or per-visit event store on the backend to compute this from today, so it stays
// deterministic/demo exactly as the mockup itself renders it. `statRnd` uses Math.sin instead of
// Math.random so the screen looks identical on every load - a chart whose numbers move on refresh
// is not something you can work from.
function statRnd(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const MONTHS_SHORT_STAT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export interface StatDailyPoint {
  label: string;
  total: number;
  furli: number;
  own: number;
}

export function statDailySeries(days: number): StatDailyPoint[] {
  const out: StatDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 ? 0.25 : dow === 6 ? 0.6 : 1;
    const trend = 1 + (days - i) / (days * 2.2);
    const noise = 0.85 + statRnd(i * 7.13) * 0.3;
    const total = Math.round(210 * weekend * trend * noise);
    const furli = Math.round(total * (0.34 + ((days - i) / days) * 0.09 + (statRnd(i * 3.7) - 0.5) * 0.05));
    out.push({ label: `${d.getDate()} ${MONTHS_SHORT_STAT[d.getMonth()]}`, total, furli, own: total - furli });
  }
  return out;
}

export interface StatFillBucket {
  from: number;
  to: number;
  count: number;
}

export function statFillDistribution(): { buckets: StatFillBucket[]; facilities: number[] } {
  const buckets: StatFillBucket[] = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((from) => ({ from, to: from + 10, count: 0 }));
  const facilities: number[] = [];
  for (let i = 0; i < 412; i += 1) {
    const v = Math.min(97, Math.max(2, Math.round(statRnd(i * 1.31) ** 1.6 * 90 + statRnd(i * 5.9) * 12)));
    facilities.push(v);
    buckets[Math.min(9, Math.floor(v / 10))].count += 1;
  }
  return { buckets, facilities };
}

export const STAT_MONTHLY_FILL = [
  { m: 'wrz 25', v: 31 }, { m: 'paź 25', v: 33 }, { m: 'lis 25', v: 34 }, { m: 'gru 25', v: 39 },
  { m: 'sty 26', v: 36 }, { m: 'lut 26', v: 38 }, { m: 'mar 26', v: 41 }, { m: 'kwi 26', v: 43 },
  { m: 'maj 26', v: 44 }, { m: 'cze 26', v: 47 }, { m: 'lip 26', v: 45 }, { m: 'sie 26', v: 49 },
];

export const STAT_BY_TYPE = [
  { type: 'Weterynarz', total: 3148, furli: 1467, facilities: 186, avgTicket: 214 },
  { type: 'Groomer', total: 1902, furli: 1121, facilities: 118, avgTicket: 138 },
  { type: 'Petsitter / hotel', total: 744, furli: 508, facilities: 63, avgTicket: 265 },
  { type: 'Trener', total: 396, furli: 241, facilities: 29, avgTicket: 180 },
  { type: 'Dog walker', total: 288, furli: 197, facilities: 16, avgTicket: 45 },
];

export const STAT_TOP_FILL = [
  { name: 'Groomer Studio Bella', city: 'Kraków', fill: 94, visits: 118, furliShare: 71 },
  { name: 'Centrum Weterynaryjne Praga', city: 'Warszawa', fill: 91, visits: 203, furliShare: 38 },
  { name: 'VetMed Wrzeszcz', city: 'Gdańsk', fill: 88, visits: 174, furliShare: 44 },
  { name: 'Psi Salon Jeżyce', city: 'Poznań', fill: 86, visits: 96, furliShare: 66 },
  { name: 'Klinika Mokotów', city: 'Warszawa', fill: 84, visits: 221, furliShare: 33 },
];

export const STAT_LOW_FILL = [
  { name: 'Hotel dla psów Zielonka', city: 'Warszawa', fill: 9, visits: 6, furliShare: 100 },
  { name: 'Behawiorysta Ochojec', city: 'Katowice', fill: 11, visits: 8, furliShare: 88 },
  { name: 'Petsitter Bacieczki', city: 'Białystok', fill: 12, visits: 5, furliShare: 60 },
  { name: 'Trener Wilanów', city: 'Warszawa', fill: 14, visits: 11, furliShare: 82 },
  { name: 'Gabinet Czechów Płn.', city: 'Lublin', fill: 15, visits: 19, furliShare: 21 },
];

export const STAT_FUNNEL = [
  { step: 'Wyszukiwanie specjalisty', server: 38940, ga4: 41280, note: 'zapytania do wyszukiwarki' },
  { step: 'Otwarcie karty placówki', server: 18120, ga4: 18940, note: '' },
  { step: 'Rozpoczęta rezerwacja', server: 6120, ga4: 5480, note: 'wybrany termin' },
  { step: 'Wysłana rezerwacja', server: 3980, ga4: 3410, note: '' },
  { step: 'Potwierdzona przez placówkę', server: 3534, ga4: null as number | null, note: 'zdarzenie po stronie placówki' },
];

export const STAT_REVENUE_MONTHLY = [
  { m: 'mar 26', booked: 892000, done: 812000, lost: 80000 },
  { m: 'kwi 26', booked: 948000, done: 861000, lost: 87000 },
  { m: 'maj 26', booked: 1012000, done: 923000, lost: 89000 },
  { m: 'cze 26', booked: 1104000, done: 1008000, lost: 96000 },
  { m: 'lip 26', booked: 1067000, done: 962000, lost: 105000 },
  { m: 'sie 26', booked: 1186000, done: 1084000, lost: 102000 },
];

export type CancellerStatus = 'none' | 'warned';

export interface StatCanceller {
  id: string;
  name: string;
  city: string;
  bookings: number;
  cancelled: number;
  noShow: number;
  lastCancel: string;
  value: number;
  status: CancellerStatus;
}

// `cancelled` counts only cancellations the CLIENT made - a facility-initiated cancellation counts
// against the facility, not the client, and doesn't belong on this list at all.
export const STAT_CANCELLERS: StatCanceller[] = [
  { id: 'u1', name: 'Karol Wiśniewski', city: 'Warszawa', bookings: 14, cancelled: 9, noShow: 3, lastCancel: '4 sie', value: 1980, status: 'none' },
  { id: 'u2', name: 'Magdalena Zając', city: 'Kraków', bookings: 11, cancelled: 7, noShow: 1, lastCancel: '2 sie', value: 1120, status: 'warned' },
  { id: 'u3', name: 'Bartosz Lewandowski', city: 'Wrocław', bookings: 9, cancelled: 6, noShow: 2, lastCancel: '5 sie', value: 1465, status: 'none' },
  { id: 'u4', name: 'Aneta Górska', city: 'Warszawa', bookings: 12, cancelled: 6, noShow: 0, lastCancel: '29 lip', value: 840, status: 'none' },
  { id: 'u5', name: 'Tomasz Kaczmarek', city: 'Poznań', bookings: 8, cancelled: 5, noShow: 2, lastCancel: '3 sie', value: 1290, status: 'warned' },
  { id: 'u6', name: 'Julia Sikora', city: 'Gdańsk', bookings: 10, cancelled: 5, noShow: 0, lastCancel: '28 lip', value: 690, status: 'none' },
];

export function pln(value: number): string {
  return `${Math.round(value).toLocaleString('pl-PL')} zł`;
}

export function plnK(value: number): string {
  return `${Math.round(value / 1000).toLocaleString('pl-PL')} tys. zł`;
}
