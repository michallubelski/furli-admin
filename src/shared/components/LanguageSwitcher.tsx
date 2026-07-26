import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n/types';
import { SUPPORTED_LOCALES } from '../i18n/types';
import { C, FONT_BODY } from '../constants/theme';
import { Check, ChevronDown, Globe } from '../icons';

const SHORT_LABEL: Record<Locale, string> = {
  'pl-PL': 'PL',
  'en-US': 'EN',
};

function localeNameKey(locale: Locale): string {
  return `common.locale.${locale.replace('-', '')}`;
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    setOpen(false);
    triggerRef.current?.focus();
  }, [setLocale]);

  const switcherLabel = t('common.locale.switcherLabel');

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={switcherLabel}
        onClick={() => setOpen((current) => !current)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${C.border}`,
          background: C.bgCard,
          color: C.textMedium,
          borderRadius: 999,
          padding: compact ? '6px 10px' : '8px 13px',
          fontSize: compact ? 12 : 12.5,
          fontWeight: 600,
          fontFamily: FONT_BODY,
          cursor: 'pointer',
        }}
      >
        <Globe size={14} />
        {!compact ? <span>{switcherLabel}</span> : null}
        <span style={{ color: C.text }}>{SHORT_LABEL[locale]}</span>
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={switcherLabel}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 152,
            zIndex: 40,
            background: C.bgCard,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            padding: 6,
          }}
        >
          {SUPPORTED_LOCALES.map((option) => {
            const selected = option === locale;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectLocale(option)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  width: '100%',
                  border: 'none',
                  background: selected ? C.bgMuted : 'transparent',
                  color: C.text,
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT_BODY,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{t(localeNameKey(option))}</span>
                {selected ? <Check size={14} color={C.primary} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
