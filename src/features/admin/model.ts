import type { AdminActivityActionCode, VerificationStatus } from '../../shared/types/furli';
import {
  AlertCircle,
  Check,
  ClipboardList,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  Store,
  TrendingUp,
  User,
} from '../../shared/icons';
import type { IconComponent } from '../../shared/types/furli';
import { C } from '../../shared/constants/theme';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type AdminProviderListFilter = 'all' | 'pending' | 'approved' | 'suspended' | 'rejected';
export type AdminReviewStatus = 'reported' | 'hidden' | 'published';
export type AdminReportStatus = 'open' | 'investigating' | 'resolved';
export type AdminIntegrationStatus = 'pending' | 'active' | 'revoked';

export interface AdminProviderRecord {
  id: string;
  name: string;
  typeLabel: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  contactName: string;
  email: string;
  phone: string;
  verificationStatus: VerificationStatus;
  suspended: boolean;
  submittedAt: string;
  ageDays: number;
  rating: number;
  reviewsCount: number;
  billingStatus: 'trial' | 'active' | 'overdue';
  billingPlan: 'main' | 'connected';
  monthlyValue: number;
  trialDaysLeft?: number;
  // `label` is a stable identifier ('business' | 'profile' | 'services'), not display text -
  // see documentLabel() below for the locale-aware translation, applied at render time.
  documents: Array<{ id: string; label: string; status: 'ok' | 'missing' | 'expiring' }>;
  notes: string[];
}

export function billingLabel(t: Translate, status: AdminProviderRecord['billingStatus'], plan: AdminProviderRecord['billingPlan']): string {
  if (status === 'active') {
    return plan === 'connected' ? t('admin.billing.planConnectedActive') : t('admin.billing.planMainActive');
  }
  if (status === 'overdue') {
    return t('admin.billing.overdue');
  }
  return t('admin.billing.trial');
}

const DOCUMENT_LABEL_KEY: Record<string, string> = {
  business: 'admin.providerDocument.business',
  profile: 'admin.providerDocument.profile',
  services: 'admin.providerDocument.services',
};

export function documentLabel(t: Translate, key: string): string {
  const translationKey = DOCUMENT_LABEL_KEY[key];
  return translationKey ? t(translationKey) : key;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  target: string;
  actor: string;
  timestamp: string;
  color?: string;
}

const ADMIN_ACTIVITY_ACTION_COLOR: Record<AdminActivityActionCode, string> = {
  APPROVED: C.green,
  REJECTED: C.roseDark,
  CHANGES_REQUESTED: C.tealDark,
  SUSPENDED: C.roseDark,
  REACTIVATED: C.green,
  TRIAL_EXTENDED: C.amber,
  DISCOUNT_APPLIED: C.amber,
};

const ADMIN_ACTIVITY_ACTION_KEY: Record<AdminActivityActionCode, string> = {
  APPROVED: 'admin.activityAction.approved',
  REJECTED: 'admin.activityAction.rejected',
  CHANGES_REQUESTED: 'admin.activityAction.changesRequested',
  SUSPENDED: 'admin.activityAction.suspended',
  REACTIVATED: 'admin.activityAction.reactivated',
  TRIAL_EXTENDED: 'admin.activityAction.trialExtended',
  DISCOUNT_APPLIED: 'admin.activityAction.discountApplied',
};

export function activityActionLabel(t: Translate, action: AdminActivityActionCode | string): string {
  const key = ADMIN_ACTIVITY_ACTION_KEY[action as AdminActivityActionCode];
  return key ? t(key) : action;
}

export function activityActionColor(action: AdminActivityActionCode | string): string {
  return ADMIN_ACTIVITY_ACTION_COLOR[action as AdminActivityActionCode] ?? C.amber;
}

export interface AdminReviewRecord {
  id: string;
  providerName: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  reason: string;
  status: AdminReviewStatus;
  // A review can carry a second, independent rating dimension for the staff member who handled the
  // visit (not every review has one - a facility with no team, or a review left before staff
  // attribution existed, has none). Hiding the review removes both dimensions at once; there's no
  // way to hide just the staff half.
  staffName?: string;
  staffRating?: number;
  staffText?: string;
  staffReply?: string;
}

