import { AlertTriangle, Info, TrendingDown, TrendingUp } from '../../../shared/icons';
import { Card } from '../../../shared/components/ui';
import { C, FONT_BODY, FONT_HEAD, FONT_NUM } from '../../../shared/constants/theme';
import type { StatDailyPoint, StatFillBucket } from '../statsData';

// Pure SVG charts, no charting library (matches this app's existing no-new-dependencies stance) -
// ported from the mockup's StatStackedBars/StatHistogram/StatLine/StatRevenueBars.

export function StatStackedBars({ data, height = 220 }: { data: StatDailyPoint[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const width = 980;
  const padL = 44;
  const padB = 26;
  const padT = 10;
  const bw = (width - padL - 8) / data.length;
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Wizyty dzien po dniu w podziale na zrodlo">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={padL} x2={width - 8} y1={y(tick)} y2={y(tick)} stroke={C.border} />
          <text x={padL - 8} y={y(tick) + 4} textAnchor="end" fontSize="10.5" fill={C.textMuted} fontFamily={FONT_NUM}>{tick}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * bw + bw * 0.16;
        const w = bw * 0.68;
        return (
          <g key={i}>
            <rect x={x} y={y(d.total)} width={w} height={(height - padT - padB) * (d.own / max)} fill={C.teal} rx="2" />
            <rect x={x} y={y(d.furli)} width={w} height={(height - padT - padB) * (d.furli / max)} fill={C.primary} rx="2" />
            <title>{d.label}: {d.total} wizyt - FURLI {d.furli}, wlasne {d.own}</title>
          </g>
        );
      })}
      {data.map((d, i) => (i % Math.ceil(data.length / 8) === 0
        ? <text key={`l${i}`} x={padL + i * bw + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill={C.textMuted} fontFamily={FONT_NUM}>{d.label}</text>
        : null))}
    </svg>
  );
}

export function StatHistogram({ buckets, height = 180 }: { buckets: StatFillBucket[]; height?: number }) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const width = 620;
  const padL = 34;
  const padB = 30;
  const padT = 8;
  const bw = (width - padL - 8) / buckets.length;
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Rozklad placowek wedlug wypelnienia kalendarza">
      {buckets.map((b, i) => {
        const x = padL + i * bw + bw * 0.14;
        const w = bw * 0.72;
        const weak = b.from < 30;
        return (
          <g key={b.from}>
            <rect x={x} y={y(b.count)} width={w} height={(height - padT - padB) * (b.count / max)} rx="3" fill={weak ? C.rose : C.teal} />
            <text x={x + w / 2} y={y(b.count) - 5} textAnchor="middle" fontSize="10" fill={C.textMuted} fontFamily={FONT_NUM}>{b.count}</text>
            <text x={x + w / 2} y={height - 9} textAnchor="middle" fontSize="9.5" fill={C.textMuted} fontFamily={FONT_NUM}>{b.from}–{b.to}%</text>
          </g>
        );
      })}
    </svg>
  );
}

export function StatLine({ data, height = 190 }: { data: { m: string; v: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.v)) * 1.25;
  const width = 620;
  const padL = 34;
  const padB = 26;
  const padT = 10;
  const step = (width - padL - 10) / (data.length - 1);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  const points = data.map((d, i) => `${padL + i * step},${y(d.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Srednie wypelnienie kalendarza miesiac po miesiacu">
      {[0, 0.5, 1].map((f) => <line key={f} x1={padL} x2={width - 10} y1={y(max * f)} y2={y(max * f)} stroke={C.border} />)}
      <polygon points={`${padL},${height - padB} ${points} ${padL + (data.length - 1) * step},${height - padB}`} fill={C.primaryLight} opacity="0.55" />
      <polyline points={points} fill="none" stroke={C.primaryDark} strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.m}>
          <circle cx={padL + i * step} cy={y(d.v)} r="3.5" fill={C.bgCard} stroke={C.primaryDark} strokeWidth="2" />
          <title>{d.m}: {d.v}%</title>
          {i % 2 === 0 ? <text x={padL + i * step} y={height - 7} textAnchor="middle" fontSize="9.5" fill={C.textMuted} fontFamily={FONT_NUM}>{d.m}</text> : null}
        </g>
      ))}
    </svg>
  );
}

// Booked and done bars sit side by side, not stacked - "done" is a SUBSET of "booked", so their sum
// would be meaningless.
export function StatRevenueBars({ data, height = 210 }: { data: { m: string; booked: number; done: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.booked), 1);
  const width = 620;
  const padL = 52;
  const padB = 28;
  const padT = 10;
  const gw = (width - padL - 10) / data.length;
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Wartosc wizyt umowionych i wykonanych">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={width - 10} y1={y(max * f)} y2={y(max * f)} stroke={C.border} />
          <text x={padL - 7} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill={C.textMuted} fontFamily={FONT_NUM}>{Math.round(max * f / 1000)}k</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * gw;
        const w = gw * 0.3;
        return (
          <g key={d.m}>
            <rect x={x + gw * 0.12} y={y(d.booked)} width={w} height={(height - padT - padB) * (d.booked / max)} rx="3" fill={C.primary} />
            <rect x={x + gw * 0.48} y={y(d.done)} width={w} height={(height - padT - padB) * (d.done / max)} rx="3" fill={C.green} />
            <title>{d.m}: umowione {Math.round(d.booked / 1000)} tys. zl, wykonane {Math.round(d.done / 1000)} tys. zl</title>
            <text x={x + gw / 2} y={height - 9} textAnchor="middle" fontSize="9.5" fill={C.textMuted} fontFamily={FONT_NUM}>{d.m}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function StatKpi({ label, value, unit, delta, hint, color = C.text }: { label: string; value: string | number; unit?: string; delta?: number | null; hint?: string; color?: string }) {
  const up = (delta ?? 0) > 0;
  return (
    <Card style={{ padding: 17 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 7 }}>
        <span style={{ fontFamily: FONT_NUM, fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
        {unit ? <span style={{ fontSize: 13.5, fontWeight: 700, color: C.textMuted }}>{unit}</span> : null}
      </div>
      {delta != null ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11.5, fontWeight: 700, color: up ? C.green : C.roseDark, background: up ? C.greenLight : 'oklch(0.95 0.05 15)', borderRadius: 999, padding: '3px 9px' }}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {up ? '+' : ''}{delta}%
        </div>
      ) : null}
      {hint ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8, lineHeight: 1.45 }}>{hint}</div> : null}
    </Card>
  );
}

export function StatNote({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  const warn = tone === 'warn';
  return (
    <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: warn ? C.amber : C.textMuted, background: warn ? 'oklch(0.96 0.04 75)' : C.bgMuted, borderRadius: 10, padding: '10px 12px', lineHeight: 1.55, marginTop: 12 }}>
      {warn ? <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{children}</span>
    </p>
  );
}

export function StatLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.textMedium, fontWeight: 600 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: item.color }} /> {item.label}
        </span>
      ))}
    </div>
  );
}

export const statSectionHeadingStyle: React.CSSProperties = { fontFamily: FONT_HEAD, fontSize: 21, fontWeight: 700, marginBottom: 4 };
export const statSectionSubStyle: React.CSSProperties = { fontSize: 13, color: C.textMuted, marginBottom: 14, fontFamily: FONT_BODY };
