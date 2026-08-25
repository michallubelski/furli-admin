import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download } from '../../../shared/icons';
import { Card, SectionTitle } from '../../../shared/components/ui';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { useAdminState } from '../context';
import { getAdminStats, type AdminStatsOverviewDto } from '../api';
import { StatKpi, StatLegend, StatNote, StatStackedBars } from '../components/StatsCharts';

type RangePreset = '7' | '30' | '90' | '365' | 'custom';
const RANGE_PRESETS: RangePreset[] = ['7', '30', '90', '365', 'custom'];
const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const rangePillStyle = (active: boolean): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, border: `1px solid ${active ? C.text : C.border}`, background: active ? C.text : C.bgCard, color: active ? '#fff' : C.textMedium });

export function AdminAnalyticsPage() {
  const { t } = useI18n();
  const { accessToken } = useAdminState();
  const [range, setRange] = useState<RangePreset>('30');
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [customFrom, setCustomFrom] = useState(() => toIsoDate(new Date(Date.now() - 29 * 86400000)));
  const [customTo, setCustomTo] = useState(today);
  const [stats, setStats] = useState<AdminStatsOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const from = range === 'custom' ? customFrom : toIsoDate(new Date(Date.now() - ((range === '365' ? 365 : Number(range)) - 1) * 86400000));
  const to = range === 'custom' ? customTo : today;

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void getAdminStats(accessToken, from, to).then((result) => { if (active) setStats(result); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, from, to]);

  const series = useMemo(() => (stats?.dailyBookings ?? []).map((point) => ({ label: new Date(`${point.date}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }), total: point.total, furli: point.furli, own: point.own })), [stats]);
  const completionRate = stats?.bookings ? Math.round((stats.completedBookings / stats.bookings) * 100) : 0;
  const cancellationRate = stats?.bookings ? Math.round((stats.canceledBookings / stats.bookings) * 100) : 0;
  const exportCsv = () => {
    if (!stats) return;
    const rows = [['date', 'bookings', 'furli', 'manual'], ...stats.dailyBookings.map((row) => [row.date, row.total, row.furli, row.own])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `furli-statistics-${from}-${to}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div>
    <Card style={{ padding: 14, marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {RANGE_PRESETS.map((preset) => <button key={preset} onClick={() => setRange(preset)} aria-pressed={range === preset} style={rangePillStyle(range === preset)}>{t(`admin.stats.rangeLabels.${preset}`)}</button>)}
        <button onClick={exportCsv} disabled={!stats || loading} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 11, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Download size={15} /> {t('admin.stats.exportCsv')}</button>
      </div>
      {range === 'custom' && <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <label style={{ fontSize: 12, color: C.textMuted }}>{t('admin.stats.customFrom')} <input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} /></label>
        <label style={{ fontSize: 12, color: C.textMuted }}>{t('admin.stats.customTo')} <input type="date" value={customTo} min={customFrom} max={today} onChange={(event) => setCustomTo(event.target.value)} /></label>
      </div>}
    </Card>
    {error && <Card style={{ padding: 18, marginBottom: 16, color: C.roseDark }}>{t('common.states.fetchError')}</Card>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14, marginBottom: 16, opacity: loading ? 0.55 : 1 }}>
      <StatKpi label={t('admin.stats.providers')} value={stats?.providers ?? 0} />
      <StatKpi label={t('admin.stats.publishedProviders')} value={stats?.publishedProviders ?? 0} color={C.green} />
      <StatKpi label={t('admin.stats.customers')} value={stats?.customers ?? 0} />
      <StatKpi label={t('admin.stats.sectionVisitsKpiTotal')} value={stats?.bookings ?? 0} />
      <StatKpi label={t('admin.stats.completedBookings')} value={stats?.completedBookings ?? 0} unit={`(${completionRate}%)`} color={C.green} />
      <StatKpi label={t('admin.stats.canceledBookings')} value={stats?.canceledBookings ?? 0} unit={`(${cancellationRate}%)`} color={C.roseDark} />
      <StatKpi label={t('admin.stats.reviews')} value={stats?.reviews ?? 0} />
    </div>
    <Card style={{ padding: 22 }}>
      <SectionTitle Icon={BarChart3} right={<StatLegend items={[{ label: t('admin.stats.legendFurli'), color: C.primary }, { label: t('admin.stats.legendOwn'), color: C.teal }]} />}>{t('admin.stats.dailyChartTitle')}</SectionTitle>
      {loading ? <div style={{ padding: 48, textAlign: 'center', color: C.textMuted }}>{t('common.labels.loading')}</div> : series.length ? <StatStackedBars data={series} /> : <div style={{ padding: 48, textAlign: 'center', color: C.textMuted }}>{t('admin.stats.noData')}</div>}
      <StatNote>{t('admin.stats.realDataNote')}</StatNote>
    </Card>
  </div>;
}
