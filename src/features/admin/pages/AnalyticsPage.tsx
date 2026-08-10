import { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, CreditCard, Download, Info, Store, TrendingUp } from '../../../shared/icons';
import { Card, DevNote, SectionTitle } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import {
  StatHistogram,
  StatKpi,
  StatLegend,
  StatLine,
  StatNote,
  StatRevenueBars,
  StatStackedBars,
  statSectionHeadingStyle,
  statSectionSubStyle,
} from '../components/StatsCharts';
import {
  STAT_BY_TYPE,
  STAT_CANCELLERS,
  STAT_FUNNEL,
  STAT_LOW_FILL,
  STAT_MONTHLY_FILL,
  STAT_REVENUE_MONTHLY,
  STAT_TOP_FILL,
  pln,
  plnK,
  statDailySeries,
  statFillDistribution,
  type CancellerStatus,
} from '../statsData';

type RangePreset = '7' | '30' | '90' | '365' | 'custom';
const RANGE_PRESETS: RangePreset[] = ['7', '30', '90', '365', 'custom'];

// Real per-provider plan (main = 199 zl/mo, connected = 99 zl/mo) rather than the mockup's own
// simplification of counting every active subscription at the main-plan price - the real billing
// plan is already on each provider record, so weighting by it is free correctness, not new scope.
const PLAN_PRICE = { main: 199, connected: 99 } as const;

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

const rangePillStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: FONT_BODY,
  fontSize: 13,
  fontWeight: 700,
  border: `1px solid ${active ? C.text : C.border}`,
  background: active ? C.text : C.bgCard,
  color: active ? '#fff' : C.textMedium,
});

const selectStyle: React.CSSProperties = { border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 11, padding: '9px 12px', fontFamily: FONT_BODY, fontSize: 13, color: C.text };

