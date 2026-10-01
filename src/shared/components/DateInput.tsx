import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { C } from '../constants/theme';
import { useI18n } from '../i18n';
import { Calendar } from '../icons';

// Every date a person types, in every form: DD.MM.RRRR, with each dot put in as soon as the day or
// the month is typed (nobody types a dot or a dash), plus a calendar button into the browser's own picker. The
// same component in furli-fronted, furli-customer-portal and furli-admin - a native
// <input type="date"> shows whatever format the *browser's* language dictates (mm/dd/yyyy in an
// English browser), so it isn't used for typing anywhere.
// `value` is an ISO date (YYYY-MM-DD) or '' while nothing valid is typed.

const DIGITS = 8;

/**
 * "24062026" -> "24.06.2026"; any separators the user typed are dropped first. `eager` (while typing)
 * adds a dot as soon as the day or the month is complete ("24" -> "24.", "2406" -> "24.06."), so the
 * person sees it coming instead of trying to type it.
 */
export function maskDate(raw: string, eager = false): string {
  const digits = raw.replace(/\D/g, '').slice(0, DIGITS);
  if (digits.length > 4 || (eager && digits.length === 4)) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  if (digits.length > 2 || (eager && digits.length === 2)) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return digits;
}

export function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/** "24.06.2026" -> "2026-06-24"; null for an incomplete text or a day that doesn't exist (31.02). */
export function displayToIso(text: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// A pasted ISO or year-first date ("2026-06-24") would otherwise be read as day 20, month 26.
function normalizePasted(raw: string): string {
  const m = /^\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})\s*$/.exec(raw);
  return m ? `${m[3].padStart(2, '0')}${m[2].padStart(2, '0')}${m[1]}` : raw;
}

/** Where the cursor goes in the masked text: right after its `digits`-th digit. */
export function caretAfterDigits(masked: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < masked.length; i += 1) {
    if (/\d/.test(masked[i])) {
      seen += 1;
      if (seen === digits) return i + 1;
    }
  }
  return masked.length;
}

type DateError = '' | 'incomplete' | 'invalid' | 'tooEarly' | 'tooLate';

function check(text: string, min?: string, max?: string): { iso: string; error: DateError } {
  const digits = text.replace(/\D/g, '').length;
  if (digits === 0) return { iso: '', error: '' };
  if (digits < DIGITS) return { iso: '', error: 'incomplete' };
  const iso = displayToIso(text);
  if (!iso) return { iso: '', error: 'invalid' };
  if (min && iso < min) return { iso: '', error: 'tooEarly' };
  if (max && iso > max) return { iso: '', error: 'tooLate' };
  return { iso, error: '' };
}

interface DateInputProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  /** Earliest and latest allowed day, ISO. */
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  /** The form's own error for this field (e.g. "Wybierz datę") - only drives the red border. */
  invalid?: boolean;
  onBlur?: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  /** The form's field look; the calendar button sits inside its right edge. */
  inputStyle: CSSProperties;
}

export function DateInput({ id, value, onChange, min, max, required, disabled, invalid, onBlur, ariaLabel, ariaDescribedBy, inputStyle }: DateInputProps) {
  const { t } = useI18n();
  const [text, setText] = useState(() => isoToDisplay(value));
  const [error, setError] = useState<DateError>('');
  const [left, setLeft] = useState(false);
  const textRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // A value set from outside (the picker, a form reset, a prefill) replaces the text - unless it's
  // what the text already says (the text may be half-typed while the value is '').
  useEffect(() => {
    setText((current) => (check(current, min, max).iso === value ? current : isoToDisplay(value)));
    if (value) setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const apply = (nextText: string) => {
    setText(nextText);
    const result = check(nextText, min, max);
    // "incomplete" only once the field was left - not while the digits are still being typed.
    setError(result.error === 'incomplete' && !left ? '' : result.error);
    if (result.iso !== value) onChange(result.iso);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    let raw = normalizePasted(input.value);
    // Keeps the cursor after the same digit when editing in the middle (the dots move around it).
    let digitsBeforeCaret = raw.slice(0, input.selectionStart ?? raw.length).replace(/\D/g, '').length;
    const inputType = (event.nativeEvent as InputEvent | undefined)?.inputType || '';
    const deleting = inputType.startsWith('delete');
    // Backspace/Delete that hit only a dot between digits removes the digit next to it - otherwise
    // the dot would come straight back and deleting would get stuck on it. Right after a trailing
    // dot ("24.") deleting simply drops the dot: deleting masks without the eager dot.
    if (deleting && maskDate(raw).length > raw.length) {
      const digits = raw.replace(/\D/g, '');
      const removeAt = inputType === 'deleteContentForward' ? digitsBeforeCaret : digitsBeforeCaret - 1;
      if (removeAt >= 0 && removeAt < digits.length) {
        raw = digits.slice(0, removeAt) + digits.slice(removeAt + 1);
        if (inputType !== 'deleteContentForward') digitsBeforeCaret -= 1;
      }
    }
    const next = maskDate(raw, !deleting);
    apply(next);
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el || document.activeElement !== el) return;
      let position = caretAfterDigits(next, digitsBeforeCaret);
      // Typing: past a dot that follows the digit, so the next digit lands after it.
      while (!deleting && digitsBeforeCaret > 0 && position < next.length && next[position] === '.') position += 1;
      el.setSelectionRange(position, position);
    });
  };

  const handleBlur = () => {
    setLeft(true);
    // A saved date shown untouched (e.g. an older visit being edited) isn't checked against min/max -
    // only what the person typed is.
    setError(value && text === isoToDisplay(value) ? '' : check(text, min, max).error);
    onBlur?.();
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el || disabled) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // falls through - some browsers refuse showPicker() outside their own idea of a gesture
      }
    }
    el.focus();
    el.click();
  };

  const errorId = id ? `${id}-format` : undefined;
  const message = error
    ? t(`common.dateInput.${error}`, { date: isoToDisplay(error === 'tooEarly' ? min || '' : max || '') })
    : '';
  const describedBy = [ariaDescribedBy, message ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <input
          ref={textRef}
          id={id}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('common.dateInput.placeholder')}
          aria-label={ariaLabel}
          aria-invalid={invalid || !!message || undefined}
          aria-describedby={describedBy}
          required={required}
          disabled={disabled}
          maxLength={10}
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', paddingRight: 42, ...(invalid || message ? { borderColor: C.roseDark } : {}) }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          disabled={disabled}
          aria-label={t('common.dateInput.pickerCta')}
          title={t('common.dateInput.pickerCta')}
          style={{ position: 'absolute', top: 0, right: 4, bottom: 0, width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', color: C.textMuted }}
        >
          <Calendar size={16} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={value}
          min={min}
          max={max}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            if (!event.target.value) return;
            setLeft(true);
            apply(isoToDisplay(event.target.value));
            onBlur?.();
          }}
          // Visually hidden but still interactive - display:none would stop showPicker() from opening it.
          style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      </div>
      {message ? <div id={errorId} role="alert" style={{ fontSize: 11.5, color: C.roseDark, marginTop: 5, lineHeight: 1.4 }}>{message}</div> : null}
    </div>
  );
}
