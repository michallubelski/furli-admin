import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { enUS } from './locales/en-US';
import { plPL } from './locales/pl-PL';
import type { Locale, TranslationLeaf, TranslationNode } from './types';
import { SUPPORTED_LOCALES } from './types';

const STORAGE_KEY = 'furli.locale';

const translations: Record<Locale, TranslationNode> = {
  'pl-PL': plPL,
  'en-US': enUS,
};

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) {
    return null;
  }
  const direct = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === value.toLowerCase());
  if (direct) {
    return direct;
  }
  const language = value.split('-')[0]?.toLowerCase();
  if (language === 'pl') {
    return 'pl-PL';
  }
  if (language === 'en') {
    return 'en-US';
  }
  return null;
}

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'pl-PL';
  }

  const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  if (stored) {
    return stored;
  }

  const browserLocales = [window.navigator.language, ...(window.navigator.languages || [])];
  for (const browserLocale of browserLocales) {
    const resolved = normalizeLocale(browserLocale);
    if (resolved) {
      return resolved;
    }
  }

  return 'pl-PL';
}

function resolveLeaf(node: TranslationNode, key: string): TranslationLeaf | undefined {
  return key.split('.').reduce<TranslationLeaf | TranslationNode | undefined>((current, part) => {
    if (!current || typeof current === 'string') {
      return undefined;
    }
    if ('other' in current || 'one' in current || 'few' in current || 'many' in current || 'zero' in current || 'two' in current) {
      return undefined;
    }
    return current[part];
  }, node) as TranslationLeaf | undefined;
}

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(values[token] ?? ''));
}

function translateLeaf(locale: Locale, leaf: TranslationLeaf | undefined, values?: Record<string, string | number>): string {
  if (!leaf) {
    return '';
  }
  if (typeof leaf === 'string') {
    return interpolate(leaf, values);
  }

  const count = Number(values?.count);
  const category = Number.isFinite(count) ? new Intl.PluralRules(locale).select(count) : 'other';
  const template = leaf[category as keyof typeof leaf] || leaf.other;
  return interpolate(template, values);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Mirrors the active locale outside React state so the plain `apiRequest` fetch wrapper
// (shared/api/client.ts) can send it as `Accept-Language` without needing a hook/context.
let currentLocale: Locale = detectInitialLocale();

export function getCurrentLocale(): Locale {
  return currentLocale;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    currentLocale = locale;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (isSupportedLocale(nextLocale)) {
      setLocaleState(nextLocale);
    }
  }, []);

  const t = useCallback((key: string, values?: Record<string, string | number>) => {
    const leaf = resolveLeaf(translations[locale], key);
    if (leaf) {
      return translateLeaf(locale, leaf, values);
    }

    const fallbackLeaf = resolveLeaf(translations['pl-PL'], key);
    if (fallbackLeaf) {
      return translateLeaf('pl-PL', fallbackLeaf, values);
    }

    return key;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t,
    formatDate: (input, options) => new Intl.DateTimeFormat(locale, options || { day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(input)),
    formatTime: (input, options) => new Intl.DateTimeFormat(locale, options || { hour: '2-digit', minute: '2-digit' }).format(toDate(input)),
    formatDateTime: (input, options) => new Intl.DateTimeFormat(locale, options || { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(toDate(input)),
    formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
    formatCurrency: (input, currency = 'PLN', options) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2, ...options }).format(input),
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
