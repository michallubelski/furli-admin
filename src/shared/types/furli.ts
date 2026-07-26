import type { CSSProperties, ReactNode, SVGProps } from 'react';

// Extracted from furli-fronted's shared/types/furli.ts, which mixed shared/admin/provider types
// in one file - this repo only ever needs the admin-facing closure (ProviderAccount/ProviderProfile
// are here because the admin panel reads/displays a provider's own profile data, not because
// furli-admin has any provider-panel functionality itself).

export type ProviderType = 'veterinarian' | 'groomer' | 'trainer' | 'petsitter' | 'walker';
export type VerificationStatus = 'pending' | 'changes_requested' | 'rejected' | 'approved';
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'canceled';
export type AuthRole = 'ADMIN';

export type IconComponent = (props: SVGProps<SVGSVGElement> & { size?: number }) => JSX.Element;

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  type: ProviderType;
  rating: number;
  reviews: number;
  priceFrom: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  district: string;
  email: string;
  phone: string;
  description: string;
  specialties: string[];
  photo: string;
  gallery: string[];
  services: ServiceItem[];
  localNumber?: string;
  serviceMode?: {
    stationary: boolean;
    mobile: boolean;
  };
  showAddress?: boolean;
  travel?: {
    kind: string;
    fee: string;
    maxKm: string;
  };
}

export interface WorkHoursDay {
  full: string;
  short: string;
  on: boolean;
  open: string;
  close: string;
}

export interface BillingInfo {
  trialStart: number;
  status: BillingStatus;
  planId: string | null;
  paidUntil: number | null;
}

export interface RegistrationConsents {
  terms: boolean;
  mFurli: boolean;
  mPartners: boolean;
}

export type AdminActivityActionCode =
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED'
  | 'SUSPENDED'
  | 'REACTIVATED'
  | 'TRIAL_EXTENDED'
  | 'DISCOUNT_APPLIED';

export interface AdminActivityLogEntry {
  id: string;
  providerId: string;
  providerName: string;
  action: AdminActivityActionCode;
  note: string | null;
  adminEmail: string;
  createdAt: string;
}

export interface AdminAccount {
  id: string;
  email: string;
  role: 'ADMIN';
}

export interface ProviderAccount {
  id: string;
  role?: AuthRole;
  contactName: string;
  email: string;
  phone: string;
  verificationStatus: VerificationStatus;
  seedEmpty: boolean;
  createdAt: string;
  billing: BillingInfo;
  // Admin-facing billing summary computed by the backend (see ProviderAccountResponse) - used by
  // the admin Subskrypcje page.
  billingStatus?: 'trial' | 'active' | 'overdue';
  billingPlan?: 'main' | 'connected';
  monthlyValue?: number;
  trialDaysLeft?: number;
  workHours: WorkHoursDay[];
  profile: ProviderProfile;
  days: string[];
  slots: string[];
  refCode?: string | null;
  consents?: RegistrationConsents;
  // Recent admin decisions for this provider, newest first - backs the admin panel's "Historia
  // decyzji".
  history?: AdminActivityLogEntry[];
  // Independent of verificationStatus - an approved provider can still be suspended.
  suspended?: boolean;
}

export type AdminRouteKey =
  | 'dashboard'
  | 'verification'
  | 'providers'
  | 'subscriptions'
  | 'reviews'
  | 'reports'
  | 'apiIntegrations'
  | 'analytics'
  | 'communication'
  | 'settings'
  | 'admins';

export interface TitleMeta {
  title: string;
  subtitle: string;
}

export interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}