export function AdminAnalyticsPage() {
  const { t } = useI18n();
  const { providers } = useAdminState();
  const [range, setRange] = useState<RangePreset>('30');
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [customFrom, setCustomFrom] = useState(() => toIsoDate(new Date(Date.now() - 44 * 86400000)));
  const [customTo, setCustomTo] = useState(today);
  const [minBookings, setMinBookings] = useState(5);
  const [blocked, setBlocked] = useState<Record<string, CancellerStatus | 'blocked'>>({});

  const customDays = Math.max(1, daysBetween(customFrom, customTo));
  // Beyond 90 days the daily chart stops being readable, so we draw at most 90 points; KPI tiles
  // still cover the full selected period.
  const days = range === 'custom' ? Math.min(90, customDays) : range === '7' ? 7 : range === '90' ? 90 : range === '365' ? 90 : 30;
  const series = useMemo(() => statDailySeries(days), [days]);
  const dist = useMemo(() => statFillDistribution(), []);

  const sum = series.reduce((acc, d) => ({ total: acc.total + d.total, furli: acc.furli + d.furli, own: acc.own + d.own }), { total: 0, furli: 0, own: 0 });
  const perDay = Math.round(sum.total / series.length);
  const share = Math.round((sum.furli / sum.total) * 100);

  const avgFill = Math.round(dist.facilities.reduce((a, b) => a + b, 0) / dist.facilities.length);
  const sortedFill = [...dist.facilities].sort((a, b) => a - b);
  const medianFill = sortedFill[Math.floor(sortedFill.length / 2)];
  const weakFill = dist.facilities.filter((v) => v < 30).length;
  const strongFill = dist.facilities.filter((v) => v >= 80).length;

  const rev = STAT_REVENUE_MONTHLY[STAT_REVENUE_MONTHLY.length - 1];
  const lostPct = ((rev.lost / rev.booked) * 100).toFixed(1).replace('.', ',');
  const mrr = providers.filter((p) => p.billingStatus === 'active').reduce((sum2, p) => sum2 + (p.billingPlan === 'connected' ? PLAN_PRICE.connected : PLAN_PRICE.main), 0);

  const cancellers = useMemo(() => STAT_CANCELLERS
    .filter((u) => u.bookings >= minBookings)
    .map((u) => ({ ...u, rate: Math.round((u.cancelled / u.bookings) * 100) }))
    .sort((a, b) => b.cancelled - a.cancelled), [minBookings]);

  const cityOptions = useMemo(() => Array.from(new Set(providers.map((p) => p.city))).filter(Boolean), [providers]);
  const typeOptions = useMemo(() => Array.from(new Set(providers.map((p) => p.typeLabel))).filter(Boolean), [providers]);

  return (
    <div>
      <Card style={{ padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {RANGE_PRESETS.map((preset) => (
              <button key={preset} onClick={() => setRange(preset)} aria-pressed={range === preset} style={rangePillStyle(range === preset)}>
                {t(`admin.stats.rangeLabels.${preset}`)}
              </button>
            ))}
          </div>
          {/* Decorative, matching the mockup - real per-type/city filtering needs the not-yet-built
              /admin/stats/* backend to query against, so these don't wire up to anything yet. */}
          <select style={selectStyle}>
            <option>{t('admin.stats.allTypes')}</option>
            {typeOptions.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select style={selectStyle}>
            <option>{t('admin.stats.allCities')}</option>
            {cityOptions.map((city) => <option key={city}>{city}</option>)}
          </select>
          <button style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 11, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={15} /> {t('admin.stats.exportCsv')}
          </button>
        </div>
        {range === 'custom' ? (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t('admin.stats.customFrom')}
              <input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} style={{ border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 9, padding: '6px 9px', fontFamily: FONT_BODY, fontSize: 12.5, color: C.text }} />
            </label>
            <label style={{ fontSize: 12, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t('admin.stats.customTo')}
              <input type="date" value={customTo} min={customFrom} max={today} onChange={(event) => setCustomTo(event.target.value)} style={{ border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 9, padding: '6px 9px', fontFamily: FONT_BODY, fontSize: 12.5, color: C.text }} />
            </label>
          </div>
        ) : null}
        <p style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10 }}>
          {range === '365' ? t('admin.stats.comparisonNoteYear') : t('admin.stats.comparisonNote', { days: range === 'custom' ? customDays : range })}
        </p>
      </Card>

      {/* 1. Wizyty */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatKpi label={t('admin.stats.sectionVisitsKpiTotal')} value={sum.total.toLocaleString('pl-PL')} delta={18} />
        <StatKpi label={t('admin.stats.sectionVisitsKpiFurli')} value={sum.furli.toLocaleString('pl-PL')} delta={31} color={C.amber} hint={t('admin.stats.sectionVisitsKpiFurliHint', { share })} />
        <StatKpi label={t('admin.stats.sectionVisitsKpiOwn')} value={sum.own.toLocaleString('pl-PL')} delta={9} color={C.tealDark} hint={t('admin.stats.sectionVisitsKpiOwnHint')} />
        <StatKpi label={t('admin.stats.sectionVisitsKpiPerDay')} value={perDay} unit={t('admin.stats.sectionVisitsKpiPerDayUnit')} delta={18} />
      </div>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionTitle Icon={BarChart3} right={<StatLegend items={[{ label: t('admin.stats.legendFurli'), color: C.primary }, { label: t('admin.stats.legendOwn'), color: C.teal }]} />}>{t('admin.stats.dailyChartTitle')}</SectionTitle>
        <StatStackedBars data={series} />
        <StatNote>{t('admin.stats.dailyChartNote')}</StatNote>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 26 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={TrendingUp}>{t('admin.stats.shareTitle')}</SectionTitle>
          <div style={{ display: 'flex', height: 34, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{ width: `${share}%`, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: FONT_NUM, color: 'oklch(0.28 0.05 55)' }}>{share}%</div>
            <div style={{ width: `${100 - share}%`, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: FONT_NUM, color: 'oklch(0.28 0.05 55)' }}>{100 - share}%</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12.5, color: C.textMedium }}>
            <span><b style={{ fontFamily: FONT_NUM }}>{sum.furli.toLocaleString('pl-PL')}</b> {t('admin.stats.shareFurliSuffix')}</span>
            <span><b style={{ fontFamily: FONT_NUM }}>{sum.own.toLocaleString('pl-PL')}</b> {t('admin.stats.shareOwnSuffix')}</span>
          </div>
          <StatNote>{t('admin.stats.shareNote')}</StatNote>
        </Card>

        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={Store}>{t('admin.stats.byTypeTitle')}</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{[t('admin.stats.byTypeColType'), t('admin.stats.byTypeColVisits'), t('admin.stats.byTypeColFurli'), t('admin.stats.byTypeColShare')].map((header, index) => (
              <th key={header} style={{ textAlign: index ? 'right' : 'left', padding: '0 0 9px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{header}</th>
            ))}</tr></thead>
            <tbody>{STAT_BY_TYPE.map((row) => {
              const p = Math.round((row.furli / row.total) * 100);
              return (
                <tr key={row.type}>
                  <td style={{ padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{row.type}<div style={{ fontSize: 11, color: C.textMuted }}>{t('admin.stats.byTypeFacilitiesHint', { count: row.facilities, avg: row.avgTicket })}</div></td>
                  <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}` }}>{row.total.toLocaleString('pl-PL')}</td>
                  <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: C.amber, fontWeight: 700 }}>{row.furli.toLocaleString('pl-PL')}</td>
                  <td style={{ textAlign: 'right', borderBottom: `1px solid ${C.border}`, width: 92 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                      <div style={{ width: 42, height: 6, borderRadius: 999, background: C.bgMuted, overflow: 'hidden' }}><div style={{ width: `${p}%`, height: '100%', background: C.primary }} /></div>
                      <span style={{ fontFamily: FONT_NUM, fontWeight: 700, fontSize: 12.5 }}>{p}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          <StatNote>{t('admin.stats.byTypeNote')}</StatNote>
        </Card>
      </div>

      {/* 2. Wartość wizyt */}
      <h2 style={statSectionHeadingStyle}>{t('admin.stats.sectionValueTitle')}</h2>
      <p style={statSectionSubStyle}>{t('admin.stats.sectionValueSubtitle')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatKpi label={t('admin.stats.kpiBooked')} value={plnK(rev.booked)} delta={11} hint={t('admin.stats.kpiBookedHint')} />
        <StatKpi label={t('admin.stats.kpiDone')} value={plnK(rev.done)} delta={13} color={C.green} hint={t('admin.stats.kpiDoneHint')} />
        <StatKpi label={t('admin.stats.kpiLost')} value={plnK(rev.lost)} delta={-3} color={C.roseDark} hint={t('admin.stats.kpiLostHint', { pct: lostPct })} />
        <StatKpi label={t('admin.stats.kpiAvgVisit')} value={pln(rev.done / 5478)} delta={4} hint={t('admin.stats.kpiAvgVisitHint')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 26 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={TrendingUp} right={<StatLegend items={[{ label: t('admin.stats.legendBooked'), color: C.primary }, { label: t('admin.stats.legendDone'), color: C.green }]} />}>{t('admin.stats.revenueMonthlyTitle')}</SectionTitle>
          <StatRevenueBars data={STAT_REVENUE_MONTHLY} />
          <StatNote>{t('admin.stats.revenueMonthlyNote')}</StatNote>
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={CreditCard}>{t('admin.stats.whoseRevenueTitle')}</SectionTitle>
          {[
            [t('admin.stats.facilityRevenueLabel'), plnK(rev.done), C.green, t('admin.stats.facilityRevenueHint')],
            [t('admin.stats.furliRevenueLabel'), pln(mrr), C.amber, t('admin.stats.furliRevenueHint')],
            [t('admin.stats.furliShareLabel'), `${((mrr / rev.done) * 100).toFixed(1).replace('.', ',')}%`, C.textMedium, t('admin.stats.furliShareHint')],
          ].map(([label, value, color, hint]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}`, gap: 12 }}>
              <div><div style={{ fontSize: 13, color: C.textMedium, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11.5, color: C.textMuted }}>{hint}</div></div>
              <span style={{ fontFamily: FONT_NUM, fontSize: 17, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}
          <StatNote tone="warn">{t('admin.stats.revenueWarnNote')}</StatNote>
        </Card>
      </div>

      {/* 3. Wypełnienie kalendarza */}
      <h2 style={statSectionHeadingStyle}>{t('admin.stats.sectionFillTitle')}</h2>
      <p style={statSectionSubStyle}>{t('admin.stats.sectionFillSubtitle')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatKpi label={t('admin.stats.kpiAvgFill')} value={avgFill} unit="%" delta={6} hint={t('admin.stats.kpiAvgFillHint')} />
        <StatKpi label={t('admin.stats.kpiMedianFill')} value={medianFill} unit="%" hint={t('admin.stats.kpiMedianFillHint')} />
        <StatKpi label={t('admin.stats.kpiWeakFill')} value={weakFill} unit={t('admin.stats.kpiWeakFillUnit')} delta={-4} color={C.roseDark} hint={t('admin.stats.kpiWeakFillHint')} />
        <StatKpi label={t('admin.stats.kpiStrongFill')} value={strongFill} unit={t('admin.stats.kpiStrongFillUnit')} delta={12} color={C.green} hint={t('admin.stats.kpiStrongFillHint')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={BarChart3}>{t('admin.stats.distributionTitle')}</SectionTitle>
          <StatHistogram buckets={dist.buckets} />
          <StatNote>{t('admin.stats.distributionNote')}</StatNote>
        </Card>
        <Card style={{ padding: 22 }}>
          <SectionTitle Icon={CalendarCheck}>{t('admin.stats.monthlyFillTitle')}</SectionTitle>
          <StatLine data={STAT_MONTHLY_FILL} />
          <StatNote>{t('admin.stats.monthlyFillNote')}</StatNote>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 26 }}>
        {([[t('admin.stats.topFillTitle'), STAT_TOP_FILL, C.green], [t('admin.stats.lowFillTitle'), STAT_LOW_FILL, C.roseDark]] as const).map(([title, rows, color]) => (
          <Card key={title} style={{ padding: 22 }}>
            <SectionTitle Icon={Store}>{title}</SectionTitle>
            {rows.map((row) => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{t('admin.stats.fillRowHint', { city: row.city, visits: row.visits, share: row.furliShare })}</div>
                </div>
                <span style={{ fontFamily: FONT_NUM, fontSize: 17, fontWeight: 700, color }}>{row.fill}%</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {/* 4. Lejek */}
      <h2 style={statSectionHeadingStyle}>{t('admin.stats.sectionFunnelTitle')}</h2>
      <p style={statSectionSubStyle}>{t('admin.stats.sectionFunnelSubtitle')}</p>
      <Card style={{ padding: 22, marginBottom: 26 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            <th style={{ textAlign: 'left', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{t('admin.stats.funnelColStep')}</th>
            <th style={{ textAlign: 'right', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.text, borderBottom: `1px solid ${C.border}` }}>{t('admin.stats.funnelColServer')}</th>
            <th style={{ textAlign: 'right', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{t('admin.stats.funnelColStepRate')}</th>
            <th style={{ textAlign: 'right', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{t('admin.stats.funnelColGa4')} <span style={{ fontWeight: 500, textTransform: 'none' }}>{t('admin.stats.funnelColGa4Suffix')}</span></th>
            <th style={{ textAlign: 'right', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{t('admin.stats.funnelColDiff')}</th>
          </tr></thead>
          <tbody>{STAT_FUNNEL.map((step, index) => {
            const stepRate = index ? Math.round((step.server / STAT_FUNNEL[index - 1].server) * 100) : null;
            const diff = step.ga4 == null ? null : Math.round(((step.ga4 - step.server) / step.server) * 100);
            const width = Math.round((step.server / STAT_FUNNEL[0].server) * 100);
            return (
              <tr key={step.step}>
                <td style={{ padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 600 }}>{step.step}{step.note ? <span style={{ color: C.textMuted, fontWeight: 400 }}> · {step.note}</span> : null}</div>
                  <div style={{ height: 8, borderRadius: 999, background: C.bgMuted, overflow: 'hidden', marginTop: 6, maxWidth: 380 }}>
                    <div style={{ width: `${width}%`, height: '100%', background: index === STAT_FUNNEL.length - 1 ? C.green : C.primary }} />
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{step.server.toLocaleString('pl-PL')}</td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: stepRate != null && stepRate < 40 ? C.roseDark : C.textMedium, fontWeight: 700 }}>{stepRate != null ? `${stepRate}%` : '—'}</td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>{step.ga4 != null ? step.ga4.toLocaleString('pl-PL') : t('admin.stats.funnelGa4NotMeasured')}</td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>{diff != null ? `${diff > 0 ? '+' : ''}${diff}%` : '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
        <StatNote tone="warn">{t('admin.stats.funnelDropNote')}</StatNote>
        <StatNote>{t('admin.stats.funnelGa4Note')}</StatNote>
      </Card>

      {/* 5. Anulacje */}
      <h2 style={statSectionHeadingStyle}>{t('admin.stats.sectionCancellersTitle')}</h2>
      <p style={statSectionSubStyle}>{t('admin.stats.sectionCancellersSubtitle')}</p>
      <Card style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: C.textMedium, fontWeight: 600 }}>{t('admin.stats.minBookingsLabel')}</span>
          {[3, 5, 10].map((value) => (
            <button key={value} onClick={() => setMinBookings(value)} style={{ padding: '6px 13px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 700, border: `1px solid ${minBookings === value ? C.text : C.border}`, background: minBookings === value ? C.text : C.bgCard, color: minBookings === value ? '#fff' : C.textMedium }}>{value}</button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            {[t('admin.stats.cancellersColClient'), t('admin.stats.cancellersColBookings'), t('admin.stats.cancellersColCancelled'), t('admin.stats.cancellersColNoShow'), t('admin.stats.cancellersColRate'), t('admin.stats.cancellersColValue'), t('admin.stats.cancellersColLast'), ''].map((header, index) => (
              <th key={header || `col-${index}`} style={{ textAlign: index === 0 || index === 7 ? 'left' : 'right', padding: '0 0 10px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>{header}</th>
            ))}
          </tr></thead>
          <tbody>{cancellers.map((user) => {
            const isBlocked = blocked[user.id] === 'blocked';
            const isWarned = blocked[user.id] === 'warned' || user.status === 'warned';
            const hot = user.rate >= 55;
            return (
              <tr key={user.id} style={{ opacity: isBlocked ? 0.55 : 1 }}>
                <td style={{ padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: 11.5, color: C.textMuted }}>{user.city}{isWarned ? ` · ${t('admin.stats.warnedSuffix')}` : ''}{isBlocked ? ` · ${t('admin.stats.blockedSuffix')}` : ''}</div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}` }}>{user.bookings}</td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{user.cancelled}</td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: user.noShow ? C.roseDark : C.textMuted }}>{user.noShow}</td>
                <td style={{ textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: FONT_NUM, fontWeight: 800, fontSize: 13.5, color: hot ? C.roseDark : C.amber, background: hot ? 'oklch(0.95 0.05 15)' : 'oklch(0.96 0.05 75)', borderRadius: 999, padding: '3px 9px' }}>{user.rate}%</span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: FONT_NUM, borderBottom: `1px solid ${C.border}`, color: C.textMedium }}>{pln(user.value)}</td>
                <td style={{ textAlign: 'right', borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>{user.lastCancel}</td>
                <td style={{ textAlign: 'right', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', paddingLeft: 10 }}>
                  <button onClick={() => setBlocked((current) => ({ ...current, [user.id]: 'warned' }))}
                    style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: FONT_BODY, marginRight: 6 }}>
                    {t('admin.stats.warnAction')}
                  </button>
                  <button onClick={() => setBlocked((current) => ({ ...current, [user.id]: isBlocked ? 'none' : 'blocked' }))}
                    style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${C.roseDark}`, background: isBlocked ? C.roseDark : 'transparent', color: isBlocked ? '#fff' : C.roseDark, borderRadius: 9, padding: '6px 11px', cursor: 'pointer', fontFamily: FONT_BODY }}>
                    {t(isBlocked ? 'admin.stats.unblockAction' : 'admin.stats.blockAction')}
                  </button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        <StatNote tone="warn">{t('admin.stats.cancellersNote')}</StatNote>
      </Card>

      <Card style={{ padding: 22, background: C.bgMuted, borderStyle: 'dashed' }}>
        <SectionTitle Icon={Info}>{t('admin.stats.methodologyTitle')}</SectionTitle>
        <ol style={{ fontSize: 12.5, color: C.textMedium, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
          <li>{t('admin.stats.methodology1')}</li>
          <li>{t('admin.stats.methodology2')}</li>
          <li>{t('admin.stats.methodology3')}</li>
          <li>{t('admin.stats.methodology4')}</li>
          <li>{t('admin.stats.methodology5')}</li>
          <li>{t('admin.stats.methodology6')}</li>
        </ol>
        <DevNote>{t('admin.stats.devNote')}</DevNote>
      </Card>
    </div>
  );
}
