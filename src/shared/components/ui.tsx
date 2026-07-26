import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Check, Minus, Plus } from '../icons';
import { C, FONT_BODY, FONT_HEAD, FONT_NUM, shadow } from '../constants/theme';
import type { CardProps } from '../types/furli';
import { useI18n } from '../i18n';

export function Card({ children, style, onClick }: CardProps) {
  return (
    <div onClick={onClick} style={{ background: C.bgCard, borderRadius: 18, boxShadow: shadow, border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ Icon, children, right }: { Icon?: React.ComponentType<{ size?: number; color?: string }>; children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      {Icon ? (
        <div style={{ width: 38, height: 38, borderRadius: 12, background: C.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={C.textMedium} />
        </div>
      ) : null}
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 700, color: C.text }}>{children}</div>
      {right ? <div style={{ marginLeft: 'auto' }}>{right}</div> : null}
    </div>
  );
}

export function Ring({ value, size = 46, stroke = 4.5, color = C.green }: { value: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={C.bgMuted} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="53%" textAnchor="middle" fontSize="11" fill={C.text} fontFamily={FONT_BODY} fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

export const inputStyle: CSSProperties = { width: '100%', border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 12, padding: '11px 14px', fontSize: 14, color: C.text, fontFamily: FONT_BODY };
export const labelStyle: CSSProperties = { display: 'block', fontSize: 11.5, fontWeight: 700, color: C.textMedium, marginBottom: 7 };

export function DevNote({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginTop: 12 }}>{children}</p>;
}

export function FloatField({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
  inputMode,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={{ ...inputStyle, opacity: disabled ? 0.7 : 1, borderColor: error ? C.roseDark : inputStyle.borderColor }} value={value} onChange={(e) => onChange(e.target.value)} type={type} disabled={disabled} inputMode={inputMode} />
      {error ? <div style={{ fontSize: 11.5, color: C.roseDark, marginTop: 6, lineHeight: 1.4 }}>{error}</div> : null}
    </div>
  );
}

export interface DecimalPickerConfig {
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// Same range/step/format everywhere weight or temperature is picked (visit records, patient records).
export const WEIGHT_PICKER_CONFIG: DecimalPickerConfig = { unit: 'kg', min: 0.1, max: 120, step: 0.1, defaultValue: 10 };
export const TEMPERATURE_PICKER_CONFIG: DecimalPickerConfig = { unit: '°C', min: 30, max: 43, step: 0.1, defaultValue: 38.5 };

// Mirrors the backend's tolerant parsing (comma or dot decimal, optional unit suffix) so any
// previously stored free-text value (e.g. "11,1 kg") still loads correctly in the picker.
export function parseDecimalValue(raw: string | undefined): number | null {
  if (!raw) return null;
  const sanitized = raw.trim().replace(',', '.').replace(/[^\d.]/g, '');
  if (!sanitized) return null;
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDecimalValue(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

function clampDecimal(value: number, config: DecimalPickerConfig): number {
  const clamped = Math.min(config.max, Math.max(config.min, value));
  return Math.round(clamped * 10) / 10;
}

const stepperButtonStyle: CSSProperties = { width: 30, height: 30, borderRadius: 9, border: 'none', background: C.bgCard, color: C.textMedium, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: shadow };

// Simple, modern "stepper" picker for one-decimal values (weight, temperature): +/- buttons
// nudge by `config.step`, with the current value also directly editable for fast entry. Used
// everywhere weight/temperature is set so the range/step/format stay consistent app-wide.
export function DecimalStepperField({
  label,
  value,
  onChange,
  config,
  disabled,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  config: DecimalPickerConfig;
  disabled?: boolean;
}) {
  const current = parseDecimalValue(value);
  const [draft, setDraft] = useState(current !== null ? formatDecimalValue(current) : '');

  useEffect(() => {
    setDraft(current !== null ? formatDecimalValue(current) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: number) => {
    onChange(`${formatDecimalValue(clampDecimal(next, config))} ${config.unit}`);
  };

  const step = (direction: 1 | -1) => {
    if (current === null) {
      commit(config.defaultValue);
      return;
    }
    commit(current + config.step * direction);
  };

  const commitDraft = () => {
    const parsed = parseDecimalValue(draft);
    if (parsed === null) {
      setDraft(current !== null ? formatDecimalValue(current) : '');
      return;
    }
    commit(parsed);
  };

  return (
    <div>
      {typeof label === 'string' ? <label style={labelStyle}>{label}</label> : label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: 12, padding: '6px 8px', opacity: disabled ? 0.6 : 1 }}>
        <button type="button" aria-label="Zmniejsz" disabled={disabled || (current !== null && current <= config.min)} onClick={() => step(-1)} style={stepperButtonStyle}>
          <Minus size={14} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, minWidth: 0 }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                step(1);
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                step(-1);
              }
            }}
            disabled={disabled}
            inputMode="decimal"
            placeholder="—"
            style={{ width: 46, border: 'none', background: 'transparent', outline: 'none', textAlign: 'right', fontFamily: FONT_NUM, fontSize: 16, fontWeight: 700, color: C.text, padding: 0 }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textMuted, flexShrink: 0 }}>{config.unit}</span>
        </div>
        <button type="button" aria-label="Zwiększ" disabled={disabled || (current !== null && current >= config.max)} onClick={() => step(1)} style={stepperButtonStyle}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

const PRICE_CONFIG = { currency: 'zł', min: 1, max: 100000, step: 1, defaultValue: 100 };

// Mirrors the backend's tolerant parsing of previously free-typed price strings ("150 zł",
// "od 450 zł", "180zl", "99 PLN") so any existing value still loads correctly in the picker.
export function parsePriceValue(raw: string | undefined): { amount: number; from: boolean } | null {
  if (!raw) return null;
  const from = /^\s*od\b/i.test(raw);
  const sanitized = raw
    .replace(/^\s*od\b/i, '')
    .replace(/z[łl]|pln/gi, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  if (!sanitized) return null;
  const parsed = Math.round(Number.parseFloat(sanitized));
  return Number.isFinite(parsed) && parsed > 0 ? { amount: parsed, from } : null;
}

function formatPriceValue(amount: number, from: boolean): string {
  const clamped = Math.min(PRICE_CONFIG.max, Math.max(PRICE_CONFIG.min, Math.round(amount)));
  return `${from ? 'od ' : ''}${clamped} ${PRICE_CONFIG.currency}`;
}

// Dedicated price picker rather than a reuse of DecimalStepperField: prices in this app are
// always whole PLN (no grosze anywhere in the UI - "199 zł", "99 zł", ...), so a forced one-decimal
// format would be wrong here, and a single fixed currency ("zł" - this app has no multi-currency
// support anywhere) belongs next to the number rather than typed. The "cena od" (starting price)
// concept previously relied on the provider typing a literal "od " prefix into free text; it's now
// a separate toggle so the stored string's shape can't be typo'd or left inconsistent.
const compactStepperButtonStyle: CSSProperties = { width: 24, height: 24, borderRadius: 8, border: 'none', background: C.bgCard, color: C.textMedium, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: shadow };

// `compact` is for tight, inline row contexts (e.g. a checklist row that also has a name label
// and an action button competing for the same horizontal space) where the full-size stepper would
// crowd out everything next to it — smaller buttons/input/currency text, and a shortened "Cena od"
// caption (full explanation moves to a `title` tooltip) instead of two lines of wrapped text.
export function PricePickerField({
  label,
  value,
  onChange,
  disabled,
  compact,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const current = parsePriceValue(value);
  const [draft, setDraft] = useState(current !== null ? String(current.amount) : '');
  const from = current?.from ?? false;

  useEffect(() => {
    setDraft(current !== null ? String(current.amount) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (nextAmount: number, nextFrom: boolean) => {
    onChange(formatPriceValue(nextAmount, nextFrom));
  };

  const step = (direction: 1 | -1) => {
    if (current === null) {
      commit(PRICE_CONFIG.defaultValue, from);
      return;
    }
    commit(current.amount + PRICE_CONFIG.step * direction, current.from);
  };

  const commitDraft = () => {
    const parsed = parsePriceValue(draft);
    if (parsed === null) {
      setDraft(current !== null ? String(current.amount) : '');
      return;
    }
    commit(parsed.amount, from);
  };

  const btnStyle = compact ? compactStepperButtonStyle : stepperButtonStyle;
  const iconSize = compact ? 11 : 14;

  return (
    <div>
      {typeof label === 'string' ? <label style={labelStyle}>{label}</label> : label}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 8, border: `1px solid ${C.border}`, background: C.bgInput, borderRadius: compact ? 10 : 12, padding: compact ? '4px 5px' : '6px 8px', opacity: disabled ? 0.6 : 1 }}>
        <button type="button" aria-label="Zmniejsz" disabled={disabled || (current !== null && current.amount <= PRICE_CONFIG.min)} onClick={() => step(-1)} style={btnStyle}>
          <Minus size={iconSize} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3, minWidth: 0 }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                step(1);
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                step(-1);
              }
            }}
            disabled={disabled}
            inputMode="numeric"
            placeholder="—"
            style={{ width: compact ? 38 : 56, border: 'none', background: 'transparent', outline: 'none', textAlign: 'right', fontFamily: FONT_NUM, fontSize: compact ? 13.5 : 16, fontWeight: 700, color: C.text, padding: 0 }}
          />
          <span style={{ fontSize: compact ? 11 : 12.5, fontWeight: 600, color: C.textMuted, flexShrink: 0 }}>{PRICE_CONFIG.currency}</span>
        </div>
        <button type="button" aria-label="Zwiększ" disabled={disabled || (current !== null && current.amount >= PRICE_CONFIG.max)} onClick={() => step(1)} style={btnStyle}>
          <Plus size={iconSize} />
        </button>
      </div>
      <label title={compact ? 'Cena od (widełki cenowe zamiast stałej ceny)' : undefined} style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8, marginTop: compact ? 5 : 9, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
        <input
          type="checkbox"
          checked={from}
          disabled={disabled}
          onChange={(event) => commit(current?.amount ?? PRICE_CONFIG.defaultValue, event.target.checked)}
          style={{ width: compact ? 13 : 16, height: compact ? 13 : 16, accentColor: C.green, cursor: disabled ? 'default' : 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: compact ? 11 : 12, color: C.textMedium, whiteSpace: compact ? 'nowrap' : undefined }}>{compact ? 'Cena od' : 'Cena od (widełki cenowe zamiast stałej ceny)'}</span>
      </label>
    </div>
  );
}

export function WizToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 46, height: 28, borderRadius: 999, border: 'none', background: on ? C.green : C.bgMuted, padding: 3, cursor: 'pointer' }}>
      <span style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
    </button>
  );
}

export function WizCheck({ on, square }: { on: boolean; square?: boolean }) {
  return (
    <div style={{ width: 24, height: 24, borderRadius: square ? 7 : '50%', border: `1.5px solid ${on ? C.green : C.border}`, background: on ? C.green : C.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {on ? <Check size={14} color="#fff" /> : null}
    </div>
  );
}

export function AuthShell({ children, topRight }: { children: ReactNode; topRight?: ReactNode }) {
  const { t } = useI18n();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT_BODY }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap'); @keyframes furliRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <header style={{ padding: '24px 28px 8px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1 }}>
            <span style={{ fontFamily: FONT_HEAD, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>FURLI</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.amber, lineHeight: 1 }}>{t('common.auth.shellLabel')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>{topRight}</div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function useIsMobile(bp = 860): boolean {
  const [mobile, setMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= bp : false));
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= bp);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bp]);
  return mobile;
}
