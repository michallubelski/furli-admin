import { Link } from 'react-router-dom';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight, Footprints, GraduationCap, PawPrint, Scissors, Search, Stethoscope, Store } from '../../../shared/icons';
import { Card, SectionTitle, inputStyle } from '../../../shared/components/ui';
import { C, FONT_HEAD, FONT_NUM } from '../../../shared/constants/theme';
import { useI18n } from '../../../shared/i18n';
import { adminStatusMeta, billingPhaseMeta, providerTypeLabel } from '../model';
import type { AdminProviderRecord } from '../model';

export function AdminBadge({ label, color, background }: { label: string; color: string; background: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '6px 10px', background, color, fontSize: 11.5, fontWeight: 700 }}>{label}</span>;
}

export function ProviderStatusBadge({ provider }: { provider: AdminProviderRecord }) {
  const { t } = useI18n();
  if (provider.suspended) {
    return <AdminBadge label={t('admin.status.suspended')} color={C.roseDark} background="oklch(0.95 0.04 15)" />;
  }
  const meta = adminStatusMeta(t, provider.verificationStatus);
  return <AdminBadge label={meta.label} color={meta.color} background={meta.bg} />;
}

export function BillingBadge({ provider }: { provider: AdminProviderRecord }) {
  const { t } = useI18n();
  const meta = billingPhaseMeta(t, provider);
  return <AdminBadge label={meta.label} color={meta.color} background={meta.bg} />;
}

export function KpiCard({
  icon,
  label,
  value,
  accent = C.primaryLight,
  iconColor = C.amber,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: string;
  iconColor?: string;
}) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: accent, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontFamily: FONT_NUM, fontSize: 30, fontWeight: 700, color: C.text }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12.5, color: C.textSecondary, fontWeight: 600 }}>{label}</div>
    </Card>
  );
}

export function ScreenCard({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <Card style={{ padding: 22 }}>
      <SectionTitle right={right}>{title}</SectionTitle>
      {children}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card style={{ padding: 28, textAlign: 'center' }}>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 22, fontWeight: 600, color: C.text }}>{title}</div>
      <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.6, color: C.textMuted }}>{description}</div>
    </Card>
  );
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>{children}</div>;
}

export function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${active ? C.primary : C.border}`, background: active ? C.primary : C.bgCard, color: active ? '#fff' : C.textMedium, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {label}
      {count !== undefined ? (
        <span style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: '1px 7px', background: active ? 'oklch(1 0 0/.25)' : C.bgMuted, color: active ? '#fff' : C.textMuted, fontFamily: FONT_NUM }}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function ListRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>{children}</div>;
}

export function DetailLabel({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: C.text }}>{value}</div>
    </div>
  );
}

export function ProviderNameBlock({ provider }: { provider: AdminProviderRecord }) {
  const { t } = useI18n();
  return (
    <div>
      <div style={{ fontWeight: 700 }}>{provider.name}</div>
      <div style={{ fontSize: 12, color: C.textMuted }}>{providerTypeLabel(t, provider.typeLabel)} · {provider.city}</div>
    </div>
  );
}

export function ProviderLink({ provider }: { provider: AdminProviderRecord }) {
  return (
    <Link to={`/providers?providerId=${provider.id}`} style={{ color: C.text, textDecoration: 'none' }}>
      <ProviderNameBlock provider={provider} />
    </Link>
  );
}

function providerTypeIcon(typeLabel: string) {
  switch (typeLabel) {
    case 'Weterynarz':
      return Stethoscope;
    case 'Groomer':
      return Scissors;
    case 'Trener':
      return GraduationCap;
    case 'Petsitter':
      return PawPrint;
    case 'Dog walker':
      return Footprints;
    default:
      return Store;
  }
}

export function AdminAvatar({ provider, size = 44 }: { provider: Pick<AdminProviderRecord, 'name' | 'typeLabel'>; size?: number }) {
  const TypeIcon = providerTypeIcon(provider.typeLabel);
  const initials = provider.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.primaryLight, color: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT_NUM, fontWeight: 700, fontSize: size * 0.34, position: 'relative' }}>
      {initials}
      <span style={{ position: 'absolute', bottom: -3, right: -3, width: size * 0.42, height: size * 0.42, borderRadius: '50%', background: C.bgCard, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tealDark }}>
        <TypeIcon size={size * 0.24} />
      </span>
    </div>
  );
}

export function AdminDevNote({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 18, padding: '12px 16px', border: `1px dashed ${C.primary}`, borderRadius: 12, background: 'oklch(0.97 0.02 75 / 0.4)', fontSize: 12, color: C.textSecondary, lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

export function AdminLinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} style={{ padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgCard, color: C.textMedium, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </Link>
  );
}

export function SectionLinkButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} style={{ fontSize: 12.5, fontWeight: 700, color: C.amber, background: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {label}
      <ChevronRight size={14} />
    </Link>
  );
}

export const inlineButtonStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.bgCard,
  color: C.textMedium,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const subtleSmallButtonStyle: CSSProperties = {
  padding: '7px 13px',
  borderRadius: 10,
  border: 'none',
  background: C.text,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export const searchInputWrapStyle: CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 220,
};

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div style={searchInputWrapStyle}>
      <Search size={16} color={C.textMuted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, background: C.bgCard, paddingLeft: 36 }} />
    </div>
  );
}
