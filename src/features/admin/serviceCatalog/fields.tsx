import type { CSSProperties, ReactNode } from 'react';
import { inputStyle, labelStyle } from '../../../shared/components/ui';
import { C, FONT_BODY } from '../../../shared/constants/theme';
import { Lock } from '../../../shared/icons';

// Small form pieces of the "Katalog usług" editor - same look as the rest of furli-admin's forms.

export const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 13px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bgCard,
  color: C.textMedium,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONT_BODY,
};

export const primaryButtonStyle: CSSProperties = { ...buttonStyle, border: 'none', background: C.primary, color: '#fff' };
export const dangerButtonStyle: CSSProperties = { ...buttonStyle, color: C.roseDark, border: '1px solid oklch(0.85 0.06 15)' };

export function disabledStyle(style: CSSProperties, disabled: boolean): CSSProperties {
  return disabled ? { ...style, opacity: 0.5, cursor: 'not-allowed' } : style;
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string[]; children: ReactNode }) {
  return (
    // Hint and errors sit outside the <label>, so the field's accessible name is just its label.
    <div>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>{label}</span>
        {children}
      </label>
      {hint ? <span style={{ display: 'block', fontSize: 11.5, color: C.textMuted, marginTop: 5, lineHeight: 1.45 }}>{hint}</span> : null}
      {error?.map((message) => (
        <span key={message} role="alert" style={{ display: 'block', fontSize: 11.5, color: C.roseDark, marginTop: 5, lineHeight: 1.4 }}>{message}</span>
      ))}
    </div>
  );
}

function fieldBorder(invalid: boolean): CSSProperties {
  return invalid ? { borderColor: C.roseDark } : {};
}

export function TextInput({ value, onChange, placeholder, invalid = false, disabled = false, ariaLabel }: { value: string; onChange: (value: string) => void; placeholder?: string; invalid?: boolean; disabled?: boolean; ariaLabel?: string }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      style={{ ...inputStyle, ...fieldBorder(invalid), opacity: disabled ? 0.7 : 1 }}
    />
  );
}

export function TextArea({ value, onChange, invalid = false }: { value: string; onChange: (value: string) => void; invalid?: boolean }) {
  return <textarea value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid} rows={2} style={{ ...inputStyle, ...fieldBorder(invalid), resize: 'vertical', lineHeight: 1.45 }} />;
}

/** A whole number (or empty = not set). */
export function NumberInput({ value, onChange, min, step = 1, invalid = false, placeholder, ariaLabel }: { value: number | null | undefined; onChange: (value: number | null) => void; min?: number; step?: number; invalid?: boolean; placeholder?: string; ariaLabel?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      min={min}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      style={{ ...inputStyle, ...fieldBorder(invalid) }}
    />
  );
}

export function SelectInput<T extends string>({ value, options, onChange, disabled = false, invalid = false, ariaLabel }: { value: T | '' ; options: Array<{ value: T | ''; label: string }>; onChange: (value: T) => void; disabled?: boolean; invalid?: boolean; ariaLabel?: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as T)} disabled={disabled} aria-label={ariaLabel} aria-invalid={invalid} style={{ ...inputStyle, ...fieldBorder(invalid), opacity: disabled ? 0.7 : 1 }}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

export function CheckboxField({ checked, onChange, label, hint, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} style={{ marginTop: 2, accentColor: C.primary }} />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
        {hint ? <span style={{ display: 'block', fontSize: 11.5, color: C.textMuted, marginTop: 2, lineHeight: 1.45 }}>{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * A key, never typed by hand: it is made from the name (and follows it until published), so it
 * always has the backend's format and stays unique at its level. The lock says it can't be typed in;
 * the hint (also its tooltip) says whether it still follows the name or is published.
 */
export function KeyInput({ value, hint, invalid = false, ariaLabel }: { value: string; hint: string; invalid?: boolean; ariaLabel: string }) {
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        value={value}
        readOnly
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        title={hint}
        style={{ ...inputStyle, ...fieldBorder(invalid), fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, paddingRight: 36, background: C.bgMuted, color: C.textMedium, cursor: 'default' }}
      />
      <span aria-hidden="true" title={hint} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, display: 'flex' }}><Lock size={14} /></span>
    </span>
  );
}

export function Pill({ children, tone = 'neutral', title }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'danger' | 'success'; title?: string }) {
  const palette = {
    neutral: { background: C.bgMuted, color: C.textMedium },
    warning: { background: 'oklch(0.95 0.06 75)', color: C.amber },
    danger: { background: 'oklch(0.95 0.04 15)', color: C.roseDark },
    success: { background: C.greenLight, color: C.green },
  }[tone];
  return <span title={title} style={{ ...palette, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</span>;
}