export interface AdminReportRecord {
  id: string;
  type: string;
  subject: string;
  providerName: string;
  reporter: string;
  detail: string;
  openedAt: string;
  status: AdminReportStatus;
  priority: 'Niska' | 'Średnia' | 'Wysoka';
}

export type AdminIntegrationEnv = 'production' | 'sandbox';

export interface AdminIntegrationRecord {
  id: string;
  providerName: string;
  systemName: string;
  clientId: string;
  env: AdminIntegrationEnv;
  scope: string;
  status: AdminIntegrationStatus;
  lastEvent: string;
  webhookOk: boolean;
}

export interface AdminBroadcastRecord {
  id: string;
  title: string;
  audience: string;
  channel: string;
  sentAt: string;
}

export interface AdminReferralCode {
  id: string;
  code: string;
  discountLabel: string;
  uses: number;
  maxUses: number;
  active: boolean;
}

export interface AdminFeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface AdminPlanConfig {
  id: string;
  name: string;
  price: string;
  description: string;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  lastSeen: string;
  presenceLabel?: string;
}

export interface AdminGdprRequest {
  id: string;
  type: string;
  subject: string;
  openedAt: string;
}

export const adminActionButtonStyle = {
  primary: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: C.text,
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  subtle: {
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    color: C.textMedium,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  success: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: C.green,
    color: '#fff',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  warning: {
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${C.tealDark}`,
    background: C.tealLight,
    color: C.tealDark,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  danger: {
    padding: '10px 14px',
    borderRadius: 10,
    border: 'none',
    background: 'oklch(0.95 0.04 15)',
    color: C.roseDark,
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
} as const;

const ADMIN_STATUS_STYLE: Record<VerificationStatus, { key: string; color: string; bg: string; Icon: IconComponent }> = {
  pending: { key: 'admin.status.pending', color: C.amber, bg: C.primaryLight, Icon: Clock },
  changes_requested: { key: 'admin.status.changesRequested', color: C.tealDark, bg: C.tealLight, Icon: RefreshCw },
  approved: { key: 'admin.status.approved', color: C.green, bg: C.greenLight, Icon: Check },
  rejected: { key: 'admin.status.rejected', color: C.roseDark, bg: 'oklch(0.95 0.04 15)', Icon: AlertCircle },
};

export function adminStatusMeta(t: Translate, status: VerificationStatus): { label: string; color: string; bg: string; Icon: IconComponent } {
  const style = ADMIN_STATUS_STYLE[status];
  return { label: t(style.key), color: style.color, bg: style.bg, Icon: style.Icon };
}

const PROVIDER_TYPE_KEY: Record<string, string> = {
  Weterynarz: 'admin.providerType.veterinarian',
  Groomer: 'admin.providerType.groomer',
  Trener: 'admin.providerType.trainer',
  Petsitter: 'admin.providerType.petsitter',
  'Dog walker': 'admin.providerType.walker',
};

// `typeLabel` on AdminProviderRecord is a stable identifier derived once from the backend's
// ProviderType enum (see admin/api.ts's typeLabel()), not itself locale-aware — this maps that
// stable identifier to the localized display string. Comparisons/filters (e.g. VerificationPage's
// type filter) keep matching against the stable identifier; only rendering goes through this.
export function providerTypeLabel(t: Translate, typeLabel: string): string {
  const key = PROVIDER_TYPE_KEY[typeLabel];
  return key ? t(key) : typeLabel;
}

export const ADMIN_INFO_TILES: Array<{ label: string; Icon: IconComponent }> = [
  { label: 'Kontakt', Icon: User },
  { label: 'Adres', Icon: MapPin },
  { label: 'Telefon', Icon: Phone },
  { label: 'E-mail', Icon: Mail },
  { label: 'Dokumenty', Icon: FileText },
  { label: 'Dostęp API', Icon: Link2 },
];

export const ADMIN_KPI_ICONS = {
  pending: Clock,
  providers: Store,
  growth: TrendingUp,
  revenue: CreditCard,
  moderation: Eye,
  reports: ClipboardList,
  communication: Send,
};
